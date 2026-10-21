#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  reviewSpecialtyRubric,
  SPECIALTY_RUBRIC_REVIEW_VERSION,
  SUPPORTED_ORIGINAL_GRADER_SHA256,
} from "./lib/specialtyRubricReview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_FILE = 2 * 1024 * 1024;
const MAX_TOTAL = 16 * 1024 * 1024;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const slug = (value) =>
  typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,100}$/.test(value);

export function parseRubricReviewOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index];
    assert(
      ["--run", "--output"].includes(name),
      `Unknown review option: ${name}`,
    );
    const key = name.slice(2);
    assert(!Object.hasOwn(options, key), `Repeated review option: ${name}`);
    const value = argv[++index];
    assert(
      typeof value === "string" && value.trim() && !value.startsWith("--"),
      `Missing review option: ${name}`,
    );
    options[key] = path.resolve(value);
  }
  assert(
    options.run,
    "--run is required; only existing frozen evidence is reviewed",
  );
  return options;
}

function safeDirectory(directory) {
  const target = path.resolve(directory);
  let current = path.parse(target).root;
  for (const segment of target
    .slice(current.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    assert(
      stat.isDirectory() && !stat.isSymbolicLink(),
      "Unsafe evidence directory",
    );
  }
  assert(
    path.resolve(fs.realpathSync(target)).toLowerCase() ===
      target.toLowerCase(),
    "Evidence directory escapes declared location",
  );
  return target;
}

function boundedReader(directory) {
  const base = safeDirectory(directory);
  let total = 0;
  const read = (relative) => {
    assert(
      typeof relative === "string" &&
        relative.length < 500 &&
        relative
          .split("/")
          .every(
            (part) =>
              /^[a-zA-Z0-9_.-]+$/.test(part) && ![".", ".."].includes(part),
          ),
      "Unsafe evidence path",
    );
    const target = path.join(base, ...relative.split("/"));
    safeDirectory(path.dirname(target));
    const before = fs.lstatSync(target);
    assert(
      before.isFile() && !before.isSymbolicLink() && before.size <= MAX_FILE,
      "Unsafe or oversized evidence file",
    );
    total += before.size;
    assert(total <= MAX_TOTAL, "Evidence exceeds read budget");
    const fd = fs.openSync(
      target,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    try {
      const opened = fs.fstatSync(fd);
      assert(
        opened.isFile() &&
          opened.dev === before.dev &&
          opened.ino === before.ino &&
          opened.size === before.size,
        "Evidence file changed before read",
      );
      const bytes = Buffer.alloc(opened.size + 1);
      let length = 0;
      while (length < bytes.length) {
        const next = fs.readSync(
          fd,
          bytes,
          length,
          bytes.length - length,
          null,
        );
        if (!next) break;
        length += next;
      }
      const after = fs.fstatSync(fd);
      assert(
        length === opened.size &&
          after.size === opened.size &&
          after.mtimeMs === opened.mtimeMs,
        "Evidence file changed during read",
      );
      return bytes.subarray(0, length);
    } finally {
      fs.closeSync(fd);
    }
  };
  return {
    read,
    parse: (relative) => JSON.parse(read(relative).toString("utf8")),
  };
}

/** Read existing report data and create one derivative file. No original evidence is written. */
export function runSpecialtyRubricReview(argv, dependencies = {}) {
  const options = parseRubricReviewOptions(argv);
  const evidenceRoot = safeDirectory(
    dependencies.evidenceRoot ?? path.join(root, ".helen", "audit-results"),
  );
  assert(
    path.dirname(options.run) === evidenceRoot,
    "Review input must be an immediate run directory under .helen/audit-results",
  );
  const output =
    options.output ??
    path.join(
      evidenceRoot,
      `rubric-review-v${SPECIALTY_RUBRIC_REVIEW_VERSION}-${randomUUID()}.json`,
    );
  assert(
    path.dirname(output) === evidenceRoot &&
      path.extname(output) === ".json" &&
      output !== options.run,
    "Derivative output must be a new JSON file beside the original run",
  );
  assert(
    !fs.existsSync(output),
    "Derivative output exists; original evidence is never overwritten",
  );
  const files = boundedReader(options.run);
  const manifestBytes = files.read("manifest.json");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const reportBytes = files.read("results.json");
  const report = JSON.parse(reportBytes.toString("utf8"));
  assert(
    manifest.kind === "frozen-specialty-answer-pilot" &&
      manifest.version === 1 &&
      manifest.live === true &&
      report.kind === manifest.kind &&
      report.version === 1,
    "Unsupported original report",
  );
  const { fingerprint, ...unsigned } = manifest;
  assert(
    digest(fingerprint) &&
      hash(json(unsigned)) === fingerprint &&
      report.fingerprint === fingerprint,
    "Original manifest/report fingerprint mismatch",
  );
  assert(
    manifest.snapshots?.grader?.source ===
      "scripts/lib/specialtyEvalCases.mjs" &&
      manifest.snapshots.grader.sha256 === SUPPORTED_ORIGINAL_GRADER_SHA256,
    "Unsupported original grader; no rubric extrapolation",
  );
  const graderBytes = files.read("frozen/scripts/lib/specialtyEvalCases.mjs");
  const graderSnapshot = manifest.snapshots[manifest.snapshots.grader.source];
  assert(
    graderSnapshot?.sha256 === hash(graderBytes) &&
      graderSnapshot.bytes === graderBytes.length,
    "Frozen grader module hash mismatch",
  );
  // Serialized selected cases are parsed as JSON; frozen JavaScript is only hashed.
  const casesBytes = files.read("frozen/selected-cases.json");
  const casePayload = casesBytes.toString("utf8");
  assert(
    casePayload.endsWith("\n") &&
      hash(casePayload.slice(0, -1)) ===
        manifest.snapshots.selectedCases?.sha256 &&
      Buffer.byteLength(casePayload.slice(0, -1)) ===
        manifest.snapshots.selectedCases.bytes,
    "Frozen selected case hash mismatch",
  );
  const specs = JSON.parse(casePayload);
  assert(
    Array.isArray(specs) &&
      specs.length > 0 &&
      specs.length <= 6 &&
      specs.every((spec) => slug(spec?.id)) &&
      new Set(specs.map((spec) => spec.id)).size === specs.length,
    "Invalid selected cases",
  );
  assert(
    Array.isArray(manifest.schedule) &&
      manifest.schedule.length <= 200 &&
      Array.isArray(report.observations) &&
      report.observations.length <= 200,
    "Invalid bounded observation schedule",
  );
  const reviews = [];
  const seen = new Set();
  for (const observation of report.observations) {
    assert(
      ["codex", "claude"].includes(observation?.provider) &&
        slug(observation.case) &&
        Number.isSafeInteger(observation.trial) &&
        observation.trial >= 1 &&
        observation.trial <= 20 &&
        ["baseline", "skill-text-injection"].includes(observation.condition),
      "Invalid original observation identity",
    );
    const identity = {
      provider: observation.provider,
      case: observation.case,
      trial: observation.trial,
      condition: observation.condition,
    };
    assert(
      manifest.schedule.some((item) => same(item, identity)),
      "Observation was not in frozen schedule",
    );
    const attempt = `${identity.provider}-${identity.case}-${identity.trial}-${identity.condition}`;
    assert(!seen.has(attempt), "Duplicate original observation");
    seen.add(attempt);
    const spec = specs.find((candidate) => candidate.id === identity.case);
    assert(spec, "Observation has no frozen case");
    const relative = `attempts/${attempt}`;
    assert(
      observation.trace === relative,
      "Original observation trace mismatch",
    );
    const observationBytes = files.read(`${relative}/observation.json`);
    assert(
      same(JSON.parse(observationBytes.toString("utf8")), observation),
      "Original observation/report mismatch",
    );
    let answerBytes = null;
    let answer = null;
    try {
      answerBytes = files.read(`${relative}/answer.json`);
      answer = JSON.parse(answerBytes.toString("utf8"));
    } catch (error) {
      if (error.code !== "ENOENT" || observation.eligible) throw error;
    }
    reviews.push({
      ...identity,
      ...reviewSpecialtyRubric({ spec, result: answer, observation }),
      provenance: {
        attempt: relative,
        answerSha256: answerBytes ? hash(answerBytes) : null,
        observationSha256: hash(observationBytes),
        originalGradeSha256: hash(JSON.stringify(observation.grade)),
        originalGradeHashEncoding: "JSON.stringify(original observation.grade)",
        originalCaseSha256: hash(JSON.stringify(spec)),
      },
    });
  }
  const reviewerFiles = [
    "scripts/lib/specialtyRubricReview.mjs",
    "scripts/review-specialty-rubric.mjs",
  ];
  const reviewerReader = boundedReader(root);
  const result = {
    kind: "supplemental-specialty-rubric-review",
    version: SPECIALTY_RUBRIC_REVIEW_VERSION,
    createdAt: new Date().toISOString(),
    source: {
      run: options.run,
      manifestSha256: hash(manifestBytes),
      resultsSha256: hash(reportBytes),
      originalFingerprint: fingerprint,
      originalRunnerVersion: manifest.version,
      originalGraderSha256: manifest.snapshots.grader.sha256,
      originalGraderDigestSource:
        "Original manifest declaration; frozen module byte integrity checked, source never executed",
      originalGraderModuleSha256: hash(graderBytes),
      selectedCasesSha256: hash(casesBytes),
    },
    reviewer: Object.fromEntries(
      reviewerFiles.map((file) => [
        file,
        { sha256: hash(reviewerReader.read(file)) },
      ]),
    ),
    mode: "report-only",
    acceptanceChanged: false,
    originalEvidenceWritten: false,
    modelCalls: 0,
    graderExecutions: 0,
    comparisonClaimsAuthorized: false,
    reviews,
    needsReview: reviews.filter(
      (review) => review.reviewStatus === "needs-review",
    ).length,
    limitation:
      "Post hoc candidate detection only. A caller cannot convert this derivative into outcome acceptance or revised efficacy claims. Original v1 grades remain authoritative for the frozen run; human review may inform a separately versioned future rubric.",
    output,
  };
  fs.writeFileSync(output, json(result), { flag: "wx" });
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const result = runSpecialtyRubricReview(process.argv.slice(2));
    console.log(
      json({
        output: result.output,
        needsReview: result.needsReview,
        observations: result.reviews.length,
        modelCalls: 0,
        acceptanceChanged: false,
      }),
    );
  } catch (error) {
    console.error(error.message ?? String(error));
    process.exitCode = 1;
  }
}
