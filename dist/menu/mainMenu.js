import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAllModules, getModulesByCategory } from '../modules/registry.js';
/**
 * Show the interactive main menu.
 * Returns the selected action.
 */
export async function showMainMenu() {
    const action = await p.select({
        message: 'What would you like to do?',
        options: [
            { value: 'add', label: '📦 Add modules', hint: 'Select and install modules' },
            { value: 'modules', label: '📋 List modules', hint: 'See all available modules' },
            { value: 'doctor', label: '🩺 Doctor', hint: 'Check project health' },
            { value: 'explain', label: '📖 Explain module', hint: 'Learn about a specific module' },
            { value: 'docs', label: '📚 Documentation', hint: 'View module documentation' },
            { value: 'exit', label: '👋 Exit' },
        ],
    });
    return action;
}
/**
 * Show module selector. Returns selected module IDs.
 */
export async function showModuleSelector() {
    const categories = getModulesByCategory();
    const options = [];
    for (const [category, mods] of categories) {
        for (const mod of mods) {
            options.push({
                value: mod.meta.id,
                label: `${mod.meta.name}`,
                hint: `[${category}] ${mod.meta.summary}`,
            });
        }
    }
    const selected = await p.multiselect({
        message: 'Select modules to add:',
        options,
        required: true,
    });
    return selected;
}
/**
 * Show module explainer selector.
 */
export async function showExplainSelector() {
    const modules = getAllModules();
    const selected = await p.select({
        message: 'Which module do you want to learn about?',
        options: modules.map((m) => ({
            value: m.meta.id,
            label: m.meta.name,
            hint: m.meta.summary,
        })),
    });
    return selected;
}
/**
 * Display full module documentation.
 */
export function printModuleExplanation(mod) {
    const { meta } = mod;
    console.log('');
    console.log(`  ${pc.bold(pc.cyan(meta.name))} ${pc.dim(`(${meta.id})`)}`);
    console.log(`  ${pc.dim('Category:')} ${meta.category}`);
    console.log(`  ${pc.dim('Risk:')} ${meta.riskLevel} | ${pc.dim('Level:')} ${meta.recommendedLevel}`);
    console.log('');
    console.log(`  ${pc.bold('Summary')}`);
    console.log(`  ${meta.summary}`);
    console.log('');
    console.log(`  ${pc.bold('Description')}`);
    console.log(`  ${meta.description}`);
    console.log('');
    console.log(`  ${pc.bold('Problem it solves')}`);
    console.log(`  ${meta.problemItSolves}`);
    console.log('');
    console.log(`  ${pc.bold('When to use')}`);
    console.log(`  ${meta.whenToUse}`);
    console.log('');
    console.log(`  ${pc.bold('When NOT to use')}`);
    console.log(`  ${meta.whenNotToUse}`);
    console.log('');
    if (meta.filesCreated.length > 0) {
        console.log(`  ${pc.bold('Files created:')}`);
        for (const f of meta.filesCreated) {
            console.log(`    ${pc.green('+')} ${f}`);
        }
        console.log('');
    }
    if (meta.filesModified.length > 0) {
        console.log(`  ${pc.bold('Files modified:')}`);
        for (const f of meta.filesModified) {
            console.log(`    ${pc.blue('~')} ${f}`);
        }
        console.log('');
    }
    if (meta.runtimeDependencies.length > 0) {
        console.log(`  ${pc.bold('Runtime dependencies:')}`);
        console.log(`  ${meta.runtimeDependencies.join(', ')}`);
        console.log('');
    }
    if (meta.devDependencies.length > 0) {
        console.log(`  ${pc.bold('Dev dependencies:')}`);
        console.log(`  ${meta.devDependencies.join(', ')}`);
        console.log('');
    }
    if (meta.risks.length > 0) {
        console.log(`  ${pc.bold(pc.yellow('Risks:'))}`);
        for (const r of meta.risks) {
            console.log(`    ${pc.yellow('⚠')} ${r}`);
        }
        console.log('');
    }
    if (meta.nextSteps.length > 0) {
        console.log(`  ${pc.bold('Next steps after install:')}`);
        for (const s of meta.nextSteps) {
            console.log(`    ${pc.dim('→')} ${s}`);
        }
        console.log('');
    }
}
/**
 * List all modules grouped by category.
 */
export function printModuleList() {
    const categories = getModulesByCategory();
    console.log('');
    console.log(`  ${pc.bold('Available modules:')}`);
    console.log('');
    for (const [category, mods] of categories) {
        console.log(`  ${pc.dim(`── ${category} ${'─'.repeat(50 - category.length)}`)}`);
        for (const mod of mods) {
            const risk = mod.meta.riskLevel === 'high'
                ? pc.red(mod.meta.riskLevel)
                : mod.meta.riskLevel === 'medium'
                    ? pc.yellow(mod.meta.riskLevel)
                    : pc.green(mod.meta.riskLevel);
            console.log(`  ${pc.bold(pc.cyan(mod.meta.id.padEnd(12)))} ${mod.meta.name.padEnd(20)} ${pc.dim(mod.meta.summary)} ${pc.dim(`[${risk}]`)}`);
        }
        console.log('');
    }
}
//# sourceMappingURL=mainMenu.js.map