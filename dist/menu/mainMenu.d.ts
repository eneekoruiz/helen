import type { HelenModule } from '../modules/types.js';
/**
 * Show the interactive main menu.
 * Returns the selected action.
 */
export declare function showMainMenu(): Promise<string | symbol>;
/**
 * Show module selector. Returns selected module IDs (stable modules only).
 */
export declare function showModuleSelector(): Promise<string[] | symbol>;
/**
 * Show module explainer selector.
 */
export declare function showExplainSelector(): Promise<string | symbol>;
/**
 * Display full module documentation.
 */
export declare function printModuleExplanation(mod: HelenModule): void;
/**
 * List all modules grouped by category.
 */
export declare function printModuleList(): void;
//# sourceMappingURL=mainMenu.d.ts.map