/**
 * Language helpers for Spanish and English: normalization, tokens for search, and a light language guess.
 * Deliberately small and predictable: no dependency, no model.
 */
const STOPWORDS = new Set([
  // es
  "a",
  "al",
  "algo",
  "como",
  "con",
  "de",
  "del",
  "el",
  "en",
  "es",
  "esa",
  "ese",
  "eso",
  "esta",
  "este",
  "esto",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "me",
  "mi",
  "mis",
  "muy",
  "no",
  "o",
  "para",
  "pero",
  "por",
  "que",
  "qué",
  "se",
  "si",
  "sin",
  "sobre",
  "su",
  "sus",
  "te",
  "tu",
  "tus",
  "un",
  "una",
  "uno",
  "unos",
  "unas",
  "y",
  "ya",
  "yo",
  "hay",
  "he",
  "ha",
  "son",
  "fue",
  "ser",
  "estar",
  "cual",
  "cuales",
  "cuando",
  "donde",
  "quien",
  "quienes",
  "cuanto",
  "cuanta",
  "cuantos",
  "cuantas",
  "esta",
  "estan",
  "tengo",
  "tienes",
  "dime",
  "sabes",
  // en
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "i",
  "in",
  "is",
  "it",
  "its",
  "my",
  "of",
  "on",
  "or",
  "our",
  "so",
  "the",
  "their",
  "there",
  "this",
  "that",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
  "you",
  "your",
  "about",
  "do",
  "did",
  "me",
  "how",
  "does",
  "know",
  "tell",
]);

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const SUFFIXES = [
  "aciones",
  "iciones",
  "amiento",
  "imiento",
  "adoras",
  "adores",
  "ancias",
  "aciones",
  "acion",
  "icion",
  "mente",
  "ando",
  "iendo",
  "ados",
  "adas",
  "idos",
  "idas",
  "ings",
  "ing",
  "edly",
  "ed",
  "es",
  "s",
];

/** A light stemmer: enough for "reuniones" to find "reunión" and "meetings" to find "meeting". */
export function stem(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix))
      return word.slice(0, -suffix.length);
  }
  return word;
}

export function tokens(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem);
}

/** Best guess between Spanish and English for replying in the user's language. */
export function guessLanguage(
  text: string,
  fallback: "es" | "en" = "es",
): "es" | "en" {
  const words = fold(text)
    .split(/[^a-zñ]+/)
    .filter(Boolean);
  const es = [
    "que",
    "de",
    "el",
    "la",
    "los",
    "las",
    "mañana",
    "manana",
    "hoy",
    "recuerdame",
    "apunta",
    "tengo",
    "para",
    "con",
    "una",
    "por",
    "cuando",
    "como",
    "cual",
    "donde",
    "esta",
    "semana",
    "hora",
    "horas",
    "sabes",
    "busca",
    "tarea",
    "tareas",
    "mi",
    "mis",
  ];
  const en = [
    "the",
    "to",
    "of",
    "and",
    "remind",
    "tomorrow",
    "today",
    "what",
    "my",
    "is",
    "at",
    "in",
    "on",
    "for",
    "note",
    "know",
    "about",
    "task",
    "tasks",
    "week",
    "hour",
    "hours",
    "with",
    "when",
    "where",
  ];
  const score = (list: string[]): number =>
    words.filter((word) => list.includes(word)).length;
  const s = score(es) + (/[ñáéíóú¿¡]/i.test(text) ? 2 : 0);
  const e = score(en);
  if (s === e) return fallback;
  return s > e ? "es" : "en";
}

export function slug(text: string, max = 40): string {
  return (
    fold(text)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/, "") || "note"
  );
}

/** One line of plain text: control characters and runs of whitespace become single spaces. */
export function oneLine(text: string): string {
  return Array.from(text, (char) =>
    char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? " " : char,
  )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
