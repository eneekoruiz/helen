import pc from 'picocolors';

/**
 * HSL to RGB helper for truecolor console coloring.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h % 360;
  s = s / 100;
  l = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
}

/**
 * Returns a 24-bit Truecolor escape sequence for foreground text.
 */
function rgbColor(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

const RESET = '\x1b[0m';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

const ART_LINES = [
  '  ███████╗███╗   ██╗███████╗██╗  ██╗ ██████╗     ██████╗ ██╗   ██╗██╗███████╗',
  '  ██╔════╝████╗  ██║██╔════╝██║ ██╔╝██╔═══██╗    ██╔══██╗██║   ██║██║╚══███╔╝',
  '  █████╗  ██╔██╗ ██║█████╗  █████╔╝ ██║   ██║    ██████╔╝██║   ██║██║  ███╔╝ ',
  '  ██╔══╝  ██║╚██╗██║██╔══╝  ██╔═██╗ ██║   ██║    ██╔══██╗██║   ██║██║ ███╔╝  ',
  '  ███████╗██║ ╚████║███████╗██║  ██╗╚██████╔╝    ██║  ██║╚██████╔╝██║███████╗',
  '  ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚══════╝'
];

/**
 * Sleep helper.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run the premium animated terminal Easter Egg.
 */
export async function runEasterEgg(): Promise<void> {
  const isStdoutInteractive = process.stdout.isTTY;

  // Intro Typing Effect
  console.clear();
  console.log(pc.bold(pc.cyan('⚡ HELEN INTERRUPT SEQUENCE INITIATED ⚡')));
  console.log(pc.dim('─── Establishing secure sandbox connection ──────────────────'));
  await sleep(350);

  const loaderSteps = [
    'Initializing truecolor spectrum engines...',
    'Injecting neon HSL diagonal color cycles...',
    'Loading elite Eneko Ruiz developer profiles...',
    'Hardening cybersecurity parameters: STRICT mode active...'
  ];

  for (const step of loaderSteps) {
    process.stdout.write(`  ${pc.yellow('◷')} ${step}`);
    await sleep(250);
    process.stdout.write('\r');
    process.stdout.write(`  ${pc.green('✔')} ${step}\n`);
    await sleep(100);
  }

  await sleep(300);
  console.clear();

  // Hide cursor for fluid drawing if interactive
  if (isStdoutInteractive) {
    process.stdout.write(HIDE_CURSOR);
  }

  const frames = 70; // About 3.5 seconds at 50ms/frame
  let baseHue = 0;

  for (let frame = 0; frame < frames; frame++) {
    // Return cursor to home
    if (isStdoutInteractive && frame > 0) {
      process.stdout.write('\x1b[H'); // Move cursor to top-left corner
    } else if (!isStdoutInteractive) {
      // Just print once and break if non-interactive
      printFrame(baseHue);
      break;
    }

    printFrame(baseHue);
    baseHue = (baseHue + 6) % 360;
    await sleep(50);
  }

  // Graceful restoration
  if (isStdoutInteractive) {
    process.stdout.write(SHOW_CURSOR);
  }

  console.log('');
  console.log(pc.bold(pc.cyan('  🛰️  Eneko Ruiz Ultimate DX System Online.')));
  console.log(pc.dim('  ──────────────────────────────────────────────────────────────────────────'));
  console.log(`  ${pc.bold('Status:')} ${pc.green('● ACTIVE')}  |  ${pc.bold('Security:')} ${pc.bold(pc.red('STRICT'))}  |  ${pc.bold('Engine:')} HELEN v1.0.0`);
  console.log(pc.dim('  ──────────────────────────────────────────────────────────────────────────'));
  console.log('');
}

/**
 * Print a single animated frame of ASCII art.
 */
function printFrame(baseHue: number): void {
  console.log('');
  console.log(pc.bold(pc.gray('   ─── 🌌 ENEKO RUIZ SYSTEM DIAGNOSTICS 🌌 ──────────────────────────────')));
  console.log('');

  // Print each line of the ASCII art with a sweeping diagonal truecolor gradient
  for (let y = 0; y < ART_LINES.length; y++) {
    const line = ART_LINES[y];
    let coloredLine = '';

    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      // Calculate dynamic diagonal gradient hue
      const hue = (baseHue + x * 4.5 + y * 18) % 360;
      const [r, g, b] = hslToRgb(hue, 100, 50);
      coloredLine += `${rgbColor(r, g, b)}${char}`;
    }

    console.log(coloredLine + RESET);
  }

  console.log('');

  // Animated progress bar
  const progressPercent = Math.min(100, Math.round((baseHue / 360) * 100 + 40) % 101);
  const barWidth = 40;
  const filledWidth = Math.round((progressPercent / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  const filledBar = pc.cyan('█'.repeat(filledWidth));
  const emptyBar = pc.dim('░'.repeat(emptyWidth));
  
  const statusColor = baseHue % 120 < 40 ? pc.green : baseHue % 120 < 80 ? pc.cyan : pc.yellow;

  console.log(
    `   [${filledBar}${emptyBar}] ${pc.bold(`${progressPercent}%`)} | ${statusColor('⚡ SYNCHRONIZED')} | CPU: ${pc.green('NOMINAL')}`
  );
  console.log(pc.bold(pc.gray('   ──────────────────────────────────────────────────────────────────────')));
}
