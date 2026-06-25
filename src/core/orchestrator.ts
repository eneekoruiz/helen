export type RunMode = 'AUTONOMOUS' | 'HITL';

export type OrchestratorState =
  | 'IDLE'
  | 'EXECUTING_TASK'
  | 'EVALUATING'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'CORRECTING'
  | 'SUCCESS'
  | 'FAILED';

export interface TaskResult {
  output: string;
  isPerfect: boolean;
  errors?: string[];
  loopCount: number;
  finalState: OrchestratorState;
}

export interface OrchestratorConfig {
  runMode: RunMode;
  maxAutonomousLoops?: number;
  hitlTimeoutMs?: number;
}

export type StateChangeListener = (state: OrchestratorState, details?: string) => void;
export type LogListener = (message: string) => void;

export class HelenAIOrchestrator {
  private state: OrchestratorState = 'IDLE';
  private runMode: RunMode = 'AUTONOMOUS';
  private maxAutonomousLoops: number = 3;
  private hitlTimeoutMs: number = 60000; // 60 seconds default timeout

  private currentTask: string = '';
  private currentOutput: string = '';
  private currentErrors: string[] = [];
  private loopCount: number = 0;

  private stateChangeListeners: StateChangeListener[] = [];
  private logListeners: LogListener[] = [];

  // Deferred promise elements for HITL pausing
  private resolveHumanAction: ((value: { approved: boolean; feedback?: string }) => void) | null = null;
  private hitlTimer: NodeJS.Timeout | null = null;

  // Mockable node executors for actual tasks
  private actorExecutor: (task: string, feedback?: string) => Promise<string>;
  private qaEvaluator: (output: string) => Promise<{ isPerfect: boolean; errors?: string[] }>;

  constructor(
    config?: OrchestratorConfig,
    actorExecutor?: (task: string, feedback?: string) => Promise<string>,
    qaEvaluator?: (output: string) => Promise<{ isPerfect: boolean; errors?: string[] }>
  ) {
    if (config) {
      this.runMode = config.runMode;
      if (config.maxAutonomousLoops !== undefined) {
        this.maxAutonomousLoops = config.maxAutonomousLoops;
      }
      if (config.hitlTimeoutMs !== undefined) {
        this.hitlTimeoutMs = config.hitlTimeoutMs;
      }
    }

    // Default mock executor that simulates building code
    this.actorExecutor = actorExecutor || (async (task: string, feedback?: string) => {
      this.log(`[Actor] Executing task: "${task}"` + (feedback ? ` with feedback: "${feedback}"` : ''));
      await new Promise(resolve => setTimeout(resolve, 800));
      if (feedback) {
        return `Draft code addressing feedback: ${feedback}. Original task: ${task}`;
      }
      return `Draft code for task: ${task}`;
    });

    // Default mock QA evaluator that checks code quality
    this.qaEvaluator = qaEvaluator || (async (output: string) => {
      this.log('[QA Evaluator] Evaluating quality of output...');
      await new Promise(resolve => setTimeout(resolve, 600));
      // Simple heuristic for default evaluation: if it contains feedback, we say it's perfect; otherwise, simulate a first-run issue
      if (output.includes('feedback') || output.includes('addressing')) {
        return { isPerfect: true };
      }
      return {
        isPerfect: false,
        errors: ['Code lacks detailed documentation', 'Missing robust error handling'],
      };
    });
  }

  // --- Configuration and Listeners ---

  public getMode(): RunMode {
    return this.runMode;
  }

  public setMode(mode: RunMode): void {
    this.log(`[Config] RunMode switched to: ${mode}`);
    this.runMode = mode;
  }

  public getState(): OrchestratorState {
    return this.state;
  }

  public getCurrentOutput(): string {
    return this.currentOutput;
  }

  public getCurrentErrors(): string[] {
    return this.currentErrors;
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  public onLog(listener: LogListener): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  // --- Core Lifecycle ---

  public async run(task: string): Promise<TaskResult> {
    if (this.state !== 'IDLE' && this.state !== 'SUCCESS' && this.state !== 'FAILED') {
      throw new Error(`Cannot start task. Orchestrator is currently in state: ${this.state}`);
    }

    this.currentTask = task;
    this.currentOutput = '';
    this.currentErrors = [];
    this.loopCount = 0;
    this.transition('EXECUTING_TASK', `Starting task: ${task}`);

    let humanFeedback: string | undefined = undefined;

    while (true) {
      // 1. Actor Node: Executing the task
      this.transition('EXECUTING_TASK', `Loop ${this.loopCount + 1}: Executing...`);
      try {
        this.currentOutput = await this.actorExecutor(this.currentTask, humanFeedback);
        this.log('[Actor] Finished generating output.');
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.log(`[Error] Actor execution failed: ${errMsg}`);
        this.transition('FAILED', `Actor failed: ${errMsg}`);
        return this.buildResult();
      }

      // 2. Evaluator Node: Quality review
      this.transition('EVALUATING', 'Evaluating task output...');
      let qaResult;
      try {
        qaResult = await this.qaEvaluator(this.currentOutput);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.log(`[Error] QA Evaluation failed: ${errMsg}`);
        this.transition('FAILED', `QA failed: ${errMsg}`);
        return this.buildResult();
      }

      this.currentErrors = qaResult.errors || [];

      // 3. Routing decision based on evaluation and RunMode
      if (qaResult.isPerfect) {
        this.log('[QA Evaluator] Output is perfect! Completing task.');
        this.transition('SUCCESS', 'Task successfully completed.');
        return this.buildResult();
      }

      this.log(`[QA Evaluator] Quality check failed with ${this.currentErrors.length} error(s).`);

      if (this.runMode === 'AUTONOMOUS') {
        // Autonomous mode route: auto-correction loop
        this.loopCount++;
        if (this.loopCount >= this.maxAutonomousLoops) {
          this.log(`[Autonomous] Maximum retry loops (${this.maxAutonomousLoops}) reached.`);
          this.transition('FAILED', 'Max retries reached without meeting quality bar.');
          return this.buildResult();
        }

        this.transition('CORRECTING', `Auto-correcting errors: ${this.currentErrors.join(', ')}`);
        humanFeedback = `Errors found by QA: ${this.currentErrors.join('; ')}`;
        this.log(`[Autonomous] Re-submitting to Actor with QA feedback.`);
        // Continue loop
      } else {
        // HITL mode route: pause and await human decision
        this.transition('AWAITING_HUMAN_APPROVAL', 'Awaiting user verification.');
        this.log('[HITL] Flow paused. Waiting for user to approve or reject/correct.');

        let decision: { approved: boolean; feedback?: string };
        try {
          decision = await this.waitForHumanDecision();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.log(`[HITL] Wait interrupted: ${errMsg}`);
          this.transition('FAILED', `HITL interrupted: ${errMsg}`);
          return this.buildResult();
        }

        if (decision.approved) {
          this.log('[HITL] Approved by user.');
          this.transition('SUCCESS', 'Approved by user.');
          return this.buildResult();
        } else {
          this.log(`[HITL] Rejected by user. Feedback: "${decision.feedback || 'None'}"`);
          this.loopCount++;
          this.transition('CORRECTING', 'Processing human corrections...');
          humanFeedback = decision.feedback || 'Please refine the output.';
          // Continue loop
        }
      }
    }
  }

  /**
   * Resumes the flow from AWAITING_HUMAN_APPROVAL state with user feedback.
   */
  public resume(approved: boolean, feedback?: string): void {
    if (this.state !== 'AWAITING_HUMAN_APPROVAL' || !this.resolveHumanAction) {
      throw new Error(`Orchestrator is not currently waiting for approval (Current state: ${this.state})`);
    }

    if (this.hitlTimer) {
      clearTimeout(this.hitlTimer);
      this.hitlTimer = null;
    }

    const resolver = this.resolveHumanAction;
    this.resolveHumanAction = null;
    resolver({ approved, feedback });
  }

  // --- Private Helpers ---

  private transition(newState: OrchestratorState, details?: string): void {
    this.log(`[State Transition] ${this.state} ➔ ${newState}` + (details ? ` (${details})` : ''));
    this.state = newState;
    this.stateChangeListeners.forEach(l => l(newState, details));
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const formatted = `[${timestamp}] ${message}`;
    this.logListeners.forEach(l => l(formatted));
  }

  private async waitForHumanDecision(): Promise<{ approved: boolean; feedback?: string }> {
    return new Promise<{ approved: boolean; feedback?: string }>((resolve, reject) => {
      this.resolveHumanAction = resolve;

      // Robust timeout handling to prevent indefinite hangs
      this.hitlTimer = setTimeout(() => {
        if (this.resolveHumanAction) {
          this.resolveHumanAction = null;
          this.log(`[Timeout] HITL timeout of ${this.hitlTimeoutMs}ms reached.`);
          reject(new Error(`Human-in-the-Loop decision timed out after ${this.hitlTimeoutMs}ms`));
        }
      }, this.hitlTimeoutMs);
    });
  }

  private buildResult(): TaskResult {
    return {
      output: this.currentOutput,
      isPerfect: this.state === 'SUCCESS',
      errors: this.currentErrors.length > 0 ? this.currentErrors : undefined,
      loopCount: this.loopCount,
      finalState: this.state,
    };
  }
}
