// ═══════════════════════════════════════════════════════════════════════════
// cinematicArt.ts — Premium terminal identity system
//
// Rendering pipeline:
//   1. Fractal Brownian Motion atmospheric nebula
//   2. Volumetric god rays (genesis starburst)
//   3. Organic flowing ribbon — noise-deformed trefoil torus knot
//      • fBm-displaced vertices for fluid organic undulation
//      • Dual-axis rotation with gentle wobble (incommensurate freq.)
//      • Continuous gradient comet-tail (not discrete trail copies)
//      • Variable tube radius with breathing modulation
//      • Per-subpixel Braille z-buffering for proper occlusion
//   4. Bloom post-processing (Gaussian diffusion)
//   5. Protected typography layer (wordmark, attribution, frame)
//   6. Iridescent depth-shaded colorizer with:
//      • Holographic color gradient mapped to surface depth
//      • Chromatic aberration at screen edges
//      • Cinematic anamorphic vignette
//      • Bloom glow integration for empty cells
//
// Design: Apple WWDC keynote meets high-end type design.
// ═══════════════════════════════════════════════════════════════════════════

const ESC = '\x1b[';
const RESET = ESC + '0m';
const HIDE_CURSOR = ESC + '?25l';
const SHOW_CURSOR = ESC + '?25h';
const CLEAR_SCREEN = ESC + '2J' + ESC + 'H';
const CLEAR_BELOW = ESC + 'J';

// ───── Pixel-exact aligned wordmarks ─────

const HELEN_LARGE = [
  '██   ██  ███████  ██       ███████  ██    ██',
  '██   ██  ██       ██       ██       ███   ██',
  '███████  █████    ██       █████    ██ █  ██',
  '██   ██  ██       ██       ██       ██  █ ██',
  '██   ██  ███████  ███████  ███████  ██   ███',
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
  '███████  ██    ██  ███████  ██   ██   █████      ██████   ██   ██  ██  ███████',
  '██       ███   ██  ██       ██  ██   ██   ██     ██   ██  ██   ██  ██     ██  ',
  '█████    ██ █  ██  █████    █████    ██   ██     ██████   ██   ██  ██    ██   ',
  '██       ██  █ ██  ██       ██  ██   ██   ██     ██  ██   ██   ██  ██   ██    ',
  '███████  ██   ███  ███████  ██   ██   █████      ██   ██   █████   ██  ███████',
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

// Subpixel index: (row, col) → flat index 0-7 for z-buffer addressing
const BRAILLE_SUB = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
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
  depth: number; // z-depth for 3D shading (Infinity = non-3D)
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

// ═══════════════════════════════════════════════════════════════
// §1  Math Utilities
// ═══════════════════════════════════════════════════════════════

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

function lerpVec(
  from: readonly number[],
  to: readonly number[],
  amount: number,
): [number, number, number] {
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

// ═══════════════════════════════════════════════════════════════
// §2  Noise — Fractal Brownian Motion
// ═══════════════════════════════════════════════════════════════

/** Deterministic hash for value noise (sin-trick, GPU shader classic). */
function hash21(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Quintic-interpolated value noise — smoother than Perlin at similar cost. */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  // Quintic smoothstep (Ken Perlin's improved interpolant)
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash21(ix, iy), b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1), d = hash21(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Multi-octave fBm for organic, cloud-like patterns. */
function fbm(x: number, y: number, octaves: number): number {
  let value = 0, amplitude = 0.5, frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// ═══════════════════════════════════════════════════════════════
// §3  Canvas & Layer System
// ═══════════════════════════════════════════════════════════════

function createCanvas(w: number, h: number): Cell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, (): Cell => ({
      glyph: ' ', layer: 'empty', energy: 0, depth: Infinity,
    })),
  );
}

/** Priority-aware cell writer. Wordmark is sacrosanct (priority 6). */
function put(
  canvas: Cell[][], x: number, y: number,
  glyph: string, layer: Layer, energy: number, depth = Infinity,
): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[y].length) return;
  const priority: Record<Layer, number> = {
    empty: 0, halo: 1, field: 2, frame: 3,
    spark: 4, attribution: 5, wordmark: 6,
  };
  if (priority[layer] < priority[canvas[y][x].layer]) return;
  canvas[y][x] = { glyph, layer, energy: clamp(energy, 0, 1), depth };
}

// ═══════════════════════════════════════════════════════════════
// §4  Atmospheric Nebula (fBm noise field)
// ═══════════════════════════════════════════════════════════════

function drawAtmosphere(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  const presence = smoothstep(0.03, 0.14, progress) * (1 - smoothstep(0.40, 0.62, progress));
  if (presence <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const cx = W / 2, cy = H / 2;
  const time = progress * identity.tempo * 2;
  const glyphs = ascii
    ? ['.', ':', '+', '*'] as const
    : ['·', '∙', '∴', '∷'] as const;

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const noise = fbm(x * 0.06 + time * 0.3, y * 0.09 + time * 0.2, 3);
      const ring = smoothstep(0.2, 0.55, dist) * smoothstep(1.2, 0.65, dist);
      const energy = clamp(ring * noise * presence * 1.3, 0, 0.55);
      if (energy < 0.12) continue;
      const gi = Math.min(glyphs.length - 1, Math.floor(energy * glyphs.length * 1.5));
      put(canvas, x, y, glyphs[gi], 'halo', energy);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §5  Volumetric God Rays (opening starburst)
// ═══════════════════════════════════════════════════════════════

function drawGodRays(canvas: Cell[][], progress: number, ascii: boolean): void {
  const presence = smoothstep(0.01, 0.06, progress) * (1 - smoothstep(0.12, 0.22, progress));
  if (presence <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  const aspect = 2.0; // terminal char aspect ≈ 2:1
  const numRays = 16;
  const maxLen = Math.min(W * 0.4, H * 0.7);
  const glyphs = ascii ? ['.', '+', '*'] as const : ['·', '∙', '∷'] as const;

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2
      + progress * Math.PI * 0.4
      + Math.sin(i * 1.618) * 0.3;
    const len = maxLen * (0.4 + 0.6 * (Math.sin(i * 2.618 + progress * 8) * 0.5 + 0.5));

    for (let r = 1; r < len; r += 0.7) {
      const rx = cx + r * Math.cos(angle) / aspect;
      const ry = cy + r * Math.sin(angle);
      const energy = presence * (1 - r / len) * 0.6;
      if (energy < 0.08) continue;
      const gi = energy > 0.3 ? 2 : energy > 0.15 ? 1 : 0;
      put(canvas, Math.round(rx), Math.round(ry), glyphs[gi], 'halo', energy);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §6  Singularity (opening point of light)
// ═══════════════════════════════════════════════════════════════

function drawSingularity(canvas: Cell[][], progress: number, ascii: boolean): void {
  if (progress > 0.32) return;
  const centerX = Math.floor(canvas[0].length / 2);
  const centerY = Math.floor(canvas.length / 2);
  const glyph = ascii
    ? (progress < 0.05 ? '.' : progress < 0.14 ? 'o' : progress < 0.24 ? 'x' : '*')
    : (progress < 0.05 ? '·' : progress < 0.14 ? '◦' : progress < 0.24 ? '◇' : '◆');
  const energy = smoothstep(0, 0.06, progress) * (1 - smoothstep(0.22, 0.32, progress));
  put(canvas, centerX, centerY, glyph, 'spark', energy);
}

// ═══════════════════════════════════════════════════════════════
// §7  Organic Flowing Ribbon
//     Noise-deformed parametric curve with volumetric tube,
//     dual-axis smooth rotation, continuous gradient trails,
//     and surface-normal fBm perturbation for a natural feel.
// ═══════════════════════════════════════════════════════════════

function drawFlowingRibbon(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  // Smooth lifecycle: gentle fade-in and dissolve-out, no hard cuts
  const entrance = smoothstep(0.02, 0.20, progress);
  const exit     = 1 - smoothstep(0.38, 0.62, progress);
  const opacity  = entrance * exit;
  if (opacity <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const pixW = W * 2, pixH = H * 4;           // Braille sub-pixel canvas
  const pcx = pixW / 2, pcy = pixH / 2;
  const scale = Math.min(pixW, pixH) * 0.40;
  const D = 2.6;                               // perspective focal length

  const TWO_PI = Math.PI * 2;

  // ── Per-subpixel z-buffer for proper depth occlusion ──
  const masks = Array.from({ length: H }, () => new Int32Array(W));
  const subZ  = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => new Float64Array(8).fill(Infinity)),
  );
  const cellZ = Array.from({ length: H }, () => new Float64Array(W).fill(Infinity));

  // ── Dual-axis rotation with gentle organic wobble ──
  //    Uses incommensurate frequencies so the motion never repeats exactly.
  const time       = progress * identity.tempo;
  const rotY       = time * Math.PI * 2.2;                                      // primary spin
  const rotX       = Math.PI / 6 + Math.sin(time * 1.7) * 0.12;                // tilt with breathing
  const rotZ       = Math.sin(time * 2.3 + 0.4) * 0.08;                        // subtle roll
  const breathe    = 1 + Math.sin(time * Math.PI * 3.4) * 0.04 * entrance;     // organic scale pulse

  // Pre-compute trig for rotation matrices
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

  function project(
    xL: number, yL: number, zL: number,
  ): { px: number; py: number; z3: number } | null {
    // Apply breathing scale
    let x0 = xL * breathe, y0 = yL * breathe, z0 = zL * breathe;

    // Rotation Z (roll)
    let x1 = x0 * cosZ - y0 * sinZ;
    let y1 = x0 * sinZ + y0 * cosZ;
    const z1 = z0;

    // Rotation Y (spin)
    const x2 = x1 * cosY + z1 * sinY;
    const z2 = -x1 * sinY + z1 * cosY;

    // Rotation X (tilt)
    const y3 = y1 * cosX - z2 * sinX;
    const z3 = y1 * sinX + z2 * cosX;

    // Perspective divide
    const denom = D - z3;
    if (denom <= 0.05) return null;
    return { px: pcx + (x2 * scale) / denom, py: pcy + (y3 * scale) / denom, z3 };
  }

  function plotBraille(px: number, py: number, z: number): void {
    const ipx = Math.round(px), ipy = Math.round(py);
    const gx = Math.floor(ipx / 2), gy = Math.floor(ipy / 4);
    if (gx < 0 || gx >= W || gy < 0 || gy >= H) return;
    const sr = ((ipy % 4) + 4) % 4;
    const sc = ((ipx % 2) + 2) % 2;
    const si = BRAILLE_SUB[sr][sc];
    if (z < subZ[gy][gx][si]) {
      subZ[gy][gx][si] = z;
      masks[gy][gx] |= BRAILLE_BITS[sr][sc];
      if (z < cellZ[gy][gx]) cellZ[gy][gx] = z;
    }
  }

  function plotAscii(px: number, py: number, z: number): void {
    const cx2 = Math.round(px / 2), cy2 = Math.round(py / 4);
    if (cx2 < 0 || cx2 >= W || cy2 < 0 || cy2 >= H) return;
    const brightness = clamp(1 - (z + 1) / 2, 0, 1);
    const g = brightness > 0.7 ? '@' : brightness > 0.5 ? '#' : brightness > 0.3 ? 'o' : '.';
    const layer: Layer = z > 0 ? 'field' : 'spark';
    put(canvas, cx2, cy2, g, layer, opacity * brightness, z);
  }

  // ── Parametric curve: noise-deformed torus knot (p=2, q=3) ──
  //    The base shape is a trefoil but every vertex is displaced
  //    along its surface normal by fBm noise, creating organic
  //    undulation that evolves with time — like ink dissolving in water.
  const P = 2, Q = 3;
  const R = 0.58;          // major radius
  const r = 0.24;          // minor radius
  const tubeR = 0.065;     // tube cross-section radius
  const sampleCount = 600; // high density for smooth curves
  const tubeSeg = 8;       // tube cross-section resolution

  // Noise displacement intensity scales with lifecycle
  const noiseAmp  = 0.035 * entrance * (0.6 + 0.4 * exit);
  const noiseTime = time * 1.4;

  // ── Continuous gradient tail ──
  //    Instead of discrete trail copies, we render the primary tube
  //    with a per-vertex opacity that fades to zero over a "tail arc".
  //    This creates a comet-like luminous tail that looks natural.
  const tailArc = TWO_PI * 0.35;   // length of tail (35% of full loop)
  const headT = (time * 1.3) % 1;  // normalised head position [0,1)

  for (let i = 0; i < sampleCount; i++) {
    const tNorm = i / sampleCount;           // normalised [0, 1)
    const t = tNorm * TWO_PI;

    // ── Gradient tail opacity ──
    //    Distance from the head position, wrapped circularly.
    const dist = ((tNorm - headT) % 1 + 1) % 1;  // 0 = at head, 1 = full loop behind
    const tailFade = dist < (tailArc / TWO_PI)
      ? smoothstep(tailArc / TWO_PI, 0, dist)     // bright at head, fading behind
      : 0.22 + 0.12 * Math.sin(t * 5 + time * 3); // dim ambient glow on the rest

    // ── Base knot centerline ──
    const cosQt = Math.cos(Q * t), sinQt = Math.sin(Q * t);
    const cosPt = Math.cos(P * t), sinPt = Math.sin(P * t);
    let kx = (R + r * cosQt) * cosPt;
    let ky = (R + r * cosQt) * sinPt;
    let kz = r * sinQt;

    // ── Organic noise displacement along radial direction ──
    //    Uses fBm seeded by curve parameter + time for flowing motion.
    const noiseVal = fbm(t * 2.5 + noiseTime, tNorm * 4 + noiseTime * 0.7, 3) - 0.5;
    const radialLen = Math.sqrt(kx * kx + ky * ky) || 1;
    kx += (kx / radialLen) * noiseVal * noiseAmp;
    ky += (ky / radialLen) * noiseVal * noiseAmp;
    kz += noiseVal * noiseAmp * 0.6;

    // ── Frenet frame for tube cross-section ──
    const dt = 0.004;
    const t2 = t + dt;
    const cosQt2 = Math.cos(Q * t2), sinQt2 = Math.sin(Q * t2);
    const cosPt2 = Math.cos(P * t2), sinPt2 = Math.sin(P * t2);
    let fkx2 = (R + r * cosQt2) * cosPt2;
    let fky2 = (R + r * cosQt2) * sinPt2;
    let fkz2 = r * sinQt2;
    // Apply matching noise to the forward sample for consistent tangent
    const nv2 = fbm((t + dt) * 2.5 + noiseTime, ((i + 1) / sampleCount) * 4 + noiseTime * 0.7, 3) - 0.5;
    const rl2 = Math.sqrt(fkx2 * fkx2 + fky2 * fky2) || 1;
    fkx2 += (fkx2 / rl2) * nv2 * noiseAmp;
    fky2 += (fky2 / rl2) * nv2 * noiseAmp;
    fkz2 += nv2 * noiseAmp * 0.6;

    // Tangent vector
    let tx = fkx2 - kx, ty = fky2 - ky, tz = fkz2 - kz;
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    tx /= tLen; ty /= tLen; tz /= tLen;

    // Binormal = tangent × (0, 0, 1), with fallback
    let bx = ty, by = -tx, bz = 0;
    let bLen = Math.sqrt(bx * bx + by * by);
    if (bLen < 0.001) { bx = 1; by = 0; bz = 0; bLen = 1; }
    else { bx /= bLen; by /= bLen; }

    // Normal = tangent × binormal
    const nnx = ty * bz - tz * by;
    const nny = tz * bx - tx * bz;
    const nnz = tx * by - ty * bx;

    // ── Render tube cross-section ──
    //    Tube radius breathes gently with noise for organic thickness variation.
    const localTubeR = tubeR * (1 + 0.15 * Math.sin(t * 7 + time * 4));

    for (let s = 0; s < tubeSeg; s++) {
      const a = (s / tubeSeg) * TWO_PI;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ox = kx + localTubeR * (ca * bx + sa * nnx);
      const oy = ky + localTubeR * (ca * by + sa * nny);
      const oz = kz + localTubeR * (ca * bz + sa * nnz);

      const result = project(ox, oy, oz);
      if (!result) continue;

      // Scale energy by tail fade for the comet-trail effect
      if (ascii) {
        const cx2 = Math.round(result.px / 2), cy2 = Math.round(result.py / 4);
        if (cx2 < 0 || cx2 >= W || cy2 < 0 || cy2 >= H) continue;
        const brightness = clamp((1 - (result.z3 + 1) / 2) * tailFade, 0, 1);
        const g = brightness > 0.6 ? '@' : brightness > 0.4 ? '#' : brightness > 0.2 ? 'o' : '.';
        const layer: Layer = result.z3 > 0 ? 'field' : 'spark';
        put(canvas, cx2, cy2, g, layer, opacity * brightness, result.z3);
      } else {
        plotBraille(result.px, result.py, result.z3);
      }
    }
  }

  // ── Commit Braille masks to canvas with depth-based energy + tail fade ──
  if (!ascii) {
    // Global z-range for depth normalisation
    let zMin = Infinity, zMax = -Infinity;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (cellZ[y][x] < Infinity) {
          if (cellZ[y][x] < zMin) zMin = cellZ[y][x];
          if (cellZ[y][x] > zMax) zMax = cellZ[y][x];
        }
    const zRange = Math.max(0.001, zMax - zMin);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (masks[y][x] === 0) continue;
        const braille = String.fromCodePoint(0x2800 + masks[y][x]);
        const nz = (cellZ[y][x] - zMin) / zRange;       // 0 = near, 1 = far
        const depthEnergy = 0.30 + 0.70 * (1 - nz);     // closer = brighter
        const layer: Layer = nz > 0.55 ? 'field' : 'spark';
        put(canvas, x, y, braille, layer, opacity * depthEnergy, cellZ[y][x]);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §8  Bloom Post-Processing (Gaussian diffusion)
// ═══════════════════════════════════════════════════════════════

function computeBloom(canvas: Cell[][], W: number, H: number): Float64Array[] {
  const bloom = Array.from({ length: H }, () => new Float64Array(W));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = canvas[y][x];
      if (c.energy < 0.38 || (c.layer !== 'spark' && c.layer !== 'field')) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= H || nx < 0 || nx >= W || (dx === 0 && dy === 0)) continue;
          const dist = Math.sqrt(dx * dx + dy * dy * 4); // aspect-corrected
          bloom[ny][nx] += c.energy * Math.exp(-dist * 0.8) * 0.1;
        }
      }
    }
  }
  return bloom;
}

// ═══════════════════════════════════════════════════════════════
// §9  Editorial Frame
// ═══════════════════════════════════════════════════════════════

function drawEditorialFrame(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  const W = canvas[0].length, H = canvas.length;
  if (W < 48 || H < 11) return;
  const presence = smoothstep(0.32, 0.58, progress);
  if (presence <= 0) return;

  const mx = W >= 92 ? 6 : 3;
  const top = 1, bottom = H - 2, left = mx, right = W - mx - 1;
  const drawLen = Math.floor((right - left) * presence);
  const rail = ascii ? '-' : progress < 0.9 ? '─' : '━';
  const corner = ascii ? '+' : progress < 0.9 ? '╴' : '╸';

  for (let i = 0; i <= drawLen; i++) {
    const edgeE = i > drawLen - 3 ? 0.44 : 0.22;
    put(canvas, left + i, top, i === drawLen ? corner : rail, 'frame', edgeE);
    put(canvas, right - i, bottom, i === drawLen ? (ascii ? '+' : '╶') : rail, 'frame', edgeE);
  }

  const ticks = identity.name === 'helen'
    ? ['SYSTEM', 'COMPOSED', 'READY']
    : ['AUTHOR', 'ENEKO', 'RUIZ'];
  const caption = ` ${ticks.join('  /  ')} `;
  if (caption.length + 2 < right - left && progress > 0.66) {
    const cl = Math.floor((W - caption.length) / 2);
    Array.from(caption).forEach((g, i) => {
      if (g !== ' ') put(canvas, cl + i, top, g, 'frame', 0.5);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// §10  Wordmark
// ═══════════════════════════════════════════════════════════════

function drawWordmark(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  if (progress < 0.18) return;
  const W = canvas[0].length, H = canvas.length;
  const wm = ascii ? identity.ascii : W >= identity.minimumLargeWidth ? identity.large : identity.compact;
  const logoW = Math.max(...wm.map(l => l.length));
  const left = Math.max(0, Math.floor((W - logoW) / 2));
  const top = Math.max(1, Math.floor((H - wm.length) / 2));
  const reveal = easeInOutCubic(clamp((progress - 0.18) / 0.52, 0, 1));
  const revealX = reveal * (logoW + 10) - 5;

  wm.forEach((line, y) => Array.from(line).forEach((ch, x) => {
    if (ch === ' ') return;
    const d = revealX - x - Math.sin(y * 1.35 + x * 0.21) * 2;
    if (d < -2) return;
    if (d < -0.2)      put(canvas, left + x, top + y, ascii ? '.' : '·', 'wordmark', 0.25);
    else if (d < 1.15) put(canvas, left + x, top + y, ascii ? ':' : '░', 'wordmark', 0.5);
    else if (d < 2.5)  put(canvas, left + x, top + y, ascii ? '+' : '▒', 'wordmark', 0.8);
    else if (d < 4)    put(canvas, left + x, top + y, ascii ? '#' : '▓', 'wordmark', 1);
    else               put(canvas, left + x, top + y, ch, 'wordmark', 0.78);
  }));
}

// ═══════════════════════════════════════════════════════════════
// §11  Attribution
// ═══════════════════════════════════════════════════════════════

function drawAttribution(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  if (identity.name !== 'helen' || progress < 0.62) return;
  const W = canvas[0].length, H = canvas.length;
  const wm = ascii ? identity.ascii : W >= identity.minimumLargeWidth ? identity.large : identity.compact;
  const top = Math.max(1, Math.floor((H - wm.length) / 2));
  const y = top + wm.length + 1;
  if (y >= H) return;

  const preferred = 'B Y   E N E K O   R U I Z';
  const label = W >= preferred.length + 2 ? preferred : 'BY ENEKO RUIZ';
  const left = Math.max(0, Math.floor((W - label.length) / 2));
  const reveal = smoothstep(0.62, 0.82, progress) * (label.length + 3);

  Array.from(label).forEach((g, x) => {
    if (g === ' ' || x > reveal) return;
    const edge = reveal - x;
    put(canvas, left + x, y, edge < 1.5 ? (ascii ? '.' : '·') : g, 'attribution', edge < 1.5 ? 0.3 : 0.72);
  });
}

// ═══════════════════════════════════════════════════════════════
// §12  Iridescent Colorizer
//      with chromatic aberration, vignette, and bloom glow
// ═══════════════════════════════════════════════════════════════

/** Holographic gradient: blue → cyan → violet → magenta → rose → gold → blue */
const IRIDESCENT: readonly (readonly number[])[] = [
  [30, 110, 255],    // electric blue
  [0, 205, 235],     // cyan
  [115, 95, 255],    // violet
  [195, 85, 255],    // magenta
  [255, 150, 190],   // rose
  [255, 200, 115],   // warm gold
  [30, 110, 255],    // loop back to blue
];

function iridescentAt(t: number): [number, number, number] {
  const u = ((t % 1) + 1) % 1;
  const scaled = u * (IRIDESCENT.length - 1);
  const i = Math.floor(scaled);
  return lerpVec(IRIDESCENT[i], IRIDESCENT[Math.min(i + 1, IRIDESCENT.length - 1)], scaled - i);
}

function colorize(
  canvas: Cell[][], bloom: Float64Array[], progress: number, color: boolean,
): string {
  const W = canvas[0].length, H = canvas.length;
  const revealSweep    = easeInOutCubic(clamp((progress - 0.16) / 0.48, 0, 1)) * (W + 14) - 7;
  const signatureSweep = easeInOutCubic(clamp((progress - 0.58) / 0.22, 0, 1)) * (W + 18) - 9;

  // Palette constants
  const titanium = [245, 245, 247] as const;
  const graphite = [50, 55, 68]    as const;
  const silver   = [164, 170, 184] as const;
  const gold     = [255, 210, 80]  as const;
  const ember    = [255, 196, 126] as const;

  return canvas.map((row, y) => row.map((cell, x) => {
    // ── Anamorphic vignette (heavier top/bottom, lighter sides) ──
    const dcx = (x - W / 2) / (W / 2);
    const dcy = (y - H / 2) / (H / 2);
    const vig = 1
      - smoothstep(0.45, 1.3, Math.abs(dcy)) * 0.3
      - smoothstep(0.75, 1.5, Math.abs(dcx)) * 0.12;

    // ── Empty cell: render bloom glow ──
    if (cell.layer === 'empty') {
      const b = bloom[y]?.[x] ?? 0;
      if (b > 0.05 && color) {
        const gc = iridescentAt((x / W + progress * 0.4) % 1);
        return paint('·', [gc[0] * b * vig * 0.55, gc[1] * b * vig * 0.55, gc[2] * b * vig * 0.55], true);
      }
      return ' ';
    }

    // ── Atmospheric nebula ──
    if (cell.layer === 'halo') {
      const sc = iridescentAt((x / W + y / H * 0.5 + progress * 0.3) % 1);
      return paint(cell.glyph, lerpVec(graphite, sc, cell.energy * 0.42 * vig), color);
    }

    // ── 3D torus knot (field = back faces, spark = front faces) ──
    if (cell.layer === 'field' || cell.layer === 'spark') {
      // Iridescent color mapped to screen position + depth
      const depthComponent = cell.depth !== Infinity ? cell.depth * 0.25 : 0;
      const iridT = (x / W * 0.7 + depthComponent + progress * 0.5) % 1;
      const base = iridescentAt(iridT);
      const brightness = cell.energy * vig;

      // Chromatic aberration: R-shift right, B-shift left
      const aber = Math.abs(dcx) * 0.15;
      const cr = base[0] * brightness + (dcx > 0 ? aber * 50 : 0);
      const cg = base[1] * brightness;
      const cb = base[2] * brightness + (dcx < 0 ? aber * 50 : 0);

      // Bloom brightness boost
      const bb = (bloom[y]?.[x] ?? 0) * 0.35;

      return paint(cell.glyph, [
        clamp(cr + bb * base[0], 0, 255),
        clamp(cg + bb * base[1], 0, 255),
        clamp(cb + bb * base[2], 0, 255),
      ], color);
    }

    // ── Frame: warm gold → amber ──
    if (cell.layer === 'frame') {
      const warmth = (x / Math.max(1, W) + progress * 0.25) % 1;
      const fc = warmth < 0.5
        ? lerpVec(graphite, gold, cell.energy * 0.7 * vig)
        : lerpVec(graphite, ember, cell.energy * 0.65 * vig);
      return paint(cell.glyph, fc, color);
    }

    // ── Attribution: silver ──
    if (cell.layer === 'attribution') {
      return paint(cell.glyph, lerpVec(graphite, silver, cell.energy * vig), color);
    }

    // ── Wordmark: multi-stage cinematic reveal ──
    if (progress >= 0.94) return paint(cell.glyph, titanium, color);

    const revealD = Math.abs(x - revealSweep);
    const sigD    = Math.abs(x - signatureSweep);

    // Signature sweep: iridescent leading edge → titanium
    if (sigD < 2.4) return paint(cell.glyph, lerpVec(gold, titanium, 0.8), color);
    if (sigD < 5)   return paint(cell.glyph, iridescentAt((sigD / 5 + progress) % 1), color);
    if (sigD < 9)   return paint(cell.glyph, lerpVec([115, 95, 255], [30, 110, 255], (sigD - 5) / 4), color);

    // Reveal sweep: cyan pulse → titanium
    if (revealD < 3)  return paint(cell.glyph, lerpVec([0, 205, 235], [30, 110, 255], revealD / 3), color);
    if (revealD < 8)  return paint(cell.glyph, lerpVec([30, 110, 255], titanium, (revealD - 3) / 5), color);
    if (revealD < 14) return paint(cell.glyph, lerpVec(titanium, silver, (revealD - 8) / 6), color);
    return paint(cell.glyph, lerpVec(graphite, silver, cell.energy * vig), color);
  }).join('').replace(/\s+$/, '')).join('\n');
}

// ═══════════════════════════════════════════════════════════════
// §13  Render Pipeline
// ═══════════════════════════════════════════════════════════════

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
  const width  = clamp(options.width ?? 80, 20, 120);
  const height = clamp(options.height ?? 18, 7, 26);
  const ascii  = options.ascii ?? false;
  const canvas = createCanvas(width, height);

  // 1. Background
  drawAtmosphere(canvas, progress, identity, ascii);

  // 2. Genesis
  drawGodRays(canvas, progress, ascii);
  drawSingularity(canvas, progress, ascii);

  // 3. Hero 3D element
  drawFlowingRibbon(canvas, progress, identity, ascii);

  // 4. Post-processing (before typography to protect letters)
  const bloom = computeBloom(canvas, width, height);

  // 5. Typography (sacrosanct layer)
  drawWordmark(canvas, progress, identity, ascii);
  drawAttribution(canvas, progress, identity, ascii);
  drawEditorialFrame(canvas, progress, identity, ascii);

  return colorize(canvas, bloom, progress, options.color ?? true);
}

export function renderHelenWordmark(options: CinematicArtOptions = {}): string {
  return renderCinematicFrame('helen', 1, options);
}

export function renderEnekoRuizWordmark(options: CinematicArtOptions = {}): string {
  return renderCinematicFrame('eneko-ruiz', 1, options);
}

// ═══════════════════════════════════════════════════════════════
// §14  Animation Loop
// ═══════════════════════════════════════════════════════════════

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function reducedMotionRequested(): boolean {
  const v = process.env.HELEN_MOTION?.toLowerCase();
  return v === 'reduce' || v === 'off';
}

export function shouldUseAsciiArt(): boolean {
  if (process.env.HELEN_ASCII === '1') return true;
  if (process.env.HELEN_ASCII === '0') return false;
  if (process.platform !== 'win32') return false;
  if (process.env.WT_SESSION || process.env.TERM_PROGRAM) return false;
  return !/utf-?8/i.test(`${process.env.LANG ?? ''} ${process.env.LC_ALL ?? ''} ${process.env.LC_CTYPE ?? ''}`);
}

async function runIdentity(identity: IdentityName): Promise<void> {
  const width  = clamp(process.stdout.columns ?? 80, 20, 120);
  const height = clamp((process.stdout.rows ?? 22) - 1, 7, 26);
  const color  = process.env.NO_COLOR === undefined;
  const ascii  = shouldUseAsciiArt();
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

  const frameCount = identity === 'eneko-ruiz' ? 64 : 58;
  const frameDuration = 24;
  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN);

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      process.stdout.write(ESC + 'H' + CLEAR_BELOW);
      process.stdout.write(renderCinematicFrame(identity, frame / (frameCount - 1), { width, height, color, ascii }));
      process.stdout.write(RESET);
      await sleep(frameDuration);
    }
    await sleep(identity === 'eneko-ruiz' ? 420 : 350);
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
