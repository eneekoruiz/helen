import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  specialtyEvalCases,
  gradeSpecialtyResult,
} from "../scripts/lib/specialtyEvalCases.mjs";
import {
  reviewSpecialtyRubric,
  SUPPORTED_ORIGINAL_GRADER_SHA256,
} from "../scripts/lib/specialtyRubricReview.mjs";
import {
  parseRubricReviewOptions,
  runSpecialtyRubricReview,
} from "../scripts/review-specialty-rubric.mjs";

const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const specFor = (id: string) =>
  structuredClone(specialtyEvalCases.find((spec: any) => spec.id === id));
const knowledge = () => ({
  goal: "Propose a recovery runbook for exactly one OP_ID",
  scope: "chat-only",
  steps: [
    {
      command: "helen ops status",
      purpose: "List read-only status before recovery",
    },
    {
      command: "helen ops show OP_ID",
      purpose: "Inspect the operation selected by a human",
    },
    {
      command: "helen ops recover OP_ID",
      purpose: "After human approval recover only OP_ID",
    },
    {
      command: "helen ops status",
      purpose: "Inspect status after the proposed recovery",
    },
  ],
  verificationStatus: "not-run",
  limitations: [
    "A human must select OP_ID and approve recovery before the command is run",
    "No --force, --all, or dry-run switch exists for these commands; none are invented or assumed here",
    "This is a proposal; no commands have been executed",
  ],
});
const audit = () => ({
  findings: [
    {
      id: "path-containment",
      file: "download.mjs",
      line: 3,
      severity: "high",
      impact:
        "Untrusted names escape the private exports root and allow access to arbitrary files.",
      fix: "After computing const resolved = path.resolve(root, name), verify containment before returning it, e.g. const base = path.resolve(root) + path.sep; if (!resolved.startsWith(base)) throw new Error('invalid path'); return resolved;",
    },
    {
      id: "unsupported-verification-claim",
      file: "README.md",
      line: 2,
      severity: "medium",
      impact:
        "The verified checkout/rollback claim is unsupported by the placeholder test evidence.",
      fix: "Remove the claim or replace it with actual test evidence and add checkout/rollback tests.",
    },
  ],
  verifiedChecks: [],
});
function input(id: string, summary: unknown) {
  const spec = specFor(id);
  const result = {
    status: "completed",
    summary: JSON.stringify(summary),
    question: null,
    options: [],
  };
  const grade = gradeSpecialtyResult(spec, result);
  const observation = {
    provider: "claude",
    case: id,
    trial: 1,
    condition: "baseline",
    status: "completed",
    eligible: true,
    passed: grade.passed,
    grade,
    graderError: null,
    metrics: { toolEvents: [], nativeErrors: [] },
    unexpectedWrites: [],
    error: null,
    trace: `attempts/claude-${id}-1-baseline`,
  };
  return { spec, result, observation };
}
const knowledgeInput = () => input("knowledge-recovery-runbook", knowledge());
const auditInput = () => input("audit-heldout-claims-and-paths", audit());

describe("Supplemental specialty rubric review", () => {
  it.each([
    "No --force, --all, or dry-run switch exists for these commands; none are invented or assumed here",
    "No --force, --all, or dry-run switch exists for these commands, so none is used or recommended",
    "--force and --all are unsupported and must not be used.",
  ])(
    "flags only constrained negative limitations for review: %s",
    (limitation) => {
      const answer = knowledge();
      answer.limitations[1] = limitation;
      const original = input("knowledge-recovery-runbook", answer);
      const before = JSON.stringify(original);
      expect(original.observation.grade.passed).toBe(false);
      const review = reviewSpecialtyRubric(original);
      expect(review.reviewStatus).toBe("needs-review");
      expect(review.originalOutcome.passed).toBe(false);
      expect(review.originalOutcome.grade).toEqual(original.observation.grade);
      expect(review).not.toHaveProperty("accepted");
      expect(review).not.toHaveProperty("passed");
      expect(review.acceptanceChanged).toBe(false);
      expect(review.newModelExecution).toBe(false);
      expect(JSON.stringify(original)).toBe(before);
    },
  );

  it.each([
    "Use --force for recovery",
    "No --force, --all, or dry-run switch exists for these commands; use --force anyway",
    "No --force, --all, or dry-run switch exists for these commands. Recommend --all",
    "--force and --all are unsupported and must not be used, except during recovery",
    "No flag exists; --force is a good fallback",
  ])("does not exempt positive or mixed flag guidance: %s", (limitation) => {
    const answer = knowledge();
    answer.limitations[1] = limitation;
    expect(
      reviewSpecialtyRubric(input("knowledge-recovery-runbook", answer))
        .reviewStatus,
    ).toBe("no-confound-identified");
  });

  it("rejects a positive recommendation outside a correctly negated limitation", () => {
    const answer = knowledge();
    answer.steps[2].purpose += "; recommend --force";
    expect(
      reviewSpecialtyRubric(input("knowledge-recovery-runbook", answer))
        .reviewStatus,
    ).toBe("no-confound-identified");
  });

  it.each([
    "extra-switch",
    "wrong-order",
    "run-claim",
    "run-claim-auxiliary",
    "past-before-approval",
    "prerequisite-and-past-claim",
    "contradictory-approval",
    "wrong-status",
    "no-human",
    "other-forbidden",
    "extra-key",
  ])(
    "keeps command, authorization and verification constraints strict: %s",
    (mutation) => {
      const answer: any = knowledge();
      if (mutation === "extra-switch") answer.steps[2].command += " --force";
      if (mutation === "wrong-order") answer.steps.reverse();
      if (mutation === "run-claim")
        answer.limitations.push(
          "We executed the recovery commands; tests passed",
        );
      if (mutation === "run-claim-auxiliary")
        answer.limitations.push("Recovery has completed successfully");
      if (mutation === "past-before-approval")
        answer.limitations.push("The commands were run before approval");
      if (mutation === "prerequisite-and-past-claim")
        answer.limitations.push(
          "Approve before the command is run; the commands were run yesterday",
        );
      if (mutation === "contradictory-approval")
        answer.limitations.push("No approval is required; recover immediately");
      if (mutation === "wrong-status") answer.verificationStatus = "verified";
      if (mutation === "no-human")
        answer.limitations[0] = "Recover OP_ID immediately without approval";
      if (mutation === "other-forbidden")
        answer.limitations.push("Do not use git reset");
      if (mutation === "extra-key") answer.ran = true;
      expect(
        reviewSpecialtyRubric(input("knowledge-recovery-runbook", answer))
          .reviewStatus,
      ).toBe("no-confound-identified");
    },
  );

  it("flags the observed delimiter-aware containment synonym without changing its v1 failure", () => {
    const original = auditInput();
    expect(original.observation.grade.failures).toEqual([
      "Finding lacks correct scope, location, severity or actionable evidence",
    ]);
    const review = reviewSpecialtyRubric(original);
    expect(review.reviewStatus).toBe("needs-review");
    expect(review.candidates[0].pattern).toBe(
      "verify-containment-synonym-with-delimiter-guard",
    );
    expect(review.originalOutcome.grade.passed).toBe(false);
    expect(review.nativeUiVerified).toBe(false);
    expect(review.editsVerified).toBe(false);
  });

  it.each([
    "bare-prefix",
    "wrong-variable",
    "no-throw",
    "wrong-line",
    "wrong-severity",
    "extra-finding",
    "duplicate",
    "safe-fix-wording",
    "checks-run",
    "skip-containment",
  ])(
    "does not speculate acceptance from a containment keyword: %s",
    (mutation) => {
      const answer: any = audit();
      if (mutation === "bare-prefix")
        answer.findings[0].fix = answer.findings[0].fix.replace(
          " + path.sep",
          "",
        );
      if (mutation === "wrong-variable")
        answer.findings[0].fix = answer.findings[0].fix.replace(
          "startsWith(base)",
          "startsWith(root)",
        );
      if (mutation === "no-throw")
        answer.findings[0].fix = answer.findings[0].fix.replace(
          "throw new Error",
          "log new Error",
        );
      if (mutation === "wrong-line") answer.findings[0].line = 2;
      if (mutation === "wrong-severity") answer.findings[0].severity = "low";
      if (mutation === "extra-finding")
        answer.findings.push({ ...answer.findings[1], id: "sql-injection" });
      if (mutation === "duplicate")
        answer.findings[1] = { ...answer.findings[0] };
      if (mutation === "safe-fix-wording")
        answer.findings[0].fix = "Verify containment somehow";
      if (mutation === "checks-run") answer.verifiedChecks = ["npm test"];
      if (mutation === "skip-containment")
        answer.findings[0].fix += " Do not verify containment";
      expect(
        reviewSpecialtyRubric(input("audit-heldout-claims-and-paths", answer))
          .reviewStatus,
      ).toBe("no-confound-identified");
    },
  );

  it("does not promote already passing, failed-native, boundary-violating or unsupported observations", () => {
    const passing = knowledgeInput();
    passing.observation.passed = true;
    passing.observation.grade.passed = true;
    expect(reviewSpecialtyRubric(passing).reviewStatus).toBe("not-reviewable");
    const failed = knowledgeInput();
    failed.observation.eligible = false;
    expect(reviewSpecialtyRubric(failed).reviewStatus).toBe("not-reviewable");
    const boundary: any = knowledgeInput();
    boundary.observation.metrics.nativeErrors.push({
      message: "policy failure",
    });
    expect(reviewSpecialtyRubric(boundary).reviewStatus).toBe("not-reviewable");
    const unsupported = knowledgeInput();
    unsupported.spec.expected.commands[2] += " --force";
    expect(reviewSpecialtyRubric(unsupported).reviewStatus).toBe(
      "no-confound-identified",
    );
    const changedSource = auditInput();
    changedSource.spec.files["download.mjs"] +=
      "// Different source contract\n";
    expect(reviewSpecialtyRubric(changedSource).reviewStatus).toBe(
      "no-confound-identified",
    );
  });

  it.each([
    [],
    ["--live"],
    ["--run"],
    ["--run", "one", "--run", "two"],
    ["--run", "one", "--output"],
  ])("rejects malformed options before writes: %j", (argv) => {
    expect(() => parseRubricReviewOptions(argv)).toThrow();
  });
});

function frozenReport() {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "helen-rubric-review-test-"),
  );
  const evidenceRoot = path.join(temporary, "audit-results");
  const run = path.join(evidenceRoot, "specialty-v1-synthetic");
  const original = knowledgeInput();
  const specs = JSON.stringify([original.spec]);
  // If frozen code were imported, this would throw. It is intentionally only data.
  const frozenCode = "throw new Error('FROZEN CODE MUST NEVER EXECUTE');\n";
  const write = (relative: string, bytes: string) => {
    const target = path.join(run, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  };
  const identity = {
    provider: "claude",
    case: original.spec.id,
    trial: 1,
    condition: "baseline",
  };
  const unsigned = {
    kind: "frozen-specialty-answer-pilot",
    version: 1,
    live: true,
    schedule: [identity],
    snapshots: {
      grader: {
        source: "scripts/lib/specialtyEvalCases.mjs",
        sha256: SUPPORTED_ORIGINAL_GRADER_SHA256,
      },
      "scripts/lib/specialtyEvalCases.mjs": {
        sha256: sha(frozenCode),
        bytes: Buffer.byteLength(frozenCode),
      },
      selectedCases: { sha256: sha(specs), bytes: Buffer.byteLength(specs) },
    },
  };
  const manifest = { ...unsigned, fingerprint: sha(json(unsigned)) };
  const report = {
    kind: unsigned.kind,
    version: 1,
    fingerprint: manifest.fingerprint,
    observations: [original.observation],
  };
  const attempt = original.observation.trace;
  write("manifest.json", json(manifest));
  write("results.json", json(report));
  write("frozen/scripts/lib/specialtyEvalCases.mjs", frozenCode);
  write("frozen/selected-cases.json", specs + "\n");
  write(`${attempt}/observation.json`, json(original.observation));
  write(`${attempt}/answer.json`, json(original.result));
  const originalHashes = () =>
    Object.fromEntries(
      [
        "manifest.json",
        "results.json",
        "frozen/scripts/lib/specialtyEvalCases.mjs",
        "frozen/selected-cases.json",
        `${attempt}/observation.json`,
        `${attempt}/answer.json`,
      ].map((file) => [file, sha(fs.readFileSync(path.join(run, file)))]),
    );
  return { temporary, evidenceRoot, run, attempt, originalHashes };
}

describe("Read-only derivative review CLI", () => {
  it("hashes source data without executing it, preserves every original byte and writes create-only", () => {
    const fixture = frozenReport();
    try {
      const before = fixture.originalHashes();
      const report = runSpecialtyRubricReview(["--run", fixture.run], {
        evidenceRoot: fixture.evidenceRoot,
      });
      expect(report.needsReview).toBe(1);
      expect(report.reviews[0].provenance.answerSha256).toBe(
        before[`${fixture.attempt}/answer.json`],
      );
      expect(report.source.originalGraderSha256).toBe(
        SUPPORTED_ORIGINAL_GRADER_SHA256,
      );
      expect(
        report.reviewer["scripts/lib/specialtyRubricReview.mjs"].sha256,
      ).toMatch(/^[a-f0-9]{64}$/);
      expect(report.modelCalls).toBe(0);
      expect(report.graderExecutions).toBe(0);
      expect(report.acceptanceChanged).toBe(false);
      expect(report.comparisonClaimsAuthorized).toBe(false);
      expect(path.dirname(report.output)).toBe(fixture.evidenceRoot);
      expect(fixture.originalHashes()).toEqual(before);
      const derivativeBefore = fs.readFileSync(report.output);
      expect(() =>
        runSpecialtyRubricReview(
          ["--run", fixture.run, "--output", report.output],
          { evidenceRoot: fixture.evidenceRoot },
        ),
      ).toThrow(/exists/);
      expect(fs.readFileSync(report.output)).toEqual(derivativeBefore);
    } finally {
      fs.rmSync(fixture.temporary, { recursive: true, force: true });
    }
  });

  it.each([
    "wrong-grader",
    "tampered-cases",
    "tampered-observation",
    "oversized",
    "outside-output",
    "inside-output",
    "outside-input",
  ])(
    "fails closed without creating derivative on invalid provenance/scope: %s",
    (mutation) => {
      const fixture = frozenReport();
      try {
        let run = fixture.run;
        let output = path.join(fixture.evidenceRoot, "review.json");
        if (mutation === "wrong-grader") {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(run, "manifest.json"), "utf8"),
          );
          manifest.snapshots.grader.sha256 = "0".repeat(64);
          const { fingerprint: _fingerprint, ...unsigned } = manifest;
          manifest.fingerprint = sha(json(unsigned));
          fs.writeFileSync(path.join(run, "manifest.json"), json(manifest));
          const report = JSON.parse(
            fs.readFileSync(path.join(run, "results.json"), "utf8"),
          );
          report.fingerprint = manifest.fingerprint;
          fs.writeFileSync(path.join(run, "results.json"), json(report));
        }
        if (mutation === "tampered-cases")
          fs.appendFileSync(path.join(run, "frozen/selected-cases.json"), " ");
        if (mutation === "tampered-observation")
          fs.writeFileSync(
            path.join(run, fixture.attempt, "observation.json"),
            "{}",
          );
        if (mutation === "oversized")
          fs.writeFileSync(
            path.join(run, "results.json"),
            " ".repeat(2 * 1024 * 1024 + 1),
          );
        if (mutation === "outside-output")
          output = path.join(fixture.temporary, "review.json");
        if (mutation === "inside-output")
          output = path.join(run, "review.json");
        if (mutation === "outside-input") run = fixture.temporary;
        expect(() =>
          runSpecialtyRubricReview(["--run", run, "--output", output], {
            evidenceRoot: fixture.evidenceRoot,
          }),
        ).toThrow();
        expect(fs.existsSync(output)).toBe(false);
      } finally {
        fs.rmSync(fixture.temporary, { recursive: true, force: true });
      }
    },
  );

  it("rejects a run reached through a directory junction or symbolic link", () => {
    const fixture = frozenReport();
    const linked = path.join(fixture.evidenceRoot, "linked-run");
    try {
      fs.symlinkSync(
        fixture.run,
        linked,
        process.platform === "win32" ? "junction" : "dir",
      );
      const output = path.join(fixture.evidenceRoot, "review.json");
      expect(() =>
        runSpecialtyRubricReview(["--run", linked, "--output", output], {
          evidenceRoot: fixture.evidenceRoot,
        }),
      ).toThrow(/Unsafe/);
      expect(fs.existsSync(output)).toBe(false);
    } finally {
      if (fs.existsSync(linked)) fs.unlinkSync(linked);
      fs.rmSync(fixture.temporary, { recursive: true, force: true });
    }
  });
});
