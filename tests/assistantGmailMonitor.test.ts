import { afterEach, expect, it, vi } from "vitest";
import { AssistantConfigSchema } from "../src/assistant/home.js";
import { runGmailMonitor } from "../src/assistant/gmailMonitor.js";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  list: vi.fn(),
  run: vi.fn(),
}));
vi.mock("../src/assistant/mail.js", () => ({
  gmailConnection: mocks.connection,
}));
vi.mock("../src/assistant/gmailWatch.js", () => ({
  listGmailWatches: mocks.list,
  runGmailWatches: mocks.run,
}));
afterEach(() => vi.resetAllMocks());
it("does no Google calls without an active owner rule and stops immediately on abort", async () => {
  const controller = new AbortController();
  mocks.list.mockImplementation(() => {
    controller.abort();
    return [];
  });
  await runGmailMonitor({
    home: "unused",
    config: AssistantConfigSchema.parse({}),
    signal: controller.signal,
  });
  expect(mocks.connection).not.toHaveBeenCalled();
  expect(mocks.run).not.toHaveBeenCalled();
});
it("resolves the live connection for an active rule and polls without sending or using a model", async () => {
  const controller = new AbortController();
  const connection = {
    config: { account: "owner@example.org" },
    options: { signal: controller.signal },
  };
  mocks.list.mockReturnValue([{ state: "active" }]);
  mocks.connection.mockReturnValue(connection);
  mocks.run.mockImplementation(async () => {
    controller.abort();
    return { checked: 1, scheduled: 1, errors: [] };
  });
  await runGmailMonitor({
    home: "unused",
    config: AssistantConfigSchema.parse({}),
    signal: controller.signal,
  });
  expect(mocks.run).toHaveBeenCalledExactlyOnceWith(
    "unused",
    connection.config,
    connection.options,
  );
});
