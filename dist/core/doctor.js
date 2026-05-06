import pc from 'picocolors';
import { detectProject } from './projectDetector.js';
import { logger } from './logger.js';
/**
 * Run a health check on the project.
 */
export function runDoctor(cwd) {
    const project = detectProject(cwd);
    const checks = [];
    // package.json
    checks.push({
        label: 'package.json',
        status: project.hasPackageJson ? 'ok' : 'error',
        message: project.hasPackageJson ? 'Found' : 'Missing — run npm init first',
    });
    // Git
    checks.push({
        label: 'Git repository',
        status: project.hasGit ? 'ok' : 'warn',
        message: project.hasGit ? 'Initialized' : 'No .git directory — run git init',
    });
    // src directory
    checks.push({
        label: 'Source directory (src/)',
        status: project.hasSrc ? 'ok' : 'warn',
        message: project.hasSrc ? 'Found' : 'Missing — some modules expect a src/ directory',
    });
    // TypeScript
    checks.push({
        label: 'TypeScript',
        status: project.hasTypeScript ? 'ok' : 'warn',
        message: project.hasTypeScript ? 'Configured' : 'Not detected — recommended for HELEN modules',
    });
    // Framework
    checks.push({
        label: 'Framework',
        status: project.framework !== 'unknown' ? 'ok' : 'warn',
        message: project.framework !== 'unknown'
            ? `Detected: ${project.framework}`
            : 'No framework detected — HELEN targets React + Vite primarily',
    });
    // React
    checks.push({
        label: 'React',
        status: project.hasReact ? 'ok' : 'warn',
        message: project.hasReact ? 'Installed' : 'Not found — some UI modules require React',
    });
    // Package manager
    checks.push({
        label: 'Package manager',
        status: project.packageManager !== 'unknown' ? 'ok' : 'warn',
        message: project.packageManager !== 'unknown'
            ? `Detected: ${project.packageManager}`
            : 'No lock file found — will default to npm',
    });
    return checks;
}
/**
 * Print doctor results to the console.
 */
export function printDoctorResults(checks, project) {
    logger.section('Project Health Check');
    logger.info(`Project: ${pc.bold(project.name)}`);
    logger.blank();
    for (const check of checks) {
        const icon = check.status === 'ok'
            ? pc.green('✓')
            : check.status === 'warn'
                ? pc.yellow('⚠')
                : pc.red('✗');
        console.log(`  ${icon} ${pc.bold(check.label)}: ${check.message}`);
    }
    const errors = checks.filter((c) => c.status === 'error');
    const warnings = checks.filter((c) => c.status === 'warn');
    const ok = checks.filter((c) => c.status === 'ok');
    logger.blank();
    console.log(`  ${pc.green(`${ok.length} passed`)}  ${pc.yellow(`${warnings.length} warnings`)}  ${pc.red(`${errors.length} errors`)}`);
    if (errors.length > 0) {
        logger.error('Fix errors before running HELEN modules.');
    }
    else if (warnings.length > 0) {
        logger.warn('Some warnings detected. Modules may still work.');
    }
    else {
        logger.success('Project looks great! Ready for HELEN modules.');
    }
    logger.blank();
}
//# sourceMappingURL=doctor.js.map