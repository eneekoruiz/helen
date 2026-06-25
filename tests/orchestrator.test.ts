import { describe, expect, it, vi } from 'vitest';
import { HelenAIOrchestrator, OrchestratorState } from '../src/core/orchestrator.js';

describe('HelenAIOrchestrator State Machine', () => {
  it('should initialize with correct default state and configuration', () => {
    const orchestrator = new HelenAIOrchestrator();
    expect(orchestrator.getState()).toBe('IDLE');
    expect(orchestrator.getMode()).toBe('AUTONOMOUS');
    expect(orchestrator.getCurrentOutput()).toBe('');
    expect(orchestrator.getCurrentErrors()).toEqual([]);
  });

  it('should allow changing run mode', () => {
    const orchestrator = new HelenAIOrchestrator();
    orchestrator.setMode('HITL');
    expect(orchestrator.getMode()).toBe('HITL');
  });

  it('should successfully run in AUTONOMOUS mode and terminate on success', async () => {
    // Custom actor that returns a successful code on first try
    const mockActor = vi.fn().mockResolvedValue('const test = true;');
    const mockQA = vi.fn().mockResolvedValue({ isPerfect: true });

    const orchestrator = new HelenAIOrchestrator({ runMode: 'AUTONOMOUS' }, mockActor, mockQA);
    
    const states: OrchestratorState[] = [];
    orchestrator.onStateChange((state) => states.push(state));

    const result = await orchestrator.run('Write test code');

    expect(result.isPerfect).toBe(true);
    expect(result.output).toBe('const test = true;');
    expect(result.loopCount).toBe(0);
    expect(result.finalState).toBe('SUCCESS');
    expect(mockActor).toHaveBeenCalledTimes(1);
    expect(mockQA).toHaveBeenCalledTimes(1);

    expect(states).toContain('EXECUTING_TASK');
    expect(states).toContain('EVALUATING');
    expect(states).toContain('SUCCESS');
  });

  it('should auto-loop and correct errors in AUTONOMOUS mode', async () => {
    const mockActor = vi.fn()
      .mockResolvedValueOnce('flawed output')
      .mockResolvedValueOnce('perfect output');

    const mockQA = vi.fn()
      .mockResolvedValueOnce({ isPerfect: false, errors: ['syntax error'] })
      .mockResolvedValueOnce({ isPerfect: true });

    const orchestrator = new HelenAIOrchestrator(
      { runMode: 'AUTONOMOUS', maxAutonomousLoops: 3 },
      mockActor,
      mockQA
    );

    const result = await orchestrator.run('Fix code');

    expect(result.isPerfect).toBe(true);
    expect(result.output).toBe('perfect output');
    expect(result.loopCount).toBe(1);
    expect(result.finalState).toBe('SUCCESS');
    expect(mockActor).toHaveBeenCalledTimes(2);
    expect(mockQA).toHaveBeenCalledTimes(2);
  });

  it('should fail in AUTONOMOUS mode if max retry loops are reached', async () => {
    const mockActor = vi.fn().mockResolvedValue('always flawed');
    const mockQA = vi.fn().mockResolvedValue({ isPerfect: false, errors: ['bug'] });

    const orchestrator = new HelenAIOrchestrator(
      { runMode: 'AUTONOMOUS', maxAutonomousLoops: 2 },
      mockActor,
      mockQA
    );

    const result = await orchestrator.run('Optimize algorithms');

    expect(result.isPerfect).toBe(false);
    expect(result.loopCount).toBe(2);
    expect(result.finalState).toBe('FAILED');
    expect(result.errors).toEqual(['bug']);
  });

  it('should pause in HITL mode and resume on approval', async () => {
    const mockActor = vi.fn().mockResolvedValue('initial draft');
    const mockQA = vi.fn().mockResolvedValue({ isPerfect: false, errors: ['missing tests'] });

    const orchestrator = new HelenAIOrchestrator(
      { runMode: 'HITL' },
      mockActor,
      mockQA
    );

    const runPromise = orchestrator.run('Implement feature X');

    // Wait slightly to let the orchestrator reach AWAITING_HUMAN_APPROVAL state
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(orchestrator.getState()).toBe('AWAITING_HUMAN_APPROVAL');

    // Human approves without feedback
    orchestrator.resume(true);

    const result = await runPromise;
    expect(result.isPerfect).toBe(true);
    expect(result.finalState).toBe('SUCCESS');
  });

  it('should pause in HITL mode and loop with feedback on rejection', async () => {
    const mockActor = vi.fn()
      .mockResolvedValueOnce('initial draft')
      .mockResolvedValueOnce('corrected draft');
    
    // First evaluation fails, second succeeds
    const mockQA = vi.fn()
      .mockResolvedValueOnce({ isPerfect: false, errors: ['missing tests'] })
      .mockResolvedValue({ isPerfect: true });

    const orchestrator = new HelenAIOrchestrator(
      { runMode: 'HITL' },
      mockActor,
      mockQA
    );

    const runPromise = orchestrator.run('Implement feature Y');

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(orchestrator.getState()).toBe('AWAITING_HUMAN_APPROVAL');

    // Human rejects and provides corrections
    orchestrator.resume(false, 'Please add unit tests for verification.');

    const result = await runPromise;
    expect(result.isPerfect).toBe(true);
    expect(result.loopCount).toBe(1);
    expect(result.finalState).toBe('SUCCESS');
    expect(mockActor).toHaveBeenLastCalledWith('Implement feature Y', 'Please add unit tests for verification.');
  });

  it('should timeout in HITL mode if no human response is received within configured timeframe', async () => {
    const mockActor = vi.fn().mockResolvedValue('draft');
    const mockQA = vi.fn().mockResolvedValue({ isPerfect: false, errors: ['low quality'] });

    const orchestrator = new HelenAIOrchestrator(
      { runMode: 'HITL', hitlTimeoutMs: 100 }, // short timeout for testing
      mockActor,
      mockQA
    );

    const result = await orchestrator.run('Implement service Z');
    
    expect(result.isPerfect).toBe(false);
    expect(result.finalState).toBe('FAILED');
    expect(orchestrator.getState()).toBe('FAILED');
  });
});
