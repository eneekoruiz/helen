import pc from 'picocolors';
export const logger = {
    info(msg) {
        console.log(`${pc.cyan('ℹ')} ${msg}`);
    },
    success(msg) {
        console.log(`${pc.green('✓')} ${msg}`);
    },
    warn(msg) {
        console.log(`${pc.yellow('⚠')} ${msg}`);
    },
    error(msg) {
        console.error(`${pc.red('✖')} ${msg}`);
    },
    step(msg) {
        console.log(`  ${pc.dim('→')} ${msg}`);
    },
    section(title) {
        console.log('');
        console.log(`${pc.bold(pc.cyan(`  ${title}`))}`);
        console.log(`  ${pc.dim('─'.repeat(60))}`);
    },
    blank() {
        console.log('');
    },
    banner() {
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
//# sourceMappingURL=logger.js.map