// ═══════════════════════════════════════════════════════════════════════════
// cinematicArt.ts — Ultra-premium terminal identity system
//
// 11-stage cinematic compositor:
//   1. Deep parallax star field (3 depth layers with twinkling)
//   2. Domain-warped fBm nebula (organic swirling clouds)
//   3. Genesis sequence: singularity ignition → expanding shockwave
//   4. Phong-lit organic ribbon:
//      • Noise-deformed trefoil torus knot (p=2, q=3)
//      • Blinn-Phong surface shading with orbiting point light
//      • fBm vertex displacement for organic undulation
//      • Continuous gradient comet-tail
//      • Variable breathing tube radius
//      • Per-subpixel Braille z-buffering for proper occlusion
//   5. Orbiting micro-particles (gravitational swarm)
//   6. Anamorphic lens flare (horizontal streak)
//   7. Enhanced bloom (extended Gaussian kernel, radius 3×2)
//   8. Editorial frame (rule lines + status ticks)
//   9. Protected wordmark (sacrosanct typography layer)
//  10. Attribution signature
//  11. Iridescent depth-shaded colorizer:
//      • Holographic 7-stop gradient mapped to surface depth
//      • Phong specular highlights preserved in color pass
//      • Chromatic aberration at screen edges
//      • Cinematic anamorphic vignette
//      • Film grain (deterministic noise texture)
//      • Bloom glow integration for empty cells
//
// Design: Blade Runner 2049 × Apple WWDC × editorial type design.
// Every pixel is intentional. Every transition is choreographed.
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
// §2  Noise — Fractal Brownian Motion + Domain Warping
// ═══════════════════════════════════════════════════════════════

/** Deterministic hash — GPU sin-trick classic. */
function hash21(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Quintic-interpolated value noise (Ken Perlin's improved interpolant). */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
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

/**
 * Domain-warped fBm: warp input coordinates with noise for
 * organic swirling patterns (the technique behind Inigo Quilez's
 * famous "Painting with Math" shader art).
 */
function warpedFbm(x: number, y: number, time: number, octaves: number): number {
  const wx = fbm(x + time * 0.15, y + time * 0.10, octaves);
  const wy = fbm(x + 5.2 + time * 0.12, y + 1.3 + time * 0.08, octaves);
  return fbm(x + wx * 2.8, y + wy * 2.8, octaves);
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
// §4  Deep Parallax Star Field
//     3 depth layers with independent twinkle rates,
//     establishing the "deep space" environment.
// ═══════════════════════════════════════════════════════════════

function drawStarField(canvas: Cell[][], progress: number, ascii: boolean): void {
  const presence = smoothstep(0.0, 0.06, progress) * (1 - smoothstep(0.58, 0.78, progress));
  if (presence <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const layers = [
    { density: 0.012, twinkle: 1.17, maxBright: 0.15 },
    { density: 0.007, twinkle: 2.73, maxBright: 0.26 },
    { density: 0.003, twinkle: 4.91, maxBright: 0.46 },
  ];
  const glyphs = ascii ? ['.', '+', '*'] as const : ['·', '∙', '✦'] as const;

  for (let li = 0; li < layers.length; li++) {
    const l = layers[li];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const h = hash21(x + li * 997, y + li * 1999);
        if (h > l.density) continue;
        // Compound harmonic twinkle: two sine waves at irrational ratio
        // avoids the uniform on-off pulsing of a single sinusoid
        const phase = h * 127;
        const tw1 = Math.sin(progress * l.twinkle * Math.PI * 2 + phase) * 0.38;
        const tw2 = Math.sin(progress * l.twinkle * 1.618 * Math.PI + phase * 0.73) * 0.22;
        const tw = clamp(tw1 + tw2 + 0.40, 0, 1);
        const energy = l.maxBright * tw * presence;
        if (energy < 0.03) continue;
        put(canvas, x, y, glyphs[li], 'halo', energy);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §5  Domain-Warped Nebula
//     Using Inigo Quilez's domain-warping technique:
//     coordinates are displaced by noise before sampling noise,
//     producing organic swirling, cloud-like patterns that flow.
// ═══════════════════════════════════════════════════════════════

function drawNebula(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  const presence = smoothstep(0.03, 0.16, progress) * (1 - smoothstep(0.42, 0.65, progress));
  if (presence <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const cx = W / 2, cy = H / 2;
  const time = progress * identity.tempo * 2;
  const glyphs = ascii
    ? ['.', ':', '+', '*'] as const
    : ['·', '∙', '∴', '∷'] as const;

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      // Domain-warped noise
      const val = warpedFbm(x * 0.055, y * 0.085, time, 3);

      // Asymmetric radial mask: broken by noise so it's not a perfect circle.
      // A perfect radial screams "computer generated" — this feels geological.
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      const radialNoise = valueNoise(x * 0.12 + time * 0.1, y * 0.18) * 0.25;
      const dist = Math.sqrt(dx * dx + dy * dy) + radialNoise;
      const radial = smoothstep(1.35, 0.38, dist) * smoothstep(0.04, 0.22, dist);

      const energy = clamp(val * radial * presence * 1.15, 0, 0.48);
      if (energy < 0.07) continue;
      const gi = Math.min(glyphs.length - 1, Math.floor(energy * glyphs.length * 1.8));
      put(canvas, x, y, glyphs[gi], 'halo', energy);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §6  Genesis Sequence
//     Singularity ignition with halo glow + expanding shockwave
//     ring — a dramatic opening beat.
// ═══════════════════════════════════════════════════════════════

function drawSingularity(canvas: Cell[][], progress: number, ascii: boolean): void {
  if (progress > 0.28) return;
  const centerX = Math.floor(canvas[0].length / 2);
  const centerY = Math.floor(canvas.length / 2);
  const glyph = ascii
    ? (progress < 0.04 ? '.' : progress < 0.10 ? 'o' : progress < 0.18 ? '*' : '#')
    : (progress < 0.04 ? '·' : progress < 0.10 ? '◦' : progress < 0.18 ? '◇' : '◆');
  const energy = smoothstep(0, 0.05, progress) * (1 - smoothstep(0.18, 0.28, progress));
  put(canvas, centerX, centerY, glyph, 'spark', energy);

  // Halo glow radiating from the singularity
  if (energy > 0.15) {
    const haloG = ascii ? '.' : '·';
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0 && dy === 0) continue;
        const d = Math.sqrt(dx * dx + dy * dy * 4);
        const he = energy * 0.35 / Math.max(d, 0.5);
        if (he > 0.02) put(canvas, centerX + dx, centerY + dy, haloG, 'halo', he);
      }
    }
  }
}

function drawShockwave(canvas: Cell[][], progress: number, ascii: boolean): void {
  const presence = smoothstep(0.05, 0.09, progress) * (1 - smoothstep(0.18, 0.30, progress));
  if (presence <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const cx = W / 2, cy = H / 2;
  const aspect = 2.0;
  const maxRadius = Math.min(W * 0.45, H * 0.75);
  const ringRadius = smoothstep(0.05, 0.28, progress) * maxRadius;
  const ringWidth = 1.5 + progress * 4;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / aspect, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Break the ring's perfect circularity with angular noise:
      // real shockwaves have turbulent, ragged edges.
      const angle = Math.atan2(dy, dx);
      const edgeNoise = valueNoise(angle * 3 + progress * 5, progress * 8) * 1.2;
      const ringDist = Math.abs(dist - ringRadius - edgeNoise);
      if (ringDist > ringWidth) continue;
      const energy = presence * (1 - ringDist / ringWidth) * 0.50;
      if (energy < 0.04) continue;
      const glyph = ascii ? (energy > 0.22 ? '*' : '.') : (energy > 0.22 ? '∷' : '·');
      put(canvas, x, y, glyph, 'spark', energy);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §7  Phong-Lit Organic Ribbon + Orbiting Micro-Particles
//
//     The hero 3D element. A noise-deformed trefoil torus knot
//     rendered with volumetric tube cross-sections, lit by a
//     Blinn-Phong model with an orbiting point light source.
//     Surrounded by a swarm of gravitationally-attracted
//     micro-particles that add life and depth.
//
//     Technical stack:
//       • 640 curve samples × 10 tube segments = 6,400 vertices
//       • Per-subpixel Braille z-buffer (8 depth slots per cell)
//       • Per-cell Phong energy accumulator
//       • Frenet frame for correct tube orientation
//       • fBm noise vertex displacement (3 octaves)
//       • Continuous comet-tail gradient (not discrete copies)
//       • 56 orbiting particles with noise-perturbed orbits
// ═══════════════════════════════════════════════════════════════

function drawHeroRibbon(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  // Smooth lifecycle — gentle curves, no hard cuts
  const entrance = smoothstep(0.03, 0.22, progress);
  const exit     = 1 - smoothstep(0.40, 0.64, progress);
  const opacity  = entrance * exit;
  if (opacity <= 0) return;

  const W = canvas[0].length, H = canvas.length;
  const pixW = W * 2, pixH = H * 4;           // Braille sub-pixel canvas
  const pcx = pixW / 2, pcy = pixH / 2;
  const scale = Math.min(pixW, pixH) * 0.38;
  const D = 2.8;                               // perspective focal distance
  const TWO_PI = Math.PI * 2;

  // ── Per-subpixel z-buffer + energy accumulator ──
  const masks      = Array.from({ length: H }, () => new Int32Array(W));
  const subZ       = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => new Float64Array(8).fill(Infinity)));
  const cellZ      = Array.from({ length: H }, () => new Float64Array(W).fill(Infinity));
  const cellEnergy = Array.from({ length: H }, () => new Float64Array(W).fill(0));

  // ── Dual-axis rotation with organic wobble ──
  //    Golden-ratio-derived frequencies guarantee the motion
  //    NEVER exactly repeats — it always feels alive, not looped.
  //    φ = 1.6180339887... used as the frequency multiplier.
  const PHI = 1.6180339887;
  const time    = progress * identity.tempo;
  const rotY    = time * Math.PI * (1 + PHI);                                   // ~2.618π
  const rotX    = Math.PI / 5.7 + Math.sin(time * PHI * 1.17) * 0.11           // tilt wobble
                + Math.sin(time * PHI * 2.91) * 0.03;                           // micro-wobble
  const rotZ    = Math.sin(time * PHI * 1.67 + 0.4) * 0.055                    // primary roll
                + Math.sin(time * 3.73) * 0.018;                                // asymmetric micro-roll
  const breathe = 1 + Math.sin(time * Math.PI * PHI * 2.1) * 0.032 * entrance  // organic scale pulse
                + Math.sin(time * 5.19) * 0.008 * entrance;                     // secondary pulse

  // Pre-computed trig
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

  /** Apply Z→Y→X rotation (with optional breathing scale). */
  function rotate(
    xL: number, yL: number, zL: number, applyBreathe: boolean,
  ): [number, number, number] {
    const x0 = applyBreathe ? xL * breathe : xL;
    const y0 = applyBreathe ? yL * breathe : yL;
    const z0 = applyBreathe ? zL * breathe : zL;
    // Z roll
    const x1 = x0 * cosZ - y0 * sinZ;
    const y1 = x0 * sinZ + y0 * cosZ;
    // Y spin
    const x2 = x1 * cosY + z0 * sinY;
    const z2 = -x1 * sinY + z0 * cosY;
    // X tilt
    const y3 = y1 * cosX - z2 * sinX;
    const z3 = y1 * sinX + z2 * cosX;
    return [x2, y3, z3];
  }

  /** Perspective projection from view-space coordinates. */
  function project(
    vx: number, vy: number, vz: number,
  ): { px: number; py: number; z3: number } | null {
    const denom = D - vz;
    if (denom <= 0.05) return null;
    return { px: pcx + (vx * scale) / denom, py: pcy + (vy * scale) / denom, z3: vz };
  }

  /** Plot a sub-pixel dot into the Braille z-buffer. */
  function plotBraille(px: number, py: number, z: number, energy: number): void {
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
      if (energy > cellEnergy[gy][gx]) cellEnergy[gy][gx] = energy;
    }
  }

  // ── Blinn-Phong lighting model ──
  //    Dynamic point light orbiting the scene
  const lightAngle = time * Math.PI * 0.6;
  const lightX = Math.cos(lightAngle) * 1.8;
  const lightY = -1.0;
  const lightZ = Math.sin(lightAngle) * 0.6 - 0.5;

  function phong(
    vx: number, vy: number, vz: number,
    nx: number, ny: number, nz: number,
  ): number {
    // Light direction
    let lx = lightX - vx, ly = lightY - vy, lz = lightZ - vz;
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
    lx /= ll; ly /= ll; lz /= ll;
    // Diffuse
    const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
    // Blinn-Phong specular (view along -Z)
    const hx = lx, hy = ly, hz = lz - 1;
    const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
    const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 28);
    // Rim light (edge glow for dramatic silhouette)
    const rim = Math.pow(1 - Math.abs(nz), 3) * 0.25;
    return clamp(0.10 + 0.48 * diff + 0.30 * spec + rim, 0, 1);
  }

  // ── Knot parameters ──
  const P = 2, Q = 3;
  const R = 0.55, r = 0.22, tubeR = 0.058;
  const sampleCount = 640;
  const tubeSeg = 10;

  // Noise displacement — intensity scales with lifecycle
  const noiseAmp  = 0.032 * entrance * (0.5 + 0.5 * exit);
  const noiseTime = time * 1.3;

  // Continuous gradient tail (comet-like luminous trail)
  const tailArc = TWO_PI * 0.38;
  const headT   = (time * 1.2) % 1;

  for (let i = 0; i < sampleCount; i++) {
    const tNorm = i / sampleCount;
    const t = tNorm * TWO_PI;

    // ── Gradient tail fade ──
    //    The non-tail "ambient" glow uses noise instead of a flat floor,
    //    so every part of the ribbon has slightly different brightness.
    const tdist = ((tNorm - headT) % 1 + 1) % 1;
    const ambientGlow = 0.14 + 0.10 * valueNoise(t * 1.3 + time * 2, tNorm * 6 + time);
    const tailFade = tdist < (tailArc / TWO_PI)
      ? smoothstep(tailArc / TWO_PI, 0, tdist)
      : ambientGlow;

    // ── Base knot centerline ──
    const cosQt = Math.cos(Q * t), sinQt = Math.sin(Q * t);
    const cosPt = Math.cos(P * t), sinPt = Math.sin(P * t);
    let kx = (R + r * cosQt) * cosPt;
    let ky = (R + r * cosQt) * sinPt;
    let kz = r * sinQt;

    // ── Organic noise displacement ──
    const nv = fbm(t * 2.5 + noiseTime, tNorm * 4 + noiseTime * 0.7, 3) - 0.5;
    const rl = Math.sqrt(kx * kx + ky * ky) || 1;
    kx += (kx / rl) * nv * noiseAmp;
    ky += (ky / rl) * nv * noiseAmp;
    kz += nv * noiseAmp * 0.5;

    // ── Frenet frame ──
    const dt = 0.004;
    const t2 = t + dt;
    const cosQt2 = Math.cos(Q * t2), sinQt2 = Math.sin(Q * t2);
    const cosPt2 = Math.cos(P * t2), sinPt2 = Math.sin(P * t2);
    let fkx2 = (R + r * cosQt2) * cosPt2;
    let fky2 = (R + r * cosQt2) * sinPt2;
    let fkz2 = r * sinQt2;
    const nv2 = fbm((t + dt) * 2.5 + noiseTime,
      ((i + 1) / sampleCount) * 4 + noiseTime * 0.7, 3) - 0.5;
    const rl2 = Math.sqrt(fkx2 * fkx2 + fky2 * fky2) || 1;
    fkx2 += (fkx2 / rl2) * nv2 * noiseAmp;
    fky2 += (fky2 / rl2) * nv2 * noiseAmp;
    fkz2 += nv2 * noiseAmp * 0.5;

    // Tangent
    let tanX = fkx2 - kx, tanY = fky2 - ky, tanZ = fkz2 - kz;
    const tLen = Math.sqrt(tanX * tanX + tanY * tanY + tanZ * tanZ) || 1;
    tanX /= tLen; tanY /= tLen; tanZ /= tLen;

    // Binormal = tangent × (0,0,1) with fallback
    let bx = tanY, by = -tanX, bz = 0;
    let bLen = Math.sqrt(bx * bx + by * by);
    if (bLen < 0.001) { bx = 1; by = 0; bLen = 1; }
    else { bx /= bLen; by /= bLen; }

    // Normal = tangent × binormal
    const nnx = tanY * bz - tanZ * by;
    const nny = tanZ * bx - tanX * bz;
    const nnz = tanX * by - tanY * bx;

    // Breathing tube radius
    const localTubeR = tubeR * (1 + 0.12 * Math.sin(t * 7.3 + time * 4.2));

    // ── Render tube cross-section with Phong shading ──
    for (let s = 0; s < tubeSeg; s++) {
      const a = (s / tubeSeg) * TWO_PI;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ox = kx + localTubeR * (ca * bx + sa * nnx);
      const oy = ky + localTubeR * (ca * by + sa * nny);
      const oz = kz + localTubeR * (ca * bz + sa * nnz);

      // Surface normal in local space (direction from center to surface)
      const snx = ca * bx + sa * nnx;
      const sny = ca * by + sa * nny;
      const snz = ca * bz + sa * nnz;

      // Rotate vertex and surface normal into view space
      const [vx, vy, vz] = rotate(ox, oy, oz, true);
      const [rnx, rny, rnz] = rotate(snx, sny, snz, false);

      const proj = project(vx, vy, vz);
      if (!proj) continue;

      // Compute Blinn-Phong shading
      const phongE = phong(vx, vy, vz, rnx, rny, rnz);
      const finalEnergy = opacity * tailFade * phongE;

      if (ascii) {
        const cx2 = Math.round(proj.px / 2), cy2 = Math.round(proj.py / 4);
        if (cx2 < 0 || cx2 >= W || cy2 < 0 || cy2 >= H) continue;
        const g = finalEnergy > 0.5 ? '@' : finalEnergy > 0.3 ? '#'
          : finalEnergy > 0.15 ? 'o' : '.';
        const layer: Layer = proj.z3 > 0 ? 'field' : 'spark';
        put(canvas, cx2, cy2, g, layer, finalEnergy, proj.z3);
      } else {
        plotBraille(proj.px, proj.py, proj.z3, finalEnergy);
      }
    }
  }

  // ── Orbiting micro-particles ──
  //    Swarm of 56 particles on tilted elliptical orbits with
  //    noise-perturbed positions — creates a "gravitational field" feel.
  const numParticles = 56;
  for (let i = 0; i < numParticles; i++) {
    const s1 = hash21(i * 13.7, i * 7.3);
    const s2 = hash21(i * 17.1, i * 11.9);
    const s3 = hash21(i * 23.3, i * 19.7);

    const orbitR = 0.72 + s1 * 0.38;
    const tilt   = s2 * Math.PI;
    const speed  = 0.4 + s3 * 0.7;
    const phase  = (i / numParticles) * TWO_PI + s1 * TWO_PI;

    const pt = phase + time * speed * TWO_PI;
    let px = orbitR * Math.cos(pt);
    let py = orbitR * Math.sin(pt) * Math.cos(tilt);
    let pz = orbitR * Math.sin(pt) * Math.sin(tilt);

    // Gentle noise wiggle
    px += (fbm(pt * 0.3, i * 0.1 + time, 2) - 0.5) * 0.06;
    py += (fbm(pt * 0.3 + 5, i * 0.1 + time, 2) - 0.5) * 0.06;

    const [rx, ry, rz] = rotate(px, py, pz, true);
    const proj = project(rx, ry, rz);
    if (!proj) continue;

    const brightness = clamp(1 - (proj.z3 + 1) / 2, 0, 1) * 0.45 * opacity;
    if (brightness < 0.04) continue;

    if (ascii) {
      const cx2 = Math.round(proj.px / 2), cy2 = Math.round(proj.py / 4);
      if (cx2 >= 0 && cx2 < W && cy2 >= 0 && cy2 < H) {
        const layer: Layer = proj.z3 > 0 ? 'field' : 'spark';
        put(canvas, cx2, cy2, brightness > 0.25 ? '*' : '.', layer, brightness, proj.z3);
      }
    } else {
      plotBraille(proj.px, proj.py, proj.z3, brightness);
    }
  }

  // ── Commit Braille masks to canvas ──
  if (!ascii) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (masks[y][x] === 0) continue;
        const braille = String.fromCodePoint(0x2800 + masks[y][x]);
        const energy = cellEnergy[y][x];
        const layer: Layer = cellZ[y][x] > 0 ? 'field' : 'spark';
        put(canvas, x, y, braille, layer, energy, cellZ[y][x]);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §8  Anamorphic Lens Flare
//     Horizontal streak at dramatic beats (genesis peak +
//     ribbon dissolution) — a signature cinematic touch.
// ═══════════════════════════════════════════════════════════════

function drawLensFlare(canvas: Cell[][], progress: number, ascii: boolean): void {
  const flare1 = smoothstep(0.07, 0.11, progress) * (1 - smoothstep(0.14, 0.20, progress));
  const flare2 = smoothstep(0.53, 0.59, progress) * (1 - smoothstep(0.63, 0.71, progress)) * 0.45;
  const intensity = Math.max(flare1, flare2);
  if (intensity <= 0.01) return;

  const W = canvas[0].length, H = canvas.length;
  // Slight vertical drift so the streak isn't perfectly centered — feels organic
  const cy = Math.floor(H / 2) + (progress > 0.5 ? -1 : 0);
  const glyph = ascii ? '-' : '─';

  // Asymmetric Gaussian: slightly wider to the right (anamorphic lens asymmetry)
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2);
    const asym = dx > 0 ? 1.6 : 2.0;  // tighter fall-off on the left
    const energy = intensity * Math.exp(-dx * dx * asym) * 0.38;
    if (energy < 0.03) continue;
    put(canvas, x, cy, glyph, 'spark', energy);
    if (energy > 0.09) {
      const faintE = energy * 0.20;
      put(canvas, x, cy - 1, ascii ? '.' : '·', 'halo', faintE);
      put(canvas, x, cy + 1, ascii ? '.' : '·', 'halo', faintE * 0.7); // bottom streak dimmer
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// §9  Enhanced Bloom (extended Gaussian kernel)
// ═══════════════════════════════════════════════════════════════

function computeBloom(canvas: Cell[][], W: number, H: number): Float64Array[] {
  const bloom = Array.from({ length: H }, () => new Float64Array(W));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = canvas[y][x];
      if (c.energy < 0.30 || (c.layer !== 'spark' && c.layer !== 'field')) continue;
      // Extended kernel: radius 3 horizontal × 2 vertical (aspect-aware)
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= H || nx < 0 || nx >= W || (dx === 0 && dy === 0)) continue;
          const dist = Math.sqrt(dx * dx + dy * dy * 4); // aspect-corrected
          bloom[ny][nx] += c.energy * Math.exp(-dist * 0.55) * 0.07;
        }
      }
    }
  }
  return bloom;
}

// ═══════════════════════════════════════════════════════════════
// §10  Editorial Frame
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
// §11  Wordmark
// ═══════════════════════════════════════════════════════════════

function drawWordmark(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  if (progress < 0.18) return;
  const W = canvas[0].length, H = canvas.length;
  const wm = ascii ? identity.ascii
    : W >= identity.minimumLargeWidth ? identity.large : identity.compact;
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
// §12  Attribution
// ═══════════════════════════════════════════════════════════════

function drawAttribution(
  canvas: Cell[][], progress: number, identity: Identity, ascii: boolean,
): void {
  if (identity.name !== 'helen' || progress < 0.62) return;
  const W = canvas[0].length, H = canvas.length;
  const wm = ascii ? identity.ascii
    : W >= identity.minimumLargeWidth ? identity.large : identity.compact;
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
    put(canvas, left + x, y,
      edge < 1.5 ? (ascii ? '.' : '·') : g,
      'attribution', edge < 1.5 ? 0.3 : 0.72);
  });
}

// ═══════════════════════════════════════════════════════════════
// §13  Iridescent Colorizer
//      with chromatic aberration, vignette, film grain,
//      and bloom glow
// ═══════════════════════════════════════════════════════════════

/** Holographic gradient: blue → cyan → violet → magenta → rose → gold → blue */
const IRIDESCENT: readonly (readonly number[])[] = [
  [30, 110, 255],    // electric blue
  [0, 205, 235],     // cyan
  [115, 95, 255],    // violet
  [195, 85, 255],    // magenta
  [255, 150, 190],   // rose
  [255, 200, 115],   // warm gold
  [30, 110, 255],    // loop back
];

function iridescentAt(t: number): [number, number, number] {
  const u = ((t % 1) + 1) % 1;
  const scaled = u * (IRIDESCENT.length - 1);
  const i = Math.floor(scaled);
  return lerpVec(
    IRIDESCENT[i],
    IRIDESCENT[Math.min(i + 1, IRIDESCENT.length - 1)],
    scaled - i,
  );
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

  // Film grain frame seed
  const grainFrame = Math.floor(progress * 200);

  return canvas.map((row, y) => row.map((cell, x) => {
    // ── Anamorphic vignette (heavier top/bottom, lighter sides) ──
    const dcx = (x - W / 2) / (W / 2);
    const dcy = (y - H / 2) / (H / 2);
    const vig = 1
      - smoothstep(0.45, 1.3, Math.abs(dcy)) * 0.3
      - smoothstep(0.75, 1.5, Math.abs(dcx)) * 0.12;

    // ── Film grain: subtle deterministic noise texture ──
    const grain = color ? (hash21(x * 73 + grainFrame, y * 157) - 0.5) * 5 : 0;

    // ── Empty cell: render bloom glow ──
    if (cell.layer === 'empty') {
      const b = bloom[y]?.[x] ?? 0;
      if (b > 0.04 && color) {
        const gc = iridescentAt((x / W + progress * 0.4) % 1);
        return paint('·', [
          gc[0] * b * vig * 0.50 + grain,
          gc[1] * b * vig * 0.50 + grain,
          gc[2] * b * vig * 0.50 + grain,
        ], true);
      }
      return ' ';
    }

    // ── Star field / atmospheric nebula ──
    if (cell.layer === 'halo') {
      const sc = iridescentAt((x / W + y / H * 0.5 + progress * 0.3) % 1);
      return paint(cell.glyph, lerpVec(graphite, sc, cell.energy * 0.45 * vig), color);
    }

    // ── 3D ribbon (field = back faces, spark = front faces) ──
    if (cell.layer === 'field' || cell.layer === 'spark') {
      const depthComponent = cell.depth !== Infinity ? cell.depth * 0.25 : 0;
      const iridT = (x / W * 0.7 + depthComponent + progress * 0.5) % 1;
      const base = iridescentAt(iridT);
      const brightness = cell.energy * vig;

      // Chromatic aberration: R-shift right, B-shift left
      const aber = Math.abs(dcx) * 0.15;
      const cr = base[0] * brightness + (dcx > 0 ? aber * 50 : 0);
      const cg = base[1] * brightness;
      const cb = base[2] * brightness + (dcx < 0 ? aber * 50 : 0);

      // Bloom brightness boost + film grain
      const bb = (bloom[y]?.[x] ?? 0) * 0.35;

      return paint(cell.glyph, [
        clamp(cr + bb * base[0] + grain, 0, 255),
        clamp(cg + bb * base[1] + grain, 0, 255),
        clamp(cb + bb * base[2] + grain, 0, 255),
      ], color);
    }

    // ── Frame: warm gold → amber ──
    if (cell.layer === 'frame') {
      const warmth = (x / Math.max(1, W) + progress * 0.25) % 1;
      const fc = warmth < 0.5
        ? lerpVec(graphite, gold, cell.energy * 0.7 * vig)
        : lerpVec(graphite, ember, cell.energy * 0.65 * vig);
      return paint(cell.glyph, [fc[0] + grain, fc[1] + grain, fc[2] + grain], color);
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
// §14  Render Pipeline
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

  // 1. Deep space
  drawStarField(canvas, progress, ascii);

  // 2. Atmosphere
  drawNebula(canvas, progress, identity, ascii);

  // 3. Genesis
  drawSingularity(canvas, progress, ascii);
  drawShockwave(canvas, progress, ascii);

  // 4–5. Hero 3D element + orbiting particles
  drawHeroRibbon(canvas, progress, identity, ascii);

  // 6. Lens flare
  drawLensFlare(canvas, progress, ascii);

  // 7. Post-processing
  const bloom = computeBloom(canvas, width, height);

  // 8–10. Typography (sacrosanct layer)
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
// §15  Animation Loop
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
  return !/utf-?8/i.test(
    `${process.env.LANG ?? ''} ${process.env.LC_ALL ?? ''} ${process.env.LC_CTYPE ?? ''}`,
  );
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
    console.log(renderCinematicFrame(identity, 1, {
      width, height: Math.min(height, 14), color, ascii,
    }));
    return;
  }

  const frameCount = identity === 'eneko-ruiz' ? 64 : 58;
  const frameDuration = 24;
  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN);

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      process.stdout.write(ESC + 'H' + CLEAR_BELOW);
      process.stdout.write(renderCinematicFrame(
        identity, frame / (frameCount - 1),
        { width, height, color, ascii },
      ));
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
