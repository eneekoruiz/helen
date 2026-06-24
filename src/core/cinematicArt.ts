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

const HELEN_ASCII = [
  'H   H  EEEEE  L      EEEEE  N   N',
  'H   H  E      L      E      NN  N',
  'HHHHH  EEEE   L      EEEE   N N N',
  'H   H  E      L      E      N  NN',
  'H   H  EEEEE  LLLLL  EEEEE  N   N',
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

const ENEKO_RUIZ_ASCII = [
  'ENEKO RUIZ',
  '----------',
];

const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;

type IdentityName = 'helen' | 'eneko-ruiz';
type Layer = 'empty' | 'halo' | 'field' | 'frame' | 'spark' | 'wordmark' | 'attribution';

interface Identity {
  name: IdentityName;
  large: string[];
  compact: string[];
  ascii: string[];
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
  ascii?: boolean;
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
    ascii: HELEN_ASCII,
    minimumLargeWidth: HELEN_LARGE[0].length + 4,
    tempo: 1,
  },
  'eneko-ruiz': {
    name: 'eneko-ruiz',
    large: ENEKO_RUIZ_LARGE,
    compact: ENEKO_RUIZ_COMPACT,
    ascii: ENEKO_RUIZ_ASCII,
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
  const priority: Record<Layer, number> = {
    empty: 0,
    halo: 1,
    field: 2,       // 3D background elements (depth > 0)
    frame: 3,       // editorial borders
    wordmark: 4,    // name/identity wordmark
    spark: 5,       // 3D foreground elements (depth <= 0) & particles
    attribution: 6, // Eneko Ruiz subtext attribution
  };
  if (priority[layer] < priority[canvas[y][x].layer]) return;
  canvas[y][x] = { glyph, layer, energy: clamp(energy, 0, 1) };
}

function drawInterferenceHalo(canvas: Cell[][], progress: number, identity: Identity, ascii: boolean): void {
  const presence = smoothstep(0.08, 0.28, progress) * (1 - smoothstep(0.82, 1, progress) * 0.35);
  if (presence <= 0) return;

  const width = canvas[0].length;
  const height = canvas.length;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const aspect = width / Math.max(1, height);
  const glyphs = ascii ? ['.', ':', '+', '*', '*'] as const : ['.', '·', '∴', '∷', '∙'] as const;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const dx = (x - cx) / Math.max(1, width * 0.46);
      const dy = (y - cy) / Math.max(1, height * 0.42) * aspect;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const ring = 1 - Math.abs(radius - (0.74 - progress * 0.16)) * 5.2;
      const noise = Math.sin(x * 0.42 + y * 0.77 + progress * 18 * identity.tempo);
      const glint = Math.sin((x - y) * 0.19 - progress * 14);
      const energy = clamp((ring * 0.55 + noise * 0.18 + glint * 0.1) * presence, 0, 0.72);
      if (energy < 0.24) continue;
      put(canvas, x, y, glyphs[Math.min(glyphs.length - 1, Math.floor(energy * glyphs.length))], 'halo', energy);
    }
  }
}



function drawLiquidField(canvas: Cell[][], progress: number, identity: Identity, ascii: boolean): void {
  const entrance = smoothstep(0.02, 0.19, progress);
  const exit = 1 - smoothstep(0.48, 0.75, progress);
  const opacity = entrance * exit;
  if (opacity <= 0) return;

  const width = canvas[0].length;
  const height = canvas.length;

  const pixelWidth = width * 2;
  const pixelHeight = height * 4;

  const cx = pixelWidth / 2;
  const cy = pixelHeight / 2;

  // responsive 3D sphere radius matching character aspect ratios
  const maxRy = pixelHeight * 0.44;
  const maxRx = pixelWidth * 0.44;
  const radius = Math.min(maxRx, maxRy);
  const rx = radius;
  const ry = radius;

  const D = 1.8; // Camera depth distance for 3D perspective projection

  // Separate z-sorted Braille subpixel grids
  const masksBack = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  const masksFront = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));

  function projectAndPlot(xL: number, yL: number, zL: number, rotX: number, rotY: number, rotZ: number, energyMult: number, isParticle = false) {
    // 3D rotation X
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const x1 = xL;
    const y1 = yL * cosX - zL * sinX;
    const z1 = yL * sinX + zL * cosX;

    // 3D rotation Y
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x2 = x1 * cosY + z1 * sinY;
    const y2 = y1;
    const z2 = -x1 * sinY + z1 * cosY;

    // 3D rotation Z
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
    const x3 = x2 * cosZ - y2 * sinZ;
    const y3 = x2 * sinZ + y2 * cosZ;
    const z3 = z2;

    // Perspective Projection
    const denom = D - z3;
    const px = cx + (x3 * rx) / denom;
    const py = cy + (y3 * ry) / denom;

    const cellX = Math.round(px / 2);
    const cellY = Math.round(py / 4);

    if (ascii) {
      if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
        const glyph = isParticle
          ? (z3 < -0.3 ? '*' : (z3 > 0.3 ? '.' : 'x'))
          : (z3 < -0.3 ? 'O' : (z3 > 0.3 ? '.' : 'o'));
        const layer = z3 > 0.0 ? 'field' : 'spark';
        put(canvas, cellX, cellY, glyph, layer, opacity * energyMult);
      }
    } else {
      const pixelX = Math.round(px);
      const pixelY = Math.round(py);
      const gridX = Math.floor(pixelX / 2);
      const gridY = Math.floor(pixelY / 4);

      if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
        if (z3 > 0.0) {
          masksBack[gridY][gridX] |= BRAILLE_BITS[pixelY % 4][pixelX % 2];
        } else {
          masksFront[gridY][gridX] |= BRAILLE_BITS[pixelY % 4][pixelX % 2];
        }
      }
    }
  }

  // 1. Draw Ring 1 (X-Y plane, rotating fast, inclined)
  const rotY1 = progress * Math.PI * 2.8 * identity.tempo;
  const rotX1 = Math.PI / 5;
  const rotZ1 = progress * Math.PI * 0.35;
  const pointsCount = 140;
  for (let i = 0; i < pointsCount; i++) {
    const theta = (i / pointsCount) * Math.PI * 2;
    projectAndPlot(Math.cos(theta), Math.sin(theta), 0, rotX1, rotY1, rotZ1, 0.85);
  }

  // 2. Draw Ring 2 (X-Z plane, rotating in opposite direction, inclined)
  const rotX2 = -progress * Math.PI * 2.4 * identity.tempo;
  const rotY2 = -Math.PI / 4;
  const rotZ2 = -progress * Math.PI * 0.25;
  for (let i = 0; i < pointsCount; i++) {
    const theta = (i / pointsCount) * Math.PI * 2;
    projectAndPlot(Math.cos(theta), 0, Math.sin(theta), rotX2, rotY2, rotZ2, 0.85);
  }

  // 3. Draw Ring 3 (Y-Z plane, slow dynamic orbit)
  const rotZ3 = progress * Math.PI * 1.6 * identity.tempo;
  const rotX3 = Math.PI / 3;
  const rotY3 = -progress * Math.PI * 0.6;
  for (let i = 0; i < pointsCount; i++) {
    const theta = (i / pointsCount) * Math.PI * 2;
    projectAndPlot(0, Math.cos(theta), Math.sin(theta), rotX3, rotY3, rotZ3, 0.8);
  }

  // 4. Draw Particle Vortex (particles swirling and collapsing inwards)
  const particleCount = 40;
  for (let p = 0; p < particleCount; p++) {
    const theta = progress * Math.PI * 4.8 + (p / particleCount) * Math.PI * 2.0;
    const swirlRadius = 0.95 * (1 - progress) + 0.08 * Math.sin(progress * 10 + p);
    const pxL = swirlRadius * Math.cos(theta);
    const pyL = swirlRadius * Math.sin(theta);
    const pzL = 0.2 * Math.cos(theta * 2 + p);
    projectAndPlot(pxL, pyL, pzL, progress * 0.6, progress * 0.9, progress * 0.4, 1.0, true);
  }

  // Commit Braille masks to canvas with correct z-sorted layers
  if (!ascii) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (masksBack[y][x] > 0) {
          const char = String.fromCodePoint(0x2800 + masksBack[y][x]);
          put(canvas, x, y, char, 'field', opacity);
        }
        if (masksFront[y][x] > 0) {
          const char = String.fromCodePoint(0x2800 + masksFront[y][x]);
          put(canvas, x, y, char, 'spark', opacity);
        }
      }
    }
  }
}

function drawSingularity(canvas: Cell[][], progress: number, ascii: boolean): void {
  if (progress > 0.46) return;
  const centerX = Math.floor(canvas[0].length / 2);
  const centerY = Math.floor(canvas.length / 2);
  const glyph = ascii
    ? progress < 0.09 ? '.' : progress < 0.22 ? 'o' : progress < 0.36 ? 'x' : '*'
    : progress < 0.09 ? '·' : progress < 0.22 ? '◦' : progress < 0.36 ? '◇' : '◆';
  const energy = smoothstep(0, 0.1, progress) * (1 - smoothstep(0.34, 0.46, progress));
  put(canvas, centerX, centerY, glyph, 'spark', energy);
}

function drawEditorialFrame(canvas: Cell[][], progress: number, identity: Identity, ascii: boolean): void {
  const width = canvas[0].length;
  const height = canvas.length;
  if (width < 48 || height < 11) return;

  const presence = smoothstep(0.46, 0.74, progress);
  if (presence <= 0) return;

  const marginX = width >= 92 ? 6 : 3;
  const top = 1;
  const bottom = height - 2;
  const left = marginX;
  const right = width - marginX - 1;
  const drawLength = Math.floor((right - left) * presence);
  const rail = ascii ? '-' : progress < 0.9 ? '─' : '━';
  const corner = ascii ? '+' : progress < 0.9 ? '╴' : '╸';

  for (let i = 0; i <= drawLength; i++) {
    const x = left + i;
    const edgeEnergy = i > drawLength - 3 ? 0.44 : 0.22;
    put(canvas, x, top, i === drawLength ? corner : rail, 'frame', edgeEnergy);
    put(canvas, right - i, bottom, i === drawLength ? (ascii ? '+' : '╶') : rail, 'frame', edgeEnergy);
  }

  const ticks = identity.name === 'helen'
    ? ['SYSTEM', 'COMPOSED', 'READY']
    : ['AUTHOR', 'ENEKO', 'RUIZ'];
  const caption = ` ${ticks.join('  /  ')} `;
  if (caption.length + 2 < right - left && progress > 0.66) {
    const captionLeft = Math.floor((width - caption.length) / 2);
    Array.from(caption).forEach((glyph, index) => {
      if (glyph === ' ') return;
      put(canvas, captionLeft + index, top, glyph, 'frame', 0.5);
    });
  }
}

function drawWordmark(canvas: Cell[][], progress: number, identity: Identity, ascii: boolean): void {
  if (progress < 0.29) return;
  const width = canvas[0].length;
  const height = canvas.length;
  const wordmark = ascii ? identity.ascii : width >= identity.minimumLargeWidth ? identity.large : identity.compact;
  const logoWidth = Math.max(...wordmark.map(line => line.length));
  const left = Math.max(0, Math.floor((width - logoWidth) / 2));
  const top = Math.max(1, Math.floor((height - wordmark.length) / 2));
  const reveal = easeInOutCubic(clamp((progress - 0.29) / 0.54, 0, 1));
  const revealX = reveal * (logoWidth + 10) - 5;

  wordmark.forEach((line, y) => Array.from(line).forEach((character, x) => {
    if (character === ' ') return;
    const distance = revealX - x - Math.sin(y * 1.35 + x * 0.21) * 2;
    if (distance < -2) return;

    if (distance < -0.2) put(canvas, left + x, top + y, ascii ? '.' : '·', 'wordmark', 0.25);
    else if (distance < 1.15) put(canvas, left + x, top + y, ascii ? ':' : '░', 'wordmark', 0.5);
    else if (distance < 2.5) put(canvas, left + x, top + y, ascii ? '+' : '▒', 'wordmark', 0.8);
    else if (distance < 4) put(canvas, left + x, top + y, ascii ? '#' : '▓', 'wordmark', 1);
    else put(canvas, left + x, top + y, character, 'wordmark', 0.78);
  }));
}

function drawAttribution(canvas: Cell[][], progress: number, identity: Identity, ascii: boolean): void {
  if (identity.name !== 'helen' || progress < 0.78) return;

  const width = canvas[0].length;
  const height = canvas.length;
  const wordmark = ascii ? identity.ascii : width >= identity.minimumLargeWidth ? identity.large : identity.compact;
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
    put(canvas, left + x, y, edge < 1.5 ? (ascii ? '.' : '·') : glyph, 'attribution', edge < 1.5 ? 0.3 : 0.72);
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
  const ember = [255, 196, 126] as const;

  return canvas.map(row => row.map((cell, x) => {
    if (cell.layer === 'empty') return ' ';
    if (cell.layer === 'halo') {
      const tint = Math.sin(x * 0.08 + progress * 4) > 0
        ? mix(graphite, violet, cell.energy * 0.42)
        : mix(graphite, blue, cell.energy * 0.46);
      return paint(cell.glyph, tint, color);
    }
    if (cell.layer === 'field') {
      const spectralPosition = (x / Math.max(1, width - 1) + progress * 0.34) % 1;
      const spectral = spectralPosition < 0.5
        ? mix(graphite, blue, spectralPosition * 2)
        : mix(blue, violet, (spectralPosition - 0.5) * 2);
      return paint(cell.glyph, mix(graphite, spectral, cell.energy * 0.6), color);
    }
    if (cell.layer === 'spark') return paint(cell.glyph, mix(blue, titanium, cell.energy), color);
    if (cell.layer === 'frame') return paint(cell.glyph, mix(graphite, ember, cell.energy * 0.72), color);
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
  const ascii = options.ascii ?? false;
  const canvas = createCanvas(width, height);

  drawInterferenceHalo(canvas, progress, identity, ascii);
  drawLiquidField(canvas, progress, identity, ascii);
  drawSingularity(canvas, progress, ascii);
  drawWordmark(canvas, progress, identity, ascii);
  drawAttribution(canvas, progress, identity, ascii);
  drawEditorialFrame(canvas, progress, identity, ascii);
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

export function shouldUseAsciiArt(): boolean {
  if (process.env.HELEN_ASCII === '1') return true;
  if (process.env.HELEN_ASCII === '0') return false;
  if (process.platform !== 'win32') return false;
  if (process.env.WT_SESSION || process.env.TERM_PROGRAM) return false;
  return !/utf-?8/i.test(`${process.env.LANG ?? ''} ${process.env.LC_ALL ?? ''} ${process.env.LC_CTYPE ?? ''}`);
}

async function runIdentity(identity: IdentityName): Promise<void> {
  const width = clamp(process.stdout.columns ?? 80, 20, 120);
  const height = clamp((process.stdout.rows ?? 22) - 1, 7, 26);
  const color = process.env.NO_COLOR === undefined;
  const ascii = shouldUseAsciiArt();
  const animate = shouldAnimateCinematicArt({
    isTTY: Boolean(process.stdout.isTTY),
    reducedMotion: reducedMotionRequested(),
    term: process.env.TERM,
    ci: Boolean(process.env.CI),
  });

  if (!animate) {
    console.log(renderCinematicFrame(identity, 1, { width, height: Math.min(height, 14), color, ascii }));
    return;
  }

  const frameCount = identity === 'eneko-ruiz' ? 116 : 108;
  const frameDuration = 28;
  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN);

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      process.stdout.write(ESC + 'H' + CLEAR_BELOW);
      process.stdout.write(renderCinematicFrame(identity, frame / (frameCount - 1), { width, height, color, ascii }));
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

