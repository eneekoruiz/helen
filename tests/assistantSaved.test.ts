import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, expect, it } from "vitest";
import { writeConfig } from "../src/assistant/home.js";
import { createAssistantServer } from "../src/assistant/server.js";
import {
  canonicalInstagramUrl,
  importSavedLinks,
  listSavedLinks,
  parseSavedExport,
  reviewSavedLink,
} from "../src/assistant/saved.js";

let home: string;
let server: http.Server | undefined;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-saved-"));
});
afterEach(async () => {
  if (server)
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
  fs.rmSync(home, { recursive: true, force: true });
});
const exported = {
  saved_saved_media: [
    {
      title: "Python y organización",
      string_map_data: {
        "Saved on": {
          href: "https://instagram.com/reel/ABC_12/?utm_source=test",
        },
      },
    },
  ],
};

it("imports nested export metadata, normalizes duplicates and preserves reviewed categories", () => {
  const entries = parseSavedExport(exported);
  expect(importSavedLinks(home, entries)).toEqual({
    added: 1,
    duplicates: 0,
    total: 1,
  });
  const [item] = listSavedLinks(home, "ORGANIZACIÓN", "Programación");
  expect(item).toMatchObject({
    reviewed: false,
    categories: ["Programación", "Productividad"],
    url: "https://www.instagram.com/reel/ABC_12/",
  });
  reviewSavedLink(home, {
    id: item!.id,
    categories: ["Aprender", "Aprender"],
    tags: ["curso"],
  });
  expect(importSavedLinks(home, entries)).toEqual({
    added: 0,
    duplicates: 1,
    total: 1,
  });
  expect(listSavedLinks(home, "curso")[0]).toMatchObject({
    reviewed: true,
    categories: ["Aprender"],
  });
});

it("supports custom categories and leaves uncertain items unclassified", () => {
  importSavedLinks(
    home,
    [{ url: "https://www.instagram.com/p/A/", title: "Paisaje" }],
    [{ name: "Fotografía", keywords: ["paisaje"] }],
  );
  importSavedLinks(home, [{ url: "https://www.instagram.com/p/B/" }]);
  expect(listSavedLinks(home).map((item) => item.categories)).toEqual([
    ["Fotografía"],
    [],
  ]);
  expect(() =>
    reviewSavedLink(home, {
      id: listSavedLinks(home)[0]!.id,
      categories: [],
      command: "execute",
    }),
  ).toThrow();
});

it("rejects unsafe links, excessive nesting and invalid batches without partial writes", () => {
  for (const url of [
    "http://instagram.com/p/A/",
    "https://instagram.com.evil.test/p/A/",
    "https://user@instagram.com/p/A/",
    "https://instagram.com:444/p/A/",
    "https://instagram.com/direct/inbox/",
  ]) {
    expect(() => canonicalInstagramUrl(url)).toThrow();
  }
  expect(() =>
    importSavedLinks(home, [
      { url: "https://instagram.com/p/A/" },
      { url: "https://evil.test/p/B/" },
    ]),
  ).toThrow();
  expect(listSavedLinks(home)).toEqual([]);
  let nested: unknown = exported;
  for (let n = 0; n < 34; n++) nested = { nested };
  expect(() => parseSavedExport(nested)).toThrow(/nesting/);
  expect(() =>
    parseSavedExport({ href: "https://example.com/profile" }),
  ).toThrow(/No supported/);
});

it("preserves invalid stored entries and refuses to overwrite corrupt JSON", () => {
  const file = path.join(home, "saved-links.json");
  fs.writeFileSync(
    file,
    JSON.stringify({ version: 1, items: [{ keep: "unknown record" }] }),
  );
  importSavedLinks(home, parseSavedExport(exported));
  expect(JSON.parse(fs.readFileSync(file, "utf8")).items).toContainEqual({
    keep: "unknown record",
  });
  fs.writeFileSync(file, "corrupt");
  expect(() => importSavedLinks(home, parseSavedExport(exported))).toThrow(
    /not valid JSON/,
  );
  expect(fs.readFileSync(file, "utf8")).toBe("corrupt");
});

it("authenticates HTTP imports, rejects speaker/public channels and supports review and filtered reads", async () => {
  const config = writeConfig(
    {
      owner: "Test",
      timezone: "Europe/Madrid",
      privacy: { showSensitiveOn: ["web"] },
    },
    home,
  );
  server = createAssistantServer({
    home,
    config,
    token: "test-token",
    model: null,
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (route: string, body?: unknown, channel = "web") =>
    fetch(base + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
        "x-helen-client": channel,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  expect(
    (await fetch(base + "/saved/import", { method: "POST", body: "invalid" }))
      .status,
  ).toBe(401);
  expect(
    (await request("/saved/import", { data: exported }, "http")).status,
  ).toBe(403);
  expect(
    (await request("/saved/import", { data: exported, speaker: true })).status,
  ).toBe(403);
  expect((await request("/saved/import", { data: exported })).status).toBe(200);
  const listing = await request("/saved?category=Programaci%C3%B3n");
  const { items } = (await listing.json()) as { items: Array<{ id: string }> };
  expect(items).toHaveLength(1);
  expect(
    (
      await request("/saved/review", {
        id: items[0]!.id,
        categories: ["Estudio"],
      })
    ).status,
  ).toBe(200);
  expect((await request("/saved?speaker=true")).status).toBe(403);
  expect((await request("/saved/import", { data: [] })).status).toBe(400);
  expect(listSavedLinks(home)).toHaveLength(1);
});
