import pc from 'picocolors';
export const logger = {
    info(msg) {
        console.log(`[ HELEN ] ${msg}`);
    },
    success(msg) {
        console.log(`[ HELEN ] ${msg}`);
    },
    warn(msg) {
        console.log(`[ HELEN ] ${msg}`);
    },
    error(msg) {
        console.error(`[ HELEN ] ${msg}`);
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