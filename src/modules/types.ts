import type { HelenContext, ModuleResult } from '../core/context.js';

/**
 * Risk level for a module.
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Recommended skill level for using this module.
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Module lifecycle status.
 */
export type ModuleStatus = 'stable' | 'experimental' | 'planned' | 'deprecated';

/**
 * Full metadata for a HELEN module.
 */
export interface ModuleMeta {
  id: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  problemItSolves: string;
  whenToUse: string;
  whenNotToUse: string;
  filesCreated: string[];
  filesModified: string[];
  runtimeDependencies: string[];
  devDependencies: string[];
  requirements: string[];
  risks: string[];
  nextSteps: string[];
  riskLevel: RiskLevel;
  recommendedLevel: SkillLevel;
  status: ModuleStatus;
  /** IDs of modules this module depends on */
  dependencies?: string[];
  /** Optional: specific frameworks this module is compatible with */
  compatibleFrameworks?: ('vite' | 'next' | 'cra' | 'remix' | 'any')[];
}

/**
 * A HELEN module: metadata + an execute function.
 */
export interface HelenModule {
  meta: ModuleMeta;
  execute: (ctx: HelenContext) => Promise<ModuleResult>;
}
