import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import ora from 'ora';
/**
 * Scaffold a new project from scratch.
 */
export async function scaffoldProject(options) {
    const { name, type, cwd } = options;
    const projectDir = path.join(cwd, name);
    if (fs.existsSync(projectDir)) {
        logger.error(`Directory "${name}" already exists.`);
        return false;
    }
    const spinner = ora({
        text: `Creating ${type} project: ${name}...`,
        color: 'yellow',
    }).start();
    try {
        if (type === 'vite-react-ts') {
            // Use npm create vite@latest <name> -- --template react-ts
            execSync(`npm create vite@latest ${name} -- --template react-ts`, {
                cwd,
                stdio: 'ignore',
            });
        }
        else if (type === 'next-ts') {
            // Use npx create-next-app@latest <name> --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
            execSync(`npx create-next-app@latest ${name} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`, {
                cwd,
                stdio: 'ignore',
            });
        }
        spinner.succeed(`Project ${name} created successfully.`);
        return true;
    }
    catch (err) {
        spinner.fail(`Failed to scaffold project.`);
        logger.error(err instanceof Error ? err.message : String(err));
        return false;
    }
}
//# sourceMappingURL=scaffold.js.map