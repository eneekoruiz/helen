/* global document, localStorage, window */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createAssistantServer } from "../dist/assistant/server.js";
import { writeConfig, readConfig } from "../dist/assistant/home.js";
import { listTasks } from "../dist/assistant/tasks.js";

const { values } = parseArgs({
  options: { "playwright-module": { type: "string" } },
});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(
  root,
  ".helen",
  "qa",
  `assistant-life-${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-life-browser-"));
const report = {
  syntheticDataOnly: true,
  providerCalls: 0,
  started: new Date().toISOString(),
  checks: [],
  screenshots: [],
  errors: [],
  limits: [
    "No real Google authorization or delivery",
    "No microphone recording, screen-reader or real model test",
    "Screenshots have no committed comparison baseline",
  ],
};
const check = (name) => report.checks.push({ name, status: "passed" });
let browser;
let server;
try {
  let module;
  try {
    module = values["playwright-module"]
      ? await import(
          pathToFileURL(path.resolve(values["playwright-module"])).href
        )
      : await import("playwright");
  } catch (err) {
    if (
      err &&
      (err.code === "ERR_MODULE_NOT_FOUND" ||
        err.message?.includes("Cannot find package 'playwright'"))
    ) {
      console.log(
        JSON.stringify(
          {
            verdict: "skipped",
            reason:
              "Playwright no está instalado en el entorno. Para ejecutar Browser QA, pasa --playwright-module <ruta> o instala playwright.",
            checks: 0,
            syntheticDataOnly: true,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }
    throw err;
  }
  const { chromium } = module.default ?? module;
  browser = await chromium.launch({ headless: true });
  const config = writeConfig(
    { owner: "Browser QA", locale: "es-ES", timezone: "Europe/Madrid" },
    home,
  );
  const token = crypto.randomBytes(32).toString("base64url");
  server = createAssistantServer({
    home,
    config,
    token,
    model: null,
    rateLimit: 1000,
    fetcher: async () => {
      throw new Error("External requests are forbidden in this QA session.");
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    report.errors.push(`Network failure: ${new URL(request.url()).pathname}`),
  );
  await page.goto(base);
  const login = async () => {
    await page.locator("#tokenInput").fill(token);
    await page.locator("#token button").click();
  };
  await login();
  assert.equal(await page.locator("#voice").isDisabled(), true);
  assert.match(await page.locator("#voiceHint").innerText(), /no disponible/);
  check("Unsupported dictation has a clear alternative");
  await page.locator("#settingsOpen").click();
  await page
    .locator("#gmailStatus")
    .filter({ hasText: "sin conectar" })
    .waitFor();
  await page.locator("#detail").selectOption("brief");
  await page.locator("#simpleLanguage").check();
  await page.locator("#stepByStep").check();
  await page.locator("#preferredLanguage").selectOption("eu-ES");
  await page.locator("#largeText").check();
  await page.locator("#preferences button[type=submit]").click();
  await page
    .locator("#settingsMessage")
    .filter({ hasText: "Preferencias guardadas" })
    .waitFor();
  assert.deepEqual(readConfig(home).assistance, {
    detail: "brief",
    simpleLanguage: true,
    stepByStep: true,
    preferredLanguage: "eu-ES",
  });
  check("Settings persist only the selected response preferences");
  await page
    .locator("#googleClientId")
    .fill("qa-client.apps.googleusercontent.com");
  await page.locator("#googleClientSecret").fill("qa-only-secret");
  await page.locator("#gmailConnect").click();
  await page.locator("#gmailConsent").waitFor({ state: "visible" });
  assert.equal(
    new URL(await page.locator("#gmailConsent").getAttribute("href")).hostname,
    "accounts.google.com",
  );
  assert.equal(await page.locator("#googleClientSecret").inputValue(), "");
  assert.equal(
    await page.evaluate(() =>
      JSON.stringify(localStorage).includes("qa-only-secret"),
    ),
    false,
  );
  check(
    "Gmail consent is explicit and OAuth secrets are never stored in the browser",
  );
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const width of [320, 375, 414, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        true,
      );
      const dialog = await page.locator("#settings").boundingBox();
      assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
      const screenshot = path.join(output, `settings-${width}-${theme}.png`);
      await page.screenshot({ path: screenshot });
      report.screenshots.push(screenshot);
    }
  }
  check(
    "Settings reflow at 320/375/414/768/1440 in both color schemes with large text",
  );
  let mockedConnection = true;
  await page.route("**/gmail/status", (route) =>
    route.fulfill({
      json: {
        connection: mockedConnection ? { account: "qa@example.com" } : null,
        contacts: {},
      },
    }),
  );
  await page.route("**/gmail/disconnect", (route) => {
    mockedConnection = false;
    return route.fulfill({ json: { disconnected: true, revoked: false } });
  });
  await page.locator("#gmailRefresh").click();
  await page.waitForFunction(
    () => !document.getElementById("gmailDisconnect").disabled,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#gmailDisconnect").click();
  await page
    .locator("#settingsMessage")
    .filter({ hasText: "revoca el acceso a HELEN" })
    .waitFor();
  assert.match(await page.locator("#gmailStatus").innerText(), /sin conectar/);
  check(
    "Failed remote revocation is distinguished from local Gmail disconnection",
  );
  await page.unroute("**/gmail/status");
  await page.unroute("**/gmail/disconnect");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#settings").isVisible(), false);
  assert.equal(
    await page
      .locator("#settingsOpen")
      .evaluate((element) => element === document.activeElement),
    true,
  );
  check("Native dialog closes by keyboard and restores focus");
  await page.setViewportSize({ width: 375, height: 900 });
  assert.equal(
    await page.evaluate(
      () =>
        document.querySelector("footer").scrollWidth <=
        document.querySelector("footer").clientWidth,
    ),
    true,
  );
  await page.locator("#file").setInputFiles({
    name: "qa.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Comprar café\nLlamar a Ana mañana a las 9"),
  });
  await page.locator("#capture").waitFor({ state: "visible" });
  assert.equal(listTasks(home).length, 0);
  await page
    .locator("#candidates textarea")
    .first()
    .fill("<img src=x onerror=alert(1)> Comprar té");
  await page.locator("#captureConfirm").click();
  await page.locator("#capture").waitFor({ state: "hidden" });
  assert.equal(listTasks(home).length, 2);
  assert.equal(
    listTasks(home).some(
      (task) => task.text === "<img src=x onerror=alert(1)> Comprar té",
    ),
    true,
  );
  assert.equal(await page.locator("#log img").count(), 0);
  check(
    "Attachment review writes nothing until exact edited confirmation and preserves literal text",
  );
  let chatRequest;
  page.on("request", (request) => {
    if (request.url() === base + "/chat") chatRequest = request.postDataJSON();
  });
  await page.locator("#text").fill("Ayuda");
  await page.locator("#text").press("Enter");
  await page.locator("#log .helen").filter({ hasText: /./ }).last().waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("#log .helen").length >= 2,
  );
  assert.match(chatRequest.requestId, /^[0-9a-f-]{36}$/);
  check("Chat requests carry a unique idempotency identifier");
  let releaseCapture;
  let staged;
  const stagedPromise = new Promise((resolve) => {
    staged = resolve;
  });
  await page.route("**/capture", async (route) => {
    const response = await route.fetch();
    staged();
    await new Promise((resolve) => {
      releaseCapture = resolve;
    });
    await route.fulfill({ response });
  });
  await page.locator("#file").setInputFiles({
    name: "late.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Tarea que llega tarde"),
  });
  await stagedPromise;
  await page.locator("#forget").click();
  const lateResponse = page.waitForResponse(
    (response) => response.url() === base + "/capture",
  );
  releaseCapture();
  await lateResponse;
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#capture").isVisible(), false);
  assert.equal(await page.locator("#candidates").innerText(), "");
  assert.equal(await page.locator("#log").innerText(), "");
  assert.equal(await page.locator("#googleClientId").inputValue(), "");
  assert.equal(await page.locator("#gmailConsent").getAttribute("href"), null);
  assert.equal(listTasks(home).length, 2);
  check("Logout clears private state and ignores late attachment responses");
  await page.unroute("**/capture");
  await login();
  await page.locator("#file").setInputFiles({
    name: "discard.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("No guardar esta tarea"),
  });
  await page.locator("#capture").waitFor({ state: "visible" });
  await page.locator("#captureDiscard").click();
  assert.equal(listTasks(home).length, 2);
  check("Discarding a staged capture never creates tasks");
  const voiceContext = await browser.newContext();
  await voiceContext.addInitScript(() => {
    window.__qaConfidence = 0;
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: class {
        start() {
          setTimeout(() => {
            this.onresult?.({
              resultIndex: 0,
              results: [
                {
                  0: {
                    transcript: "Mensaje dictado de prueba",
                    confidence: window.__qaConfidence,
                  },
                  isFinal: true,
                },
              ],
            });
            this.onend?.();
          }, 0);
        }
        stop() {
          this.onend?.();
        }
        abort() {
          this.onend?.();
        }
      },
    });
  });
  const voicePage = await voiceContext.newPage();
  let voiceSends = 0;
  await voicePage.route("**/chat", (route) => {
    voiceSends++;
    return route.fulfill({
      json: { text: "Respuesta de prueba", lang: "es", intent: "ask" },
    });
  });
  await voicePage.goto(base);
  await voicePage.locator("#tokenInput").fill(token);
  await voicePage.locator("#token button").click();
  await voicePage.locator("#voice").click();
  await voicePage
    .locator("#voiceHint")
    .filter({ hasText: "Revisa el dictado" })
    .waitFor();
  assert.equal(
    await voicePage.locator("#text").inputValue(),
    "Mensaje dictado de prueba",
  );
  assert.equal(voiceSends, 0);
  await voicePage.evaluate(() => {
    window.__qaConfidence = 0.9;
  });
  await voicePage.locator("#voice").click();
  await voicePage
    .locator(".helen")
    .filter({ hasText: "Respuesta de prueba" })
    .waitFor();
  assert.equal(voiceSends, 1);
  await voiceContext.close();
  check(
    "Synthetic dictation reviews uncertain final text and sends only confident final text",
  );
  assert.deepEqual(report.errors, []);
  check("No browser runtime or network errors");
  report.verdict = "passed";
} catch (error) {
  report.verdict = "failed";
  report.failure = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  report.finished = new Date().toISOString();
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  fs.rmSync(home, { recursive: true, force: true });
  console.log(
    JSON.stringify({
      verdict: report.verdict,
      checks: report.checks.length,
      report: path.join(output, "report.json"),
      failure: report.failure,
    }),
  );
}
