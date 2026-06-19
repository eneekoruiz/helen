const ESC = '\x1b[';
const RESET = ESC + '0m';
const HIDE_CURSOR = ESC + '?25l';
const SHOW_CURSOR = ESC + '?25h';
const CLEAR_SCREEN = ESC + '2J' + ESC + 'H';
const CLEAR_BELOW = ESC + 'J';

const HELEN_LARGE = [
  '██   ██ ███████ ██      ███████ ██   ██',
  '██   ██ ██      ██      ██      ███  ██',
  '███████ █████   ██      █████   ██ ████',
  '██   ██ ██      ██      ██      ██  ███',
  '██   ██ ███████ ███████ ███████ ██   ██',
];

const HELEN_COMPACT = [
  '█  █  ███  █     ███  █▄ █',
  '████  ██   █     ██   ████',
  '█  █  ███  ████  ███  █ ▀█',
];

const ENEKO_RUIZ_LARGE = [
  '███████ ██   ██ ███████ ██   ██  █████      ██████  ██   ██ ███████ ███████',
  '██      ███  ██ ██      ██  ██  ██   ██    ██   ██ ██   ██   ██       ██ ',
  '█████   ██ ████ █████   █████   ██   ██    ██████  ██   ██   ██      ██  ',
  '██      ██  ███ ██      ██  ██  ██   ██    ██  ██  ██   ██   ██       ██   ',
  '███████ ██   ██ ███████ ██   ██  █████      ██   ██  █████  ███████ ███████',
];

const ENEKO_RUIZ_COMPACT = [
  'E N E K O   R U I Z',
  '─ ─ ─ ─ ─   ─ ─ ─ ─',
];

const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;

type IdentityName = 'helen' | 'eneko-ruiz';
type Layer = 'empty' | 'field' | 'spark' | 'wordmark' | 'attribution';

interface Identity {
  name: IdentityName;
  large: string[];
  compact: string[];
  minimumLargeWidth: number;
  tempo: number;
}

interface Cell {
  glyph: string;
  layer: Layer;
  energy: number;
}

export interface CinematicArtOptions {
  width?: number;
  height?: number;
  color?: boolean;
}

export interface TerminalCapabilities {
  isTTY: boolean;
  reducedMotion?: boolean;
  term?: string;
  ci?: boolean;
}

const IDENTITIES: Record<IdentityName, Identity> = {
  helen: {
    name: 'helen',
    large: HELEN_LARGE,
    compact: HELEN_COMPACT,
    minimumLargeWidth: HELEN_LARGE[0].length + 4,
    tempo: 1,
  },
  'eneko-ruiz': {
    name: 'eneko-ruiz',
    large: ENEKO_RUIZ_LARGE,
    compact: ENEKO_RUIZ_COMPACT,
    minimumLargeWidth: ENEKO_RUIZ_LARGE[0].length + 2,
    tempo: 0.92,
  },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mix(from: readonly number[], to: readonly number[], amount: number): [number, number, number] {
  const t = clamp(amount, 0, 1);
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

function paint(glyph: string, color: readonly number[], enabled: boolean): string {
  if (!enabled || glyph === ' ') return glyph;
  const [r, g, b] = color.map(Math.round);
  return ESC + '38;2;' + r + ';' + g + ';' + b + 'm' + glyph + RESET;
}

function createCanvas(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ glyph: ' ', layer: 'empty' as Layer, energy: 0 })),
  );
}

function put(canvas: Cell[][], x: number, y: number, glyph: string, layer: Layer, energy: number): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[y].length) return;
  const priority: Record<Layer, number> = { empty: 0, field: 1, spark: 2, wordmark: 3, attribution: 4 };
  if (priority[layer] < priority[canvas[y][x].layer]) return;
  canvas[y][x] = { glyph, layer, energy: clamp(energy, 0, 1) };
}

function setBraillePixel(masks: number[][], pixelX: number, pixelY: number): void {
  if (pixelX < 0 || pixelY < 0) return;
  const cellX = Math.floor(pixelX / 2);
  const cellY = Math.floor(pixelY / 4);
  if (cellY >= masks.length || cellX >= masks[cellY].length) return;
  masks[cellY][cellX] |= BRAILLE_BITS[pixelY % 4][pixelX % 2];
}

function drawBrailleStroke(masks: number[][], x: number, y: number, thickness: number): void {
  for (let offset = -thickness; offset <= thickness; offset++) {
    setBraillePixel(masks, x, y + offset);
  }
}

function drawLiquidField(canvas: Cell[][], progress: number, identity: Identity): void {
  const entrance = smoothstep(0.02, 0.19, progress);
  const exit = 1 - smoothstep(0.48, 0.75, progress);
  const opacity = entrance * exit;
  if (opacity <= 0) return;

  const width = canvas[0].length;
  const height = canvas.length;
  const pixelWidth = width * 2;
  const pixelHeight = height * 4;
  const masks = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  const collapse = smoothstep(0.32, 0.66, progress);
  const phase = progress * Math.PI * 3.6 * identity.tempo;

  for (let pixelX = 0; pixelX < pixelWidth; pixelX++) {
    const normalizedX = pixelX / Math.max(1, pixelWidth - 1);
    const edge = Math.pow(Math.sin(normalizedX * Math.PI), 0.62);
    const drift = Math.sin(normalizedX * Math.PI * 2 - phase * 0.3);

    for (let ribbon = 0; ribbon < 3; ribbon++) {
      const spread = (ribbon - 1) * pixelHeight * 0.075 * (1 - collapse);
      const amplitude = pixelHeight * (0.1 + ribbon * 0.025) * edge * (1 - collapse * 0.72);
      const frequency = 2.7 + ribbon * 0.51;
      const wave = Math.sin(normalizedX * Math.PI * frequency + phase + ribbon * 1.9) * amplitude;
      const y = Math.round(pixelHeight / 2 + spread + wave + drift * pixelHeight * 0.032);
      drawBrailleStroke(masks, pixelX, y, ribbon === 1 && progress > 0.18 ? 1 : 0);
    }
  }

  const ring = smoothstep(0.04, 0.3, progress) * (1 - smoothstep(0.34, 0.55, progress));
  if (ring > 0) {
    for (let degrees = 0; degrees < 360; degrees += 2) {
      const angle = degrees * Math.PI / 180;
      setBraillePixel(
        masks,
        Math.round(pixelWidth / 2 + Math.cos(angle) * pixelWidth * 0.23 * ring),
        Math.round(pixelHeight / 2 + Math.sin(angle) * pixelHeight * 0.27 * ring),
      );
    }
  }

  masks.forEach((row, y) => row.forEach((mask, x) => {
    if (mask === 0) return;
    const centerDistance = Math.abs(x - width / 2) / Math.max(1, width / 2);
    put(canvas, x, y, String.fromCodePoint(0x2800 + mask), 'field', opacity * (1 - centerDistance * 0.35));
  }));
}

function drawSingularity(canvas: Cell[][], progress: number): void {
  if (progress > 0.46) return;
  const centerX = Math.floor(canvas[0].length / 2);
  const centerY = Math.floor(canvas.length / 2);
  const glyph = progress < 0.09 ? '·' : progress < 0.22 ? '◦' : progress < 0.36 ? '◇' : '◆';
  const energy = smoothstep(0, 0.1, progress) * (1 - smoothstep(0.34, 0.46, progress));
  put(canvas, centerX, centerY, glyph, 'spark', energy);
}

function drawWordmark(canvas: Cell[][], progress: number, identity: Identity): void {
  if (progress < 0.29) return;
  const width = canvas[0].length;
  const height = canvas.length;
  const wordmark = width >= identity.minimumLargeWidth ? identity.large : identity.compact;
  const logoWidth = Math.max(...wordmark.map(line => line.length));
  const left = Math.max(0, Math.floor((width - logoWidth) / 2));
  const top = Math.max(1, Math.floor((height - wordmark.length) / 2));
  const reveal = easeInOutCubic(clamp((progress - 0.29) / 0.54, 0, 1));
  const revealX = reveal * (logoWidth + 10) - 5;

  wordmark.forEach((line, y) => Array.from(line).forEach((character, x) => {
    if (character === ' ') return;
    const distance = revealX - x - Math.sin(y * 1.35 + x * 0.21) * 2;
    if (distance < -2) return;

    if (distance < -0.2) put(canvas, left + x, top + y, '·', 'wordmark', 0.25);
    else if (distance < 1.15) put(canvas, left + x, top + y, '░', 'wordmark', 0.5);
    else if (distance < 2.5) put(canvas, left + x, top + y, '▒', 'wordmark', 0.8);
    else if (distance < 4) put(canvas, left + x, top + y, '▓', 'wordmark', 1);
    else put(canvas, left + x, top + y, character, 'wordmark', 0.78);
  }));
}

function drawAttribution(canvas: Cell[][], progress: number, identity: Identity): void {
  if (identity.name !== 'helen' || progress < 0.78) return;

  const width = canvas[0].length;
  const height = canvas.length;
  const wordmark = width >= identity.minimumLargeWidth ? identity.large : identity.compact;
  const top = Math.max(1, Math.floor((height - wordmark.length) / 2));
  const y = top + wordmark.length + 1;
  if (y >= height) return;

  const preferred = 'B Y   E N E K O   R U I Z';
  const label = width >= preferred.length + 2 ? preferred : 'BY ENEKO RUIZ';
  const left = Math.max(0, Math.floor((width - label.length) / 2));
  const reveal = smoothstep(0.78, 0.94, progress) * (label.length + 3);

  Array.from(label).forEach((glyph, x) => {
    if (glyph === ' ' || x > reveal) return;
    const edge = reveal - x;
    put(canvas, left + x, y, edge < 1.5 ? '·' : glyph, 'attribution', edge < 1.5 ? 0.3 : 0.72);
  });
}
function colorize(canvas: Cell[][], progress: number, color: boolean): string {
  const width = canvas[0].length;
  const revealSweep = easeInOutCubic(clamp((progress - 0.26) / 0.56, 0, 1)) * (width + 14) - 7;
  const signatureSweep = easeInOutCubic(clamp((progress - 0.73) / 0.19, 0, 1)) * (width + 18) - 9;
  const titanium = [245, 245, 247] as const;
  const graphite = [65, 69, 79] as const;
  const silver = [164, 170, 184] as const;
  const blue = [104, 157, 255] as const;
  const violet = [153, 136, 255] as const;

  return canvas.map(row => row.map((cell, x) => {
    if (cell.layer === 'empty') return ' ';
    if (cell.layer === 'field') {
      const spectralPosition = (x / Math.max(1, width - 1) + progress * 0.34) % 1;
      const spectral = spectralPosition < 0.5
        ? mix(graphite, blue, spectralPosition * 2)
        : mix(blue, violet, (spectralPosition - 0.5) * 2);
      return paint(cell.glyph, mix(graphite, spectral, cell.energy * 0.6), color);
    }
    if (cell.layer === 'spark') return paint(cell.glyph, mix(blue, titanium, cell.energy), color);
    if (cell.layer === 'attribution') return paint(cell.glyph, mix(graphite, silver, cell.energy), color);
    if (progress >= 0.94) return paint(cell.glyph, titanium, color);

    const revealDistance = Math.abs(x - revealSweep);
    const signatureDistance = Math.abs(x - signatureSweep);
    if (signatureDistance < 2.4) return paint(cell.glyph, titanium, color);
    if (signatureDistance < 7) return paint(cell.glyph, mix(blue, violet, signatureDistance / 7), color);
    if (revealDistance < 3) return paint(cell.glyph, blue, color);
    if (revealDistance < 10) return paint(cell.glyph, mix(titanium, silver, revealDistance / 10), color);
    return paint(cell.glyph, mix(graphite, silver, cell.energy), color);
  }).join('').replace(/\s+$/, '')).join('\n');
}

export function shouldAnimateCinematicArt(capabilities: TerminalCapabilities): boolean {
  return capabilities.isTTY
    && !capabilities.reducedMotion
    && !capabilities.ci
    && capabilities.term !== 'dumb';
}

export function renderCinematicFrame(
  identityName: IdentityName,
  progress: number,
  options: CinematicArtOptions = {},
): string {
  const identity = IDENTITIES[identityName];
  const width = clamp(options.width ?? 80, 20, 120);
  const height = clamp(options.height ?? 18, 7, 26);
  const canvas = createCanvas(width, height);

  drawLiquidField(canvas, progress, identity);
  drawSingularity(canvas, progress);
  drawWordmark(canvas, progress, identity);
  drawAttribution(canvas, progress, identity);
  return colorize(canvas, progress, options.color ?? true);
}

export function renderHelenWordmark(options: CinematicArtOptions = {}): string {
  return renderCinematicFrame('helen', 1, options);
}

export function renderEnekoRuizWordmark(options: CinematicArtOptions = {}): string {
  return renderCinematicFrame('eneko-ruiz', 1, options);
}

const sleep = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds));

function reducedMotionRequested(): boolean {
  const value = process.env.HELEN_MOTION?.toLowerCase();
  return value === 'reduce' || value === 'off';
}

async function runIdentity(identity: IdentityName): Promise<void> {
  const width = clamp(process.stdout.columns ?? 80, 20, 120);
  const height = clamp((process.stdout.rows ?? 22) - 1, 7, 26);
  const color = process.env.NO_COLOR === undefined;
  const animate = shouldAnimateCinematicArt({
    isTTY: Boolean(process.stdout.isTTY),
    reducedMotion: reducedMotionRequested(),
    term: process.env.TERM,
    ci: Boolean(process.env.CI),
  });

  if (!animate) {
    console.log(renderCinematicFrame(identity, 1, { width, height: Math.min(height, 14), color }));
    return;
  }

  const frameCount = identity === 'eneko-ruiz' ? 116 : 108;
  const frameDuration = 28;
  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN);

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      process.stdout.write(ESC + 'H' + CLEAR_BELOW);
      process.stdout.write(renderCinematicFrame(identity, frame / (frameCount - 1), { width, height, color }));
      process.stdout.write(RESET);
      await sleep(frameDuration);
    }
    await sleep(identity === 'eneko-ruiz' ? 1050 : 850);
    process.stdout.write('\n');
  } finally {
    process.stdout.write(SHOW_CURSOR);
  }
}

export async function runHelenArt(): Promise<void> {
  await runIdentity('helen');
}

export async function runEnekoRuizArt(): Promise<void> {
  await runIdentity('eneko-ruiz');
}

