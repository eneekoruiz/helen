import pc from 'picocolors';

export const logger = {
  info(msg: string): void {
    console.log(`[ HELEN ] ${msg}`);
  },
  success(msg: string): void {
    console.log(`[ HELEN ] ${msg}`);
  },
  warn(msg: string): void {
    console.log(`[ HELEN ] ${msg}`);
  },
  error(msg: string): void {
    console.error(`[ HELEN ] ${msg}`);
  },
  step(msg: string): void {
    console.log(`  ${pc.dim('→')} ${msg}`);
  },
  section(title: string): void {
    console.log('');
    console.log(`${pc.bold(pc.cyan(`  ${title}`))}`);
    console.log(`  ${pc.dim('─'.repeat(60))}`);
  },
  blank(): void {
    console.log('');
  },
  banner(): void {
    console.log(pc.cyan(pc.bold(`
  ██╗  ██╗███████╗██╗     ███████╗███╗   ██╗
  ██║  ██║██╔════╝██║     ██╔════╝████╗  ██║
  ███████║█████╗  ██║     █████╗  ██╔██╗ ██║
  ██╔══██║██╔══╝  ██║     ██╔══╝  ██║╚██╗██║
  ██║  ██║███████╗███████╗███████╗██║ ╚████║
  ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝`)));
    console.log(pc.bold('   v1.0.0 — Modern Project Setup CLI'));
    console.log(pc.dim('   Security · Docker · CI/CD · Testing · SEO · DX'));
    console.log('');
  },
};
