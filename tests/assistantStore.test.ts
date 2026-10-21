import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAgenda, formatAgenda } from "../src/assistant/agenda.js";
import {
  getConversation,
  pendingFor,
  saveConversation,
} from "../src/assistant/conversation.js";
import {
  readConfig,
  setConfigValue,
  writeConfig,
} from "../src/assistant/home.js";
import { understand } from "../src/assistant/intents.js";
import {
  addMemory,
  forgetMemory,
  getMemory,
  listMemory,
  memoryDir,
  searchMemory,
  updateMemory,
} from "../src/assistant/memory.js";
import {
  addReminder,
  cancelReminder,
  dueReminders,
  findReminder,
  listReminders,
  markDelivered,
  occurrencesBetween,
  snoozeReminder,
  WhenNotUnderstoodError,
} from "../src/assistant/reminders.js";
import {
  addTasks,
  clearDone,
  completeTask,
  findTask,
  listKey,
  listNames,
  listTasks,
  splitItems,
} from "../src/assistant/tasks.js";
import { findSecrets, looksSensitive, redact } from "../src/core/secrets.js";

const NOW = new Date("2026-10-20T08:30:00Z"); // Tuesday 10:30 in Madrid
const CTX = {
  timezone: "Europe/Madrid",
  locale: "es-ES",
  defaultTime: "09:00",
  now: NOW,
};

let home: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-store-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

describe("secrets and private data", () => {
  it("refuses credentials however they are written", () => {
    expect(findSecrets("la contraseña del portátil es hunter2abc")).toContain(
      "password",
    );
    expect(findSecrets("my PIN is 4321")).toContain("password");
    expect(
      findSecrets(
        "export ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz",
      ),
    ).not.toEqual([]);
    expect(findSecrets("card 4111 1111 1111 1111")).toContain("card number");
    expect(findSecrets("la clave del éxito es la constancia")).toEqual([]);
    expect(findSecrets("el wifi de casa se llama Movistar_5G")).toEqual([]);
    expect(findSecrets("the token count is 12")).toEqual([]);
  });

  it("marks personal identifiers and door codes as private", () => {
    expect(looksSensitive("El código del portal es 4532")).toBe(true);
    expect(looksSensitive("IBAN ES91 2100 0418 4502 0005 1332")).toBe(true);
    expect(looksSensitive("Mi DNI es 12345678Z")).toBe(true);
    expect(looksSensitive("Ana cumple años el 3 de marzo")).toBe(false);
  });

  it("redacts values but keeps the names, and never hangs on long input", () => {
    expect(redact("HELEN_TOKEN=abcdefghijklmnop1234 ok")).toBe(
      "HELEN_TOKEN=[redacted] ok",
    );
    expect(redact("Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123")).toBe(
      "Authorization: [redacted]",
    );
    const started = Date.now();
    redact("x_".repeat(500_000));
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe("memory", () => {
  it("stores Markdown files with private permissions and finds them by meaning-ish words", () => {
    const wifi = addMemory(home, {
      text: "El wifi de casa se llama Movistar_5G",
      tags: ["casa"],
      now: NOW,
    });
    addMemory(home, {
      text: "Las reuniones del equipo son los lunes a las 10",
      kind: "fact",
      now: NOW,
    });
    addMemory(home, {
      text: "Idea: una app para compartir recetas",
      kind: "idea",
      now: NOW,
    });
    expect(fs.readFileSync(wifi.file, "utf8")).toMatch(
      /^---\nid: m[0-9a-f]{6}\nkind: note\ntags: \[casa\]/,
    );
    if (process.platform !== "win32")
      expect(fs.statSync(wifi.file).mode & 0o777).toBe(0o600);
    expect(
      searchMemory(home, "¿cuál es el wifi?", { now: NOW })[0]!.item.id,
    ).toBe(wifi.id);
    expect(searchMemory(home, "reunión", { now: NOW })[0]!.item.kind).toBe(
      "fact",
    );
    expect(searchMemory(home, "recipes", { now: NOW })).toEqual([]);
  });

  it("refuses secrets in the owner's language, unless explicitly allowed", () => {
    expect(() =>
      addMemory(home, {
        text: "la contraseña del correo es Pepe1234",
        lang: "es",
      }),
    ).toThrow(/No guardo credenciales/);
    expect(() =>
      addMemory(home, { text: "my password: hunter2hunter2" }),
    ).toThrow(/password manager/);
    expect(
      addMemory(home, {
        text: "la contraseña del correo es Pepe1234",
        allowSecret: true,
      }).sensitive,
    ).toBe(true);
  });

  it("keeps private items out of searches that ask for that", () => {
    addMemory(home, { text: "El código del portal es 4532" });
    expect(searchMemory(home, "portal")[0]!.item.sensitive).toBe(true);
    expect(searchMemory(home, "portal", { includeSensitive: false })).toEqual(
      [],
    );
  });

  it("updates, expires, filters by visibility and forgets for good", () => {
    const shared = addMemory(home, {
      text: "Prefiero pnpm a npm",
      visibility: "agents",
    });
    const old = addMemory(home, {
      text: "Oferta válida hasta ayer",
      expires: "2026-10-19T00:00:00Z",
    });
    expect(listMemory(home, { now: NOW }).map((item) => item.id)).not.toContain(
      old.id,
    );
    expect(
      listMemory(home, { visibility: "agents", now: NOW }).map(
        (item) => item.id,
      ),
    ).toEqual([shared.id]);
    expect(updateMemory(home, shared.id, { tags: ["tooling"] }).tags).toEqual([
      "tooling",
    ]);
    forgetMemory(home, shared.id);
    expect(getMemory(home, shared.id)).toBeNull();
  });

  it("reads notes edited or created by hand, and ignores what is not a note", () => {
    fs.mkdirSync(memoryDir(home), { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir(home), "a-mano.md"),
      "# Bici\n\nLa bici está en el trastero.",
    );
    fs.writeFileSync(path.join(memoryDir(home), "notes.txt"), "not markdown");
    const [item] = listMemory(home);
    expect(item).toMatchObject({
      title: "Bici",
      kind: "note",
      visibility: "private",
    });
    expect(searchMemory(home, "trastero")[0]!.item.title).toBe("Bici");
  });
});

describe("reminders", () => {
  it("reads what and when from one sentence", () => {
    const reminder = addReminder(
      home,
      { text: "llamar a mamá mañana a las 9" },
      CTX,
    );
    expect(reminder).toMatchObject({
      text: "llamar a mamá",
      due: "2026-10-21T07:00:00.000Z",
      status: "pending",
      fired: 0,
    });
    expect(
      addReminder(
        home,
        { text: "pagar el alquiler", when: "el día 1 de cada mes" },
        CTX,
      ).recurrence,
    ).toMatchObject({ freq: "monthly", dayOfMonth: 1 });
  });

  it("refuses times in the past, unknown times and empty texts", () => {
    expect(() =>
      addReminder(home, { text: "hoy a las 8 de la mañana desayunar" }, CTX),
    ).toThrow(/ya ha pasado/);
    // Without am/pm, "a las 8" said at 10:30 means tonight.
    expect(
      addReminder(home, { text: "hoy a las 8 cenar con Ana" }, CTX).due,
    ).toBe("2026-10-20T18:00:00.000Z");
    expect(() => addReminder(home, { text: "llamar a mamá" }, CTX)).toThrow(
      WhenNotUnderstoodError,
    );
    expect(() => addReminder(home, { text: "mañana a las 9" }, CTX)).toThrow(
      /Qué quieres que te recuerde/,
    );
  });

  it("a recurring reminder announced late fires once and moves to its next time", () => {
    const daily = addReminder(
      home,
      { text: "tomar la pastilla todos los días a las 9" },
      { ...CTX, now: new Date("2026-10-18T06:00:00Z") },
    );
    const later = new Date("2026-10-20T12:00:00Z"); // two occurrences were missed
    expect(dueReminders(home, later).map((reminder) => reminder.id)).toEqual([
      daily.id,
    ]);
    const delivered = markDelivered(home, daily.id, "Europe/Madrid", later);
    expect(delivered).toMatchObject({
      fired: 1,
      status: "pending",
      due: "2026-10-21T07:00:00.000Z",
    });
    expect(dueReminders(home, later)).toEqual([]);
  });

  it("a one-off reminder is done after delivery; snoozing brings it back", () => {
    const once = addReminder(
      home,
      { text: "sacar la ropa en 10 minutos" },
      CTX,
    );
    expect(
      markDelivered(
        home,
        once.id,
        "Europe/Madrid",
        new Date(NOW.getTime() + 11 * 60_000),
      ).status,
    ).toBe("done");
    const snoozed = snoozeReminder(home, once.id, "15", {
      ...CTX,
      now: new Date(NOW.getTime() + 11 * 60_000),
    });
    expect(snoozed).toMatchObject({
      status: "pending",
      due: new Date(NOW.getTime() + 26 * 60_000).toISOString(),
    });
    expect(snoozeReminder(home, once.id, "una hora", CTX).due).toBe(
      new Date(NOW.getTime() + 3600_000).toISOString(),
    );
  });

  it("finds a reminder by its words and refuses to guess between equals", () => {
    const mom = addReminder(
      home,
      { text: "llamar a mamá mañana a las 9" },
      CTX,
    );
    addReminder(home, { text: "llamar a papá mañana a las 10" }, CTX);
    expect(findReminder(home, "mamá").id).toBe(mom.id);
    expect(() => findReminder(home, "llamar")).toThrow(/Hay varios/);
    expect(() => findReminder(home, "dentista")).toThrow(/No encuentro/);
    cancelReminder(home, mom.id);
    expect(listReminders(home).map((reminder) => reminder.text)).toEqual([
      "llamar a papá",
    ]);
  });

  it("expands recurring reminders inside a window", () => {
    addReminder(
      home,
      { text: "sacar la basura los martes y jueves a las 21" },
      CTX,
    );
    const week = occurrencesBetween(
      home,
      NOW,
      new Date(NOW.getTime() + 7 * 86_400_000),
      "Europe/Madrid",
    );
    expect(week.map((occurrence) => occurrence.at.toISOString())).toEqual([
      "2026-10-20T19:00:00.000Z",
      "2026-10-22T19:00:00.000Z",
    ]);
    // After the clocks go back on the 25th, 21:00 in Madrid is 20:00 UTC.
    const fortnight = occurrencesBetween(
      home,
      NOW,
      new Date(NOW.getTime() + 8 * 86_400_000),
      "Europe/Madrid",
    );
    expect(fortnight.at(-1)!.at.toISOString()).toBe("2026-10-27T20:00:00.000Z");
  });

  it("never overwrites a damaged store, and skips entries it cannot read", () => {
    fs.writeFileSync(path.join(home, "reminders.json"), "{ broken");
    expect(() => listReminders(home)).toThrow(
      /not valid JSON.*will not overwrite/,
    );
    fs.writeFileSync(
      path.join(home, "reminders.json"),
      JSON.stringify({ version: 1, items: [{ id: "nonsense" }] }),
    );
    expect(listReminders(home)).toEqual([]);
    addReminder(home, { text: "regar las plantas mañana" }, CTX);
    expect(
      JSON.parse(fs.readFileSync(path.join(home, "reminders.json"), "utf8"))
        .items,
    ).toHaveLength(2);
  });
});

describe("tasks and lists", () => {
  it("normalizes list names in both languages", () => {
    expect(listKey("la lista de la compra")).toBe("compra");
    expect(listKey("shopping")).toBe("compra");
    expect(listKey("my grocery list")).toBe("compra");
    expect(listKey(undefined)).toBe("inbox");
    expect(listKey("Trabajo")).toBe("trabajo");
    expect(splitItems("leche, huevos y pan")).toEqual([
      "leche",
      "huevos",
      "pan",
    ]);
    expect(splitItems("unas pilas and some milk")).toEqual(["pilas", "milk"]);
  });

  it("adds shopping items one by one without duplicates, and ticks them off by name", () => {
    expect(
      addTasks(home, { text: "leche, huevos y pan", list: "compra" }).added,
    ).toHaveLength(3);
    const again = addTasks(home, { text: "Leche y pilas", list: "shopping" });
    expect(again.added.map((task) => task.text)).toEqual(["pilas"]);
    expect(again.existing.map((task) => task.text)).toEqual(["leche"]);
    completeTask(home, findTask(home, "huevos", { list: "compra" }).id);
    expect(
      listTasks(home, { list: "compra" }).map((task) => task.text),
    ).toEqual(["leche", "pan", "pilas"]);
    expect(clearDone(home, "compra")).toBe(1);
    expect(listNames(home)).toEqual([{ list: "compra", open: 3 }]);
  });

  it("keeps a task sentence whole and reads urgency from it", () => {
    const [task] = addTasks(home, {
      text: "llamar a Juan y a María, urgente",
    }).added;
    expect(task).toMatchObject({ list: "inbox", priority: "high" });
    expect(task!.text).toBe("llamar a Juan y a María, urgente");
  });
});

describe("agenda", () => {
  it("collects reminders, due and overdue tasks and the shopping list, for screens and for speakers", () => {
    addReminder(home, { text: "llamar a mamá hoy a las 18" }, CTX);
    addReminder(home, { text: "cita médica mañana a las 9" }, CTX);
    addReminder(
      home,
      { text: "El código del portal es 4532 hoy a las 20" },
      CTX,
    );
    addTasks(home, {
      text: "enviar la factura",
      due: new Date("2026-10-19T10:00:00Z"),
    });
    addTasks(home, { text: "leche", list: "compra" });
    const today = buildAgenda(home, "today", {
      now: NOW,
      timezone: "Europe/Madrid",
    });
    expect(
      today.occurrences.map((occurrence) => occurrence.reminder.text),
    ).toEqual(["llamar a mamá", "código del portal es 4532"]);
    expect(today.occurrences[1]!.reminder.sensitive).toBe(true);
    expect(today.overdueTasks.map((task) => task.text)).toEqual([
      "enviar la factura",
    ]);
    const options = {
      lang: "es" as const,
      locale: "es-ES",
      timezone: "Europe/Madrid",
    };
    const screen = formatAgenda(today, { ...options, showSensitive: false });
    expect(screen).toContain("18:00 llamar a mamá");
    expect(screen).toContain("un recordatorio privado");
    expect(screen).not.toContain("4532");
    const spoken = formatAgenda(today, { ...options, speaker: true });
    expect(spoken).toMatch(
      /^Hoy tienes 2 recordatorios: a las 18:00, llamar a mamá y a las 20:00, algo privado\./,
    );
    expect(
      buildAgenda(home, "tomorrow", {
        now: NOW,
        timezone: "Europe/Madrid",
      }).occurrences.map((occurrence) => occurrence.reminder.text),
    ).toEqual(["cita médica"]);
  });
});

describe("configuration and short-term context", () => {
  it("validates settings and never stores a model key", () => {
    writeConfig({ owner: "Eneko", timezone: "Europe/Madrid" }, home);
    setConfigValue(
      "provider",
      '{"type":"command","command":["claude","-p"]}',
      home,
    );
    expect(readConfig(home).provider).toMatchObject({
      type: "command",
      mode: "fallback",
      allowSensitive: false,
    });
    expect(() =>
      setConfigValue("provider", '{"type":"anthropic"}', home),
    ).toThrow(/model/);
    expect(() =>
      setConfigValue("provider", '{"type":"openai","model":"x"}', home),
    ).toThrow();
    expect(readConfig(home).privacy.showSensitiveOn).toEqual([
      "cli",
      "http",
      "web",
    ]);
  });

  it("remembers what HELEN asked for ten minutes", () => {
    const conversation = getConversation(home, "telegram:1", NOW);
    conversation.pending = pendingFor(
      "remember",
      { text: "el coche está en la planta -2" },
      NOW,
    );
    saveConversation(home, conversation, NOW);
    expect(
      getConversation(home, "telegram:1", new Date(NOW.getTime() + 5 * 60_000))
        .pending?.text,
    ).toBe("el coche está en la planta -2");
    expect(
      getConversation(home, "telegram:1", new Date(NOW.getTime() + 11 * 60_000))
        .pending,
    ).toBeUndefined();
    expect(getConversation(home, "telegram:2", NOW).pending).toBeUndefined();
  });
});

describe("understanding", () => {
  const cases: Array<[string, string, Record<string, unknown>?]> = [
    [
      "Oye Helen, ¿me recuerdas que el viernes tengo dentista?",
      "remind",
      { text: "el viernes tengo dentista" },
    ],
    [
      "recuérdamelo en 10 minutos",
      "reminder.snooze",
      { when: "en 10 minutos" },
    ],
    [
      "Añade leche, huevos y pan a la lista de la compra",
      "task.add",
      { text: "leche, huevos y pan", list: "la lista de la compra" },
    ],
    ["ya he comprado la leche", "task.done", { query: "la leche" }],
    ["¿Qué tengo mañana?", "agenda", { range: "tomorrow" }],
    [
      "Recuerda que el wifi de casa se llama Movistar_5G",
      "remember",
      { text: "el wifi de casa se llama Movistar_5G" },
    ],
    ["¿Cuál es el wifi de casa?", "recall"],
    ["olvida lo del wifi", "forget", { query: "wifi" }],
    ["cancela el recordatorio de mamá", "reminder.cancel", { query: "mamá" }],
    [
      "remind me to call mom tomorrow at 9am",
      "remind",
      { text: "call mom tomorrow at 9am" },
    ],
    ["what's on my shopping list?", "tasks.list"],
    ["what do I have today", "agenda", { range: "today" }],
    ["sí", "yes"],
    ["el coche está en la planta -2", "unknown"],
  ];
  for (const [text, name, fields] of cases) {
    it(text, () => {
      const { intent } = understand(text);
      expect(intent.name).toBe(name);
      if (fields) expect(intent).toMatchObject(fields);
    });
  }
  it("keeps accents and case of what it captures and guesses the language", () => {
    expect(
      understand("Recuérdame Llamar a Álvaro mañana").intent,
    ).toMatchObject({ text: "Llamar a Álvaro mañana" });
    expect(understand("remind me to call mom").lang).toBe("en");
    expect(understand("recuérdame llamar").lang).toBe("es");
  });
});
