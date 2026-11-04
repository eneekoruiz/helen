import crypto from "node:crypto";
import { z } from "zod";
import { readCollection, updateCollection } from "./store.js";

const label = z.string().trim().min(1).max(60);
const labels = z.array(label).max(40);
const RulesSchema = z
  .array(
    z.object({ name: label, keywords: z.array(label).min(1).max(40) }).strict(),
  )
  .max(40);
export const SAVED_CATEGORIES = [
  {
    name: "Programación",
    keywords: [
      "programacion",
      "javascript",
      "python",
      "typescript",
      "coding",
      "software",
    ],
  },
  {
    name: "Productividad",
    keywords: ["productividad", "organizacion", "habitos", "productivity"],
  },
  {
    name: "Finanzas",
    keywords: ["finanzas", "ahorro", "inversion", "finance"],
  },
  {
    name: "Deporte",
    keywords: ["entrenamiento", "gimnasio", "deporte", "fitness", "workout"],
  },
  { name: "Viajes", keywords: ["viaje", "viajes", "travel", "turismo"] },
  {
    name: "Recetas",
    keywords: ["receta", "recetas", "cocina", "recipe", "cooking"],
  },
] as const;
export const SavedInputSchema = z
  .object({
    url: z.string().max(2048),
    title: z.string().trim().max(500).default(""),
    tags: labels.default([]),
  })
  .strict();
export const SavedItemSchema = SavedInputSchema.extend({
  id: z.string().uuid(),
  categories: labels,
  reviewed: z.boolean(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
});
export type SavedItem = z.infer<typeof SavedItemSchema>;
const NAME = "saved-links";
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function canonicalInstagramUrl(raw: string): string {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    !["instagram.com", "www.instagram.com", "m.instagram.com"].includes(
      url.hostname,
    ) ||
    url.username ||
    url.password ||
    url.port ||
    !/^\/(?:p|reel|tv)\/[A-Za-z0-9_-]{1,100}\/?$/.test(url.pathname)
  ) {
    throw new Error(
      "Expected an HTTPS Instagram post or reel URL, without credentials.",
    );
  }
  return `https://www.instagram.com${url.pathname.replace(/\/$/, "")}/`;
}

/** Reads metadata only; no scraping, downloads or execution of links. */
export function parseSavedExport(
  value: unknown,
): z.input<typeof SavedInputSchema>[] {
  const stack: Array<{ value: unknown; title: string; depth: number }> = [
    { value, title: "", depth: 0 },
  ];
  const result: z.input<typeof SavedInputSchema>[] = [];
  let visited = 0;
  while (stack.length) {
    const node = stack.pop()!;
    if (++visited > 100000 || node.depth > 32)
      throw new Error("Export exceeds the supported size or nesting.");
    if (!node.value || typeof node.value !== "object") continue;
    if (Array.isArray(node.value)) {
      for (const child of node.value)
        stack.push({ value: child, title: node.title, depth: node.depth + 1 });
      continue;
    }
    const entry = node.value as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title : node.title;
    const link = entry.url ?? entry.href;
    if (typeof link === "string") {
      try {
        const url = canonicalInstagramUrl(link);
        result.push(
          SavedInputSchema.parse({ url, title, tags: entry.tags ?? [] }),
        );
        if (result.length > 10000) throw new Error("Too many saved links.");
      } catch (error) {
        // Exported profile/help links are not saved media; malformed media are reported below.
        if (/instagram\.com\/(?:p|reel|tv)\//i.test(link)) throw error;
      }
    }
    for (const child of Object.values(entry)) {
      if (child && typeof child === "object")
        stack.push({ value: child, title, depth: node.depth + 1 });
    }
  }
  if (!result.length)
    throw new Error("No supported Instagram post or reel metadata found.");
  return result.reverse();
}

export function importSavedLinks(
  home: string,
  input: unknown,
  rules: unknown = SAVED_CATEGORIES,
  now = new Date(),
) {
  const entries = z
    .array(SavedInputSchema)
    .min(1)
    .max(10000)
    .parse(input)
    .map((entry) => ({ ...entry, url: canonicalInstagramUrl(entry.url) }));
  const categories = RulesSchema.parse(rules);
  return updateCollection(home, NAME, SavedItemSchema, (items) => {
    const known = new Set(items.map((item) => item.url));
    let added = 0,
      duplicates = 0;
    for (const entry of entries) {
      if (known.has(entry.url)) {
        duplicates++;
        continue;
      }
      const text = fold([entry.title, ...entry.tags].join(" "));
      const matched = categories
        .filter((rule) =>
          rule.keywords.some((word) => text.includes(fold(word))),
        )
        .map((rule) => rule.name);
      items.push({
        ...entry,
        id: crypto.randomUUID(),
        categories: [...new Set(matched)],
        reviewed: false,
        created: now.toISOString(),
        updated: now.toISOString(),
      });
      known.add(entry.url);
      added++;
    }
    return { added, duplicates, total: items.length };
  });
}

export function listSavedLinks(
  home: string,
  query = "",
  category = "",
): SavedItem[] {
  const q = z.string().max(500).parse(query);
  const cat = z.string().max(60).parse(category);
  return readCollection(home, NAME, SavedItemSchema).items.filter(
    (item) =>
      (!cat || item.categories.includes(cat)) &&
      fold(
        [item.title, item.url, ...item.categories, ...item.tags].join(" "),
      ).includes(fold(q)),
  );
}

export function reviewSavedLink(
  home: string,
  input: unknown,
  now = new Date(),
): SavedItem {
  const change = z
    .object({
      id: z.string().uuid(),
      categories: labels,
      tags: labels.optional(),
      title: z.string().trim().max(500).optional(),
    })
    .strict()
    .parse(input);
  return updateCollection(home, NAME, SavedItemSchema, (items) => {
    const item = items.find((entry) => entry.id === change.id);
    if (!item) throw new Error("Saved link not found.");
    item.categories = [...new Set(change.categories)];
    if (change.tags) item.tags = [...new Set(change.tags)];
    if (change.title !== undefined) item.title = change.title;
    item.reviewed = true;
    item.updated = now.toISOString();
    return item;
  });
}
