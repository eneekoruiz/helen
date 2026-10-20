/** Small, dependency-free color helpers used by the design tools (WCAG contrast and hue). */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseColor(value: string): Rgb | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex) {
    let digits = hex[1]!;
    if (digits.length <= 4) digits = digits.split('').map(char => char + char).join('');
    return { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16) };
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(text);
  if (rgb) return { r: Math.min(255, Number(rgb[1])), g: Math.min(255, Number(rgb[2])), b: Math.min(255, Number(rgb[3])) };
  const hsl = /^hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?[\s,]+(\d+(?:\.\d+)?)%[\s,]+(\d+(?:\.\d+)?)%/.exec(text);
  if (hsl) {
    const h = ((Number(hsl[1]) % 360) + 360) % 360;
    const s = Number(hsl[2]) / 100;
    const l = Number(hsl[3]) / 100;
    const k = (n: number): number => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): number => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return { r: f(0), g: f(8), b: f(4) };
  }
  return null;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: Rgb): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** WCAG 2.x contrast ratio between two colors, 1 to 21. */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const left = typeof a === 'string' ? parseColor(a) : a;
  const right = typeof b === 'string' ? parseColor(b) : b;
  if (!left || !right) throw new Error('Unsupported color');
  const [light, dark] = [luminance(left), luminance(right)].sort((x, y) => y - x) as [number, number];
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

/** Hue in degrees 0-360, or null for greys. */
export function hue(color: Rgb): number | null {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 0.08) return null;
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return Math.round(((h * 60) + 360) % 360);
}
