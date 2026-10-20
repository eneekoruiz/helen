/**
 * Credentials must not end up in memory, logs or a model's context. These patterns catch the common shapes
 * of secrets so they are refused (memory) or redacted (worker logs, provider payloads) before reaching disk.
 * Personal identifiers are allowed but marked sensitive. Every pattern is linear: logs can be megabytes long.
 */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'API key', pattern: /\bsk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Stripe key', pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'JSON web token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'password', pattern: /\b(?:password|passwd|contrase(?:ñ|n)a|clave|pwd)\s*[:=]\s*\S{4,}/i },
  { name: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
  // "la contraseña del portátil es hunter2", "my PIN is 4321": a credential stated in words.
  { name: 'password', pattern: /\b(?:contrase(?:ñ|n)a|password|passwd|passcode|pin|clave\s+(?:de(?:l|\s+la|\s+mi)?\s+)?(?:wifi|banco|tarjeta|correo|email|cuenta|acceso|ordenador|port(?:á|a)til|m(?:ó|o)vil|tel(?:é|e)fono))\b[^.\n]{0,40}?\s(?:es|son|is|was|era)\s+["'«]?(?:(?=[^\s"'»]*\d)[^\s"'»]{3,}|[^\s"'»]{8,})/i },
];

/** NAME=value or "name": "value" where the name says it is a credential; only the value is redacted. */
const ASSIGNMENT = /((?<![A-Za-z0-9])(?:[A-Za-z0-9]{1,40}[_-]){0,4}(?:api[_-]?key|secret|token|access[_-]?key|private[_-]?key)["']?\s*[:=]\s*["']?)([A-Za-z0-9._~+/-]{12,})/gi;

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

const CARD = /\b(?:\d[ -]?){13,19}\b/g;

function isCardNumber(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19 && luhn(digits);
}

/** Names of the secret kinds found; empty when the text is safe to store. */
export function findSecrets(text: string): string[] {
  const found = SECRET_PATTERNS.filter(entry => entry.pattern.test(text)).map(entry => entry.name);
  if (new RegExp(ASSIGNMENT.source, 'i').test(text)) found.push('credential');
  for (const match of text.matchAll(CARD)) {
    if (isCardNumber(match[0])) {
      found.push('card number');
      break;
    }
  }
  return [...new Set(found)];
}

/** Identifiers that are fine to remember but must not be read aloud or sent to a model by default. */
export function looksSensitive(text: string): boolean {
  return /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}\b/.test(text) // IBAN
    || /\b(?:contrase(?:ñ|n)a|password|passcode|pin|cvv|cvc|iban|cuenta\s+bancaria|bank\s+account|n(?:ú|u)mero\s+de\s+(?:tarjeta|cuenta|la\s+seguridad\s+social|pasaporte)|card\s+number|social\s+security|pasaporte|passport)\b/i.test(text)
    || /\b(?:c(?:ó|o)digo|code|combinaci(?:ó|o)n|combination)\s+(?:del?\s+|de\s+la\s+|of\s+the\s+|for\s+the\s+)?(?:portal|puerta|alarma|garaje|caja\s+fuerte|taquilla|candado|door|alarm|gate|garage|safe|locker|padlock)\b/i.test(text)
    || /\b\d{8}[A-HJ-NP-TV-Z]\b/.test(text) // Spanish DNI
    || /\b[XYZ]\d{7}[A-HJ-NP-TV-Z]\b/.test(text) // NIE
    || /\b\d{3}-\d{2}-\d{4}\b/.test(text) // US SSN
    || /\b(?:pin|cvv|cvc)\b\s*[:=]?\s*\d{3,6}\b/i.test(text);
}

/** Replace anything secret-shaped, for logs and provider payloads. */
export function redact(text: string): string {
  let out = text.replace(ASSIGNMENT, (_match, name: string) => `${name}[redacted]`);
  for (const { pattern } of SECRET_PATTERNS) out = out.replace(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`), '[redacted]');
  return out.replace(CARD, match => (isCardNumber(match) ? `[redacted]${/[ -]$/.exec(match)?.[0] ?? ''}` : match));
}

const SECRET_NAMES_ES: Record<string, string> = {
  'private key': 'clave privada', 'AWS access key': 'clave de AWS', 'GitHub token': 'token de GitHub', 'Slack token': 'token de Slack', 'API key': 'clave de API',
  'Google API key': 'clave de Google', 'Stripe key': 'clave de Stripe', 'JSON web token': 'token JWT', password: 'contraseña', 'bearer token': 'token', credential: 'credencial',
  'card number': 'número de tarjeta',
};

/** Why HELEN refuses to keep something, in the owner's language. */
export function secretRefusal(kinds: string[], lang: 'es' | 'en'): string {
  if (lang === 'es') return `Eso parece un secreto (${kinds.map(kind => SECRET_NAMES_ES[kind] ?? kind).join(', ')}). No guardo credenciales: usa un gestor de contraseñas.`;
  return `That looks like a secret (${kinds.join(', ')}). I do not keep credentials: use a password manager.`;
}
