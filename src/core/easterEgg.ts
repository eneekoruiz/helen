const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;
const CLEAR_SCREEN = `${ESC}2J${ESC}H`;

const LARGE_WORDMARK = [
  '██╗  ██╗███████╗██╗     ███████╗███╗   ██╗',
  '██║  ██║██╔════╝██║     ██╔════╝████╗  ██║',
  '███████║█████╗  ██║     █████╗  ██╔██╗ ██║',
  '██╔══██║██╔══╝  ██║     ██╔══╝  ██║╚██╗██║',
  '██║  ██║███████╗███████╗███████╗██║ ╚████║',
  '╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝',
];

const COMPACT_WORDMARK = [
  '█  █  ███  █     ███  █▄ █',
  '████  ██   █     ██   ████',
  '█  █  ███  ████  ███  █ ▀█',
];

const PARTICLES = [
  [-0.42, -0.28], [-0.31, 0.18], [-0.22, -0.08], [-0.15, 0.32],
  [-0.08, -0.38], [0.02, 0.22], [0.12, -0.18], [0.18, 0.38],
  [0.27, 0.08], [0.34, -0.32], [0.41, 0.24], [-0.38, 0.04],
] as const;

export interface HelenAnimationCapabilities {
  isTTY: boolean;
  reducedMotion?: boolean;
  term?: string;
  ci?: boolean;
}

export interface HelenArtOptions {
  width?: number;
  height?: number;
  color?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function rgb(r: number, g: number, b: number): string {
  return `${ESC}38;2;${r};${g};${b}m`;
}

function tint(text: string, tone: 'quiet' | 'silver' | 'light' | 'blue', enabled: boolean): string {
  if (!enabled || text === ' ') return text;

  const colors = {
    quiet: [82, 86, 96],
    silver: [166, 171, 184],
    light: [245, 245, 247],
    blue: [118, 166, 255],
  } as const;
  const [r, g, b] = colors[tone];
  return `${rgb(r, g, b)}${text}${RESET}`;
}

function createCanvas(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ' '));
}

function put(canvas: string[][], x: number, y: number, character: string): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[y].length) return;
  canvas[y][x] = character;
}

function centeredStart(containerWidth: number, contentWidth: number): number {
  return Math.max(0, Math.floor((containerWidth - contentWidth) / 2));
}

function chooseWordmark(width: number): string[] {
  return width >= LARGE_WORDMARK[0].length + 4 ? LARGE_WORDMARK : COMPACT_WORDMARK;
}

function drawParticles(canvas: string[][], progress: number): void {
  if (progress <= 0 || progress >= 0.58) return;

  const width = canvas[0].length;
  const height = canvas.length;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const convergence = easeInOutCubic(clamp(progress / 0.52, 0, 1));
  const fade = clamp((0.58 - progress) / 0.18, 0, 1);

  PARTICLES.forEach(([offsetX, offsetY], index) => {
    const orbit = (1 - convergence) * Math.sin(progress * 8 + index * 1.7) * 2;
    const x = Math.round(centerX + offsetX * width * (1 - convergence) + orbit);
    const y = Math.round(centerY + offsetY * height * (1 - convergence));
    const glyph = fade > 0.72 ? '·' : fade > 0.34 ? '•' : '∙';
    put(canvas, x, y, glyph);
  });

  if (progress > 0.1 && progress < 0.48) {
    put(canvas, Math.round(centerX), Math.round(centerY), progress < 0.3 ? '•' : '◆');
  }
}

function drawWordmark(canvas: string[][], progress: number): void {
  if (progress < 0.24) return;

  const width = canvas[0].length;
  const height = canvas.length;
  const wordmark = chooseWordmark(width);
  const logoWidth = Math.max(...wordmark.map(line => line.length));
  const startX = centeredStart(width, logoWidth);
  const startY = Math.max(1, Math.floor((height - wordmark.length) / 2));
  const reveal = easeInOutCubic(clamp((progress - 0.24) / 0.62, 0, 1));
  const revealPosition = reveal * (logoWidth + 8) - 4;

  wordmark.forEach((line, y) => {
    Array.from(line).forEach((character, x) => {
      if (character === ' ') return;

      const wave = Math.sin(y * 1.4 + x * 0.24) * 1.7;
      const distance = revealPosition - x - wave;
      if (distance < -1.5) return;

      let glyph = character;
      if (distance < 0) glyph = '·';
      else if (distance < 1.4) glyph = '░';
      else if (distance < 2.7) glyph = '▒';

      put(canvas, startX + x, startY + y, glyph);
    });
  });
}

function colorizeFrame(canvas: string[][], progress: number, color: boolean): string {
  const width = canvas[0].length;
  const sweep = easeInOutCubic(clamp((progress - 0.2) / 0.68, 0, 1)) * width;
  const settled = progress >= 0.9;

  return canvas.map(row => row.map((character, x) => {
    if (character === ' ') return character;
    if ('·•∙'.includes(character)) return tint(character, 'quiet', color);
    if (character === '◆') return tint(character, 'blue', color);
    if (settled) return tint(character, 'light', color);

    const distance = Math.abs(x - sweep);
    if (distance < 3) return tint(character, 'blue', color);
    if (distance < 9) return tint(character, 'light', color);
    return tint(character, 'silver', color);
  }).join('').replace(/\s+$/, '')).join('\n');
}

export function shouldAnimateHelenArt(capabilities: HelenAnimationCapabilities): boolean {
  return capabilities.isTTY
    && !capabilities.reducedMotion
    && !capabilities.ci
    && capabilities.term !== 'dumb';
}

export function renderHelenFrame(progress: number, options: HelenArtOptions = {}): string {
  const width = clamp(options.width ?? 80, 32, 120);
  const height = clamp(options.height ?? 16, 9, 24);
  const canvas = createCanvas(width, height);

  drawParticles(canvas, progress);
  drawWordmark(canvas, progress);

  return colorizeFrame(canvas, progress, options.color ?? true);
}

export function renderHelenWordmark(options: HelenArtOptions = {}): string {
  return renderHelenFrame(1, options);
}

const sleep = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds));

function reducedMotionRequested(): boolean {
  const value = process.env.HELEN_MOTION?.toLowerCase();
  return value === 'reduce' || value === 'off' || process.env.NO_COLOR !== undefined;
}

export async function runEasterEgg(): Promise<void> {
  const width = clamp(process.stdout.columns ?? 80, 32, 120);
  const height = clamp((process.stdout.rows ?? 20) - 1, 9, 24);
  const color = process.env.NO_COLOR === undefined;
  const animate = shouldAnimateHelenArt({
    isTTY: Boolean(process.stdout.isTTY),
    reducedMotion: reducedMotionRequested(),
    term: process.env.TERM,
    ci: Boolean(process.env.CI),
  });

  if (!animate) {
    console.log(renderHelenWordmark({ width, height: Math.min(height, 14), color }));
    return;
  }

  const frameCount = 78;
  const frameDuration = 32;

  process.stdout.write(HIDE_CURSOR);
  process.stdout.write(CLEAR_SCREEN);

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      const progress = frame / (frameCount - 1);
      process.stdout.write(`${ESC}H`);
      process.stdout.write(renderHelenFrame(progress, { width, height, color }));
      process.stdout.write(RESET);
      await sleep(frameDuration);
    }

    await sleep(700);
    process.stdout.write('\n');
  } finally {
    process.stdout.write(SHOW_CURSOR);
  }
}
