import React, { useState, useEffect, useRef } from 'react';
import { 
  HelenAIOrchestrator, 
  RunMode, 
  OrchestratorState, 
  TaskResult 
} from '../core/orchestrator';

interface OrchestratorUIProps {
  initialTask?: string;
  defaultMode?: RunMode;
  onTaskCompleted?: (result: TaskResult) => void;
}

export const OrchestratorUI: React.FC<OrchestratorUIProps> = ({
  initialTask = 'Auditar accesibilidad e higiene de código en el módulo de pagos',
  defaultMode = 'HITL',
  onTaskCompleted,
}) => {
  const [mode, setMode] = useState<RunMode>(defaultMode);
  const [task, setTask] = useState<string>(initialTask);
  const [state, setState] = useState<OrchestratorState>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [output, setOutput] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [maxLoops, setMaxLoops] = useState<number>(3);
  const [timeoutMs, setTimeoutMs] = useState<number>(30000); // 30 seconds default in UI
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const orchestratorRef = useRef<HelenAIOrchestrator | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle Mode Change
  const handleModeChange = (newMode: RunMode) => {
    setMode(newMode);
    if (orchestratorRef.current) {
      orchestratorRef.current.setMode(newMode);
    }
  };

  // Run the Orchestrator
  const startOrchestrator = async () => {
    if (!task.trim()) return;
    
    setIsProcessing(true);
    setLogs([]);
    setOutput('');
    setErrors([]);
    setFeedbackText('');

    // Initialize orchestrator instance with UI configuration
    const orchestrator = new HelenAIOrchestrator({
      runMode: mode,
      maxAutonomousLoops: maxLoops,
      hitlTimeoutMs: timeoutMs,
    });
    
    orchestratorRef.current = orchestrator;
    setState(orchestrator.getState());

    // Listeners for UI state updates
    orchestrator.onStateChange((newState) => {
      setState(newState);
      setErrors(orchestrator.getCurrentErrors());
      setOutput(orchestrator.getCurrentOutput());
    });

    orchestrator.onLog((message) => {
      setLogs((prev) => [...prev, message]);
    });

    try {
      const result = await orchestrator.run(task);
      if (onTaskCompleted) {
        onTaskCompleted(result);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [...prev, `[Fatal UI Error] Execution failed: ${errMsg}`]);
    } finally {
      setIsProcessing(false);
      orchestratorRef.current = null;
    }
  };

  // Human Decisions for HITL mode
  const handleApprove = () => {
    if (orchestratorRef.current && state === 'AWAITING_HUMAN_APPROVAL') {
      orchestratorRef.current.resume(true);
    }
  };

  const handleRejectAndCorrect = () => {
    if (orchestratorRef.current && state === 'AWAITING_HUMAN_APPROVAL') {
      orchestratorRef.current.resume(false, feedbackText || 'Rechazado por el usuario.');
      setFeedbackText('');
    }
  };

  // Helper to colorize log lines based on content
  const getLogStyle = (log: string): React.CSSProperties => {
    if (log.includes('State Transition')) return { color: '#8884d8', fontWeight: '500' };
    if (log.includes('Error') || log.includes('failed') || log.includes('Timeout')) return { color: '#ff4d4f' };
    if (log.includes('perfect') || log.includes('SUCCESS') || log.includes('Approved')) return { color: '#52c41a', fontWeight: 'bold' };
    if (log.includes('[QA Evaluator]')) return { color: '#ffa940' };
    if (log.includes('[Actor]')) return { color: '#1890ff' };
    return {};
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#fff',
      background: '#0d1117',
      padding: '30px',
      borderRadius: '16px',
      border: '1px solid #30363d',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #30363d', paddingBottom: '20px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(45deg, #58a6ff, #bc8cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Helen AI Orchestrator</span>
          <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>Dual Engine v1.1</span>
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#8b949e', fontSize: '0.95rem' }}>
          Gestión dinámica de flujos con bifurcación de control humana (HITL) o auto-corrección iterativa autónoma.
        </p>
      </div>

      {/* Control Configuration Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Run Mode Selector Toggle */}
        <div style={{ background: '#161b22', padding: '15px 20px', borderRadius: '12px', border: '1px solid #21262d' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            Modo de Ejecución
          </label>
          <div style={{
            display: 'flex',
            background: '#0d1117',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid #30363d',
          }}>
            <button
              onClick={() => handleModeChange('AUTONOMOUS')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'AUTONOMOUS' ? 'linear-gradient(135deg, #1f6feb, #388bfd)' : 'transparent',
                color: mode === 'AUTONOMOUS' ? '#fff' : '#8b949e',
                fontWeight: mode === 'AUTONOMOUS' ? 'bold' : 'normal',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Automático (Auto-Loop)
            </button>
            <button
              onClick={() => handleModeChange('HITL')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'HITL' ? 'linear-gradient(135deg, #8957e5, #ab7df6)' : 'transparent',
                color: mode === 'HITL' ? '#fff' : '#8b949e',
                fontWeight: mode === 'HITL' ? 'bold' : 'normal',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Manual (HITL)
            </button>
          </div>
        </div>

        {/* Hyperparameters Configuration */}
        <div style={{ background: '#161b22', padding: '15px 20px', borderRadius: '12px', border: '1px solid #21262d', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 'bold' }}>
              Parámetros de Robustez
            </label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Max loops: {maxLoops}</span>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={maxLoops}
                  disabled={isProcessing}
                  onChange={(e) => setMaxLoops(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#58a6ff', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Timeout HITL: {timeoutMs / 1000}s</span>
                <input 
                  type="range" 
                  min="5000" 
                  max="120000" 
                  step="5000"
                  value={timeoutMs}
                  disabled={isProcessing}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#bc8cff', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task input field */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 'bold' }}>
          Definición de la Tarea / Prompt
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={task}
            disabled={isProcessing}
            onChange={(e) => setTask(e.target.value)}
            style={{
              flex: 1,
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '12px 15px',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <button
            onClick={startOrchestrator}
            disabled={isProcessing}
            style={{
              padding: '12px 25px',
              borderRadius: '8px',
              border: 'none',
              background: isProcessing ? '#21262d' : 'linear-gradient(135deg, #238636, #2ea043)',
              color: isProcessing ? '#8b949e' : '#fff',
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(35, 134, 54, 0.2)',
            }}
          >
            {isProcessing ? 'Procesando...' : 'Lanzar Tarea'}
          </button>
        </div>
      </div>

      {/* Execution Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ fontSize: '0.9rem', color: '#8b949e' }}>
          Estado de la Máquina de Estados:
        </span>
        <span style={{
          fontSize: '0.85rem',
          padding: '6px 12px',
          borderRadius: '20px',
          fontWeight: 'bold',
          border: '1px solid',
          background: 
            state === 'IDLE' ? '#161b22' :
            state === 'EXECUTING_TASK' ? '#0c2d6b' :
            state === 'EVALUATING' ? '#4c2d00' :
            state === 'AWAITING_HUMAN_APPROVAL' ? '#3b185f' :
            state === 'CORRECTING' ? '#2b1055' :
            state === 'SUCCESS' ? '#1b4721' : '#4a1212',
          borderColor:
            state === 'IDLE' ? '#30363d' :
            state === 'EXECUTING_TASK' ? '#58a6ff' :
            state === 'EVALUATING' ? '#ffa940' :
            state === 'AWAITING_HUMAN_APPROVAL' ? '#ab7df6' :
            state === 'CORRECTING' ? '#d3a4ff' :
            state === 'SUCCESS' ? '#52c41a' : '#ff4d4f',
          color:
            state === 'IDLE' ? '#8b949e' :
            state === 'EXECUTING_TASK' ? '#58a6ff' :
            state === 'EVALUATING' ? '#ffa940' :
            state === 'AWAITING_HUMAN_APPROVAL' ? '#d3a4ff' :
            state === 'CORRECTING' ? '#e2c5ff' :
            state === 'SUCCESS' ? '#52c41a' : '#ff4d4f',
        }}>
          {state}
        </span>
      </div>

      {/* Output and QA Check Panel */}
      {output && (
        <div style={{ background: '#161b22', padding: '20px', borderRadius: '12px', border: '1px solid #21262d', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Último Output del Nodo Actor
          </h4>
          <div style={{
            background: '#0d1117',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #30363d',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            whiteSpace: 'pre-wrap',
            marginBottom: '15px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {output}
          </div>

          {/* QA Errors if any */}
          {errors.length > 0 && (
            <div style={{ background: '#2c1515', border: '1px solid #6b2d2d', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#ff7875', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Auditoría de Calidad (Errores detectados):
              </h5>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#ffccc7', fontSize: '0.85rem' }}>
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* REACTIVE BUTTON MANAGEMENT */}
          {mode === 'AUTONOMOUS' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: '#0d1117', borderRadius: '8px', border: '1px solid #21262d' }}>
              <span style={{ fontSize: '0.85rem', color: '#8b949e', fontStyle: 'italic' }}>
                ⚡ Modo Autónomo activo: La máquina de estados corregirá automáticamente los errores.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Feedback Input Field */}
              {state === 'AWAITING_HUMAN_APPROVAL' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#8b949e', marginBottom: '8px' }}>
                    Añade correcciones o feedback para el Agente (Requerido para rechazar):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej. Añade comentarios JSDoc y encapsula el manejo de errores en un bloque try/catch..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0d1117',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              {/* Reactive Decision Buttons */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={handleApprove}
                  disabled={state !== 'AWAITING_HUMAN_APPROVAL'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: state === 'AWAITING_HUMAN_APPROVAL' ? 'pointer' : 'not-allowed',
                    background: state === 'AWAITING_HUMAN_APPROVAL'
                      ? 'linear-gradient(135deg, #238636, #2ea043)'
                      : '#21262d',
                    color: state === 'AWAITING_HUMAN_APPROVAL' ? '#fff' : '#484f58',
                    animation: state === 'AWAITING_HUMAN_APPROVAL' ? 'pulseGlow 2s infinite' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Aprobar Output
                </button>
                <button
                  onClick={handleRejectAndCorrect}
                  disabled={state !== 'AWAITING_HUMAN_APPROVAL'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #f85149',
                    fontWeight: 'bold',
                    cursor: state === 'AWAITING_HUMAN_APPROVAL' ? 'pointer' : 'not-allowed',
                    background: state === 'AWAITING_HUMAN_APPROVAL' ? 'rgba(248, 81, 73, 0.15)' : 'transparent',
                    color: state === 'AWAITING_HUMAN_APPROVAL' ? '#f85149' : '#484f58',
                    borderColor: state === 'AWAITING_HUMAN_APPROVAL' ? '#f85149' : '#30363d',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Rechazar y Corregir
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logs Console Terminal */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 'bold' }}>
          Terminal de Logs & Progreso
        </label>
        <div style={{
          background: '#010409',
          border: '1px solid #30363d',
          borderRadius: '10px',
          padding: '15px',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '0.85rem',
          height: '220px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#484f58', fontStyle: 'italic' }}>Esperando el inicio de la tarea...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={getLogStyle(log)}>
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Global CSS Style tag for subtle pulsing animations */}
      <style>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(35, 134, 54, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 15px 5px rgba(35, 134, 54, 0.6);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(35, 134, 54, 0.4);
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
