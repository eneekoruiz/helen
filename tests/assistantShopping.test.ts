import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeConfig, type AssistantConfig } from "../src/assistant/home.js";
import {
  classifyShoppingItem,
  completeShoppingItem,
  groupShoppingItems,
  shoppingList,
} from "../src/assistant/shopping.js";
import { addTasks, listTasks } from "../src/assistant/tasks.js";
import { handleUpdate, runTelegramBot } from "../src/assistant/telegram.js";

let home: string;
let config: AssistantConfig;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-shopping-"));
  config = writeConfig(
    {
      locale: "es-ES",
      channels: { telegram: { tokenEnv: "TOKEN", allowedChats: [42] } },
    },
    home,
  );
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));
const now = new Date("2026-10-25T10:00:00Z");
function network() {
  const calls: { method: string; body: Record<string, unknown> }[] = [];
  const fetcher = (async (url, init) => {
    const method = String(url).split("/").at(-1)!;
    calls.push({ method, body: JSON.parse(String(init?.body)) });
    return Response.json({ ok: true, result: {} });
  }) as typeof fetch;
  return { calls, fetcher };
}
const message = (text: string) => ({
  update_id: 1,
  message: {
    message_id: 5,
    chat: { id: 42, type: "private" },
    from: { id: 42 },
    text,
  },
});
const callback = (data: string) => ({
  update_id: 2,
  callback_query: {
    id: "callback-1",
    from: { id: 42 },
    message: {
      message_id: 6,
      chat: { id: 42, type: "private" },
      text: "Tu lista",
    },
    data,
  },
});
describe("shopping aisles and authorized Telegram ticks", () => {
  it("groups known products deterministically and leaves unknown products explicit", () => {
    expect(
      ["manzanas", "leche", "pollo", "detergente", "arroz", "algo raro"].map(
        classifyShoppingItem,
      ),
    ).toEqual([
      "Frutería/Frescos",
      "Lácteos/Nevera",
      "Carnicería/Pescado",
      "Limpieza",
      "Despensa",
      "Sin clasificar",
    ]);
    expect(classifyShoppingItem("atún en lata")).toBe("Despensa");
    expect(classifyShoppingItem("limpiador con leche")).toBe("Limpieza");
    addTasks(home, { text: "leche, manzanas, tornillos", list: "compra" });
    addTasks(home, { text: "Comprar pollo", list: "inbox" });
    expect(
      groupShoppingItems(listTasks(home)).map((group) => group.aisle),
    ).toEqual(["Frutería/Frescos", "Lácteos/Nevera", "Sin clasificar"]);
  });
  it("bounds each page and keyboard, and completes exact shopping ids idempotently", () => {
    addTasks(home, {
      text: Array.from({ length: 23 }, (_, index) => `producto ${index}`).join(
        ",",
      ),
      list: "compra",
    });
    const page = shoppingList(home, "es", 1);
    expect(page.pages).toBe(3);
    expect(page.buttons).toHaveLength(11);
    expect(
      page.buttons
        .flat()
        .every((button) => Buffer.byteLength(button.callback_data) <= 64),
    ).toBe(true);
    const task = listTasks(home, { list: "compra" })[0]!;
    const first = completeShoppingItem(home, task.id, now);
    expect(
      completeShoppingItem(home, task.id, new Date(now.getTime() + 1000)),
    ).toEqual(first);
    const other = addTasks(home, { text: "no es compra" }).added[0]!;
    expect(() => completeShoppingItem(home, other.id)).toThrow(/not found/);
  });
  it("shows aisle groups in Telegram and refreshes the keyboard after ticking", async () => {
    const task = addTasks(home, { text: "leche, arroz", list: "compra" })
      .added[0]!;
    const net = network();
    expect(
      await handleUpdate(message("/compra"), {
        home,
        config,
        token: "token",
        fetcher: net.fetcher,
        model: null,
      }),
    ).toContain("Lácteos/Nevera");
    expect(net.calls[0]!.body.reply_markup).toBeDefined();
    await handleUpdate(callback(`shop:done:${task.id}:0`), {
      home,
      config,
      token: "token",
      fetcher: net.fetcher,
      now,
    });
    const edit = net.calls.find((call) => call.method === "editMessageText")!;
    expect(edit.body.text).not.toContain("☐ leche");
    expect(edit.body.reply_markup).toBeDefined();
    expect(
      listTasks(home, { status: "all" }).find((item) => item.id === task.id)
        ?.status,
    ).toBe("done");
  });
  it("rejects group, mismatched sender, absent sender and forwarded callbacks before mutation", async () => {
    const task = addTasks(home, { text: "leche", list: "compra" }).added[0]!;
    const base = callback(`shop:done:${task.id}:0`);
    const invalid = [
      { ...base, callback_query: { ...base.callback_query, from: { id: 99 } } },
      {
        ...base,
        callback_query: {
          ...base.callback_query,
          message: {
            ...base.callback_query.message,
            chat: { id: 42, type: "group" },
          },
        },
      },
      {
        ...base,
        callback_query: {
          ...base.callback_query,
          message: {
            ...base.callback_query.message,
            forward_origin: { type: "user" },
          },
        },
      },
    ];
    for (const update of invalid)
      await handleUpdate(update, {
        home,
        config,
        token: "token",
        fetcher: network().fetcher,
      });
    expect(listTasks(home)[0]!.status).toBe("open");
    const net = network();
    await handleUpdate(
      {
        ...message("marca como hecho leche"),
        message: {
          ...message("marca como hecho leche").message,
          from: undefined,
          voice: { file_id: "never-download" },
        },
      },
      { home, config, token: "token", fetcher: net.fetcher },
    );
    expect(net.calls.map((call) => call.method)).toEqual(["sendMessage"]);
    expect(listTasks(home)[0]!.status).toBe("open");
  });
  it("postpones only the chosen task, preserving other overdue tasks", async () => {
    const [one, two] = addTasks(home, {
      text: "uno, dos",
      list: "trabajo",
      due: new Date("2026-10-24T08:00:00Z"),
    }).added;
    await handleUpdate(callback(`snooze:${one!.id}`), {
      home,
      config,
      token: "token",
      fetcher: network().fetcher,
      now,
    });
    const tasks = listTasks(home);
    expect(tasks.find((task) => task.id === one!.id)!.due).toBe(
      "2026-10-26T10:00:00.000Z",
    );
    expect(tasks.find((task) => task.id === two!.id)!.due).toBe(
      "2026-10-24T08:00:00.000Z",
    );
  });
  it("requests actual callback updates from Telegram polling", async () => {
    const controller = new AbortController();
    const fetcher = (async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.allowed_updates).toEqual(["message", "callback_query"]);
      controller.abort();
      return Response.json({ ok: true, result: [] });
    }) as typeof fetch;
    await runTelegramBot({
      home,
      config,
      env: { TOKEN: "token" },
      fetcher,
      signal: controller.signal,
    });
  });
});
