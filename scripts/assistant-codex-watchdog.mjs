import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const HELEN_DIR = 'C:\\Users\\User\\Desktop\\ENEKO\\helen';
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\dbc03471-87a1-482c-b843-e43d4c5a807e';
const QUEUE_DIR = 'C:\\machine-profile\\ai-ecosystem\\orca_nightly_queue.json.jobs';
function getActiveTaskId() {
  try {
    const queueData = JSON.parse(fs.readFileSync('C:\\machine-profile\\ai-ecosystem\\orca_nightly_queue.json', 'utf8'));
    const active = queueData.tasks?.find(t => t.status === 'PENDING' || t.status === 'DISPATCHED' || t.status === 'RUNNING');
    return active ? active.id : 'task-4e2b1bf7ffbf4345b4206189b4ff7129';
  } catch {
    return 'task-4e2b1bf7ffbf4345b4206189b4ff7129';
  }
}
const TASK_ID = getActiveTaskId();

const runningFile = path.join(QUEUE_DIR, `${TASK_ID}.md.running.json`);
const completedFile = path.join(QUEUE_DIR, `${TASK_ID}.md.completed.json`);
const responseFile = path.join(QUEUE_DIR, `${TASK_ID}.md.response.txt`);
const handoffFile = path.join(HELEN_DIR, '.orca-handoff.md');
const auditArtifact = path.join(ARTIFACT_DIR, 'codex-execution-audit.md');

console.log('[Helen Watchdog] Iniciado centinela de supervisión para Codex...');
console.log(`[Helen Watchdog] Supervisando tarea: ${TASK_ID}`);

function getLiveQuota() {
  try {
    const raw = execSync('node "C:\\machine-profile\\ai-ecosystem\\orca-quota-live.cjs"', { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendNotification(title, message) {
  try {
    const psCmd = `
      . 'C:\\machine-profile\\ai-ecosystem\\telegram-client.ps1'
      . 'C:\\machine-profile\\ai-ecosystem\\ntfy-client.ps1'
      Send-TelegramNotice '${title}' '${message}'
      Send-QuotaNotice '${title}' '${message}'
    `;
    execSync(`powershell -NoProfile -Command "${psCmd.replace(/\n/g, '; ')}"`, { stdio: 'ignore', timeout: 10000 });
  } catch (e) {
    console.error('[Helen Watchdog] Error enviando notificaciones:', e.message);
  }
}

function verifyHelen() {
  try {
    const output = execSync('npx vitest run tests/assistantBrain.test.ts tests/assistantCodexBridge.test.ts', {
      cwd: HELEN_DIR,
      encoding: 'utf8',
      timeout: 30000,
    });
    const passedMatch = output.match(/(\d+)\s+passed/);
    const passed = passedMatch ? passedMatch[1] : 'OK';
    return { ok: true, summary: `${passed} tests pasados en verde.` };
  } catch (err) {
    return { ok: false, summary: `Fallo en tests: ${err.message?.slice(0, 200)}` };
  }
}

async function watch() {
  let done = false;
  while (!done) {
    // 1. Comprobar si sigue en ejecución
    const isRunning = fs.existsSync(runningFile);
    const isCompleted = fs.existsSync(completedFile);
    const quota = getLiveQuota();
    const primarySample = quota?.samples?.find(s => s.minutes === 300);
    const usedPercent = primarySample?.percent ?? 0;

    console.log(`[Helen Watchdog] [${new Date().toLocaleTimeString()}] Running: ${isRunning} | Cuota primaria usada: ${usedPercent}%`);

    // Alerta preventiva si cuota >= 95%
    if (usedPercent >= 95) {
      console.warn('[Helen Watchdog] ¡ADVERTENCIA! Cuota al 95%. Comprobando si se activó el protocolo de relevo...');
      sendNotification('Helen Alerta: Cuota Codex al 95%', 'Codex está alcanzando el límite de cuota (95%). Supervisando si genera .orca-handoff.md');
    }

    if (!isRunning && isCompleted) {
      console.log('[Helen Watchdog] ¡Codex ha finalizado la tarea!');
      done = true;

      // 2. Analizar completed.json y response.txt
      let completedData = {};
      try {
        completedData = JSON.parse(fs.readFileSync(completedFile, 'utf8'));
      } catch {
        console.warn('[Helen Watchdog] No se pudo leer el estado de finalización.');
      }

      let responseText = '(Sin respuesta capturada)';
      if (fs.existsSync(responseFile)) {
        try { responseText = fs.readFileSync(responseFile, 'utf8'); } catch {
          console.warn('[Helen Watchdog] No se pudo leer la respuesta capturada.');
        }
      }

      // 3. Comprobar si existe .orca-handoff.md
      const hasHandoff = fs.existsSync(handoffFile);
      let handoffContent = '';
      if (hasHandoff) {
        try { handoffContent = fs.readFileSync(handoffFile, 'utf8'); } catch {
          console.warn('[Helen Watchdog] No se pudo leer la ficha de relevo.');
        }
      }

      // 4. Verificar salud de Helen
      console.log('[Helen Watchdog] Verificando salud de Helen con la suite de pruebas...');
      const testResult = verifyHelen();

      // 5. Últimos commits de Git
      let gitLog = '';
      try {
        gitLog = execSync('git log -2 --oneline', { cwd: HELEN_DIR, encoding: 'utf8' }).trim();
      } catch {
        console.warn('[Helen Watchdog] No se pudo consultar el historial de Git.');
      }

      // 6. Generar Informe de Auditoría
      const report = `# 🛡️ Informe de Supervisión de Asistente Helen

- **Fecha de Auditoría**: ${new Date().toISOString()}
- **Tarea Supervisada**: \`${TASK_ID}\`
- **Estado de Finalización**: \`${completedData.status || 'FINISHED'}\`
- **Código de Salida**: \`${completedData.exitCode ?? 'N/A'}\`
- **Razón**: ${completedData.reason || 'Completado normalmente'}

---

## 1. Protocolo de Relevo (.orca-handoff.md)
* **¿Relevo preparado?**: ${hasHandoff ? '✅ **SÍ, GENERADO Y ACTIVO**' : '⚠️ **NO GENERADO** (Tarea finalizó antes de llegar a cuota crítica o sin emitir relevo)'}
${hasHandoff ? `\n\`\`\`markdown\n${handoffContent.slice(0, 1000)}\n\`\`\`` : ''}

---

## 2. Verificación de Funcionamiento de Helen
* **Resultado de Tests**: ${testResult.ok ? '✅ **PRUEBAS SELECCIONADAS SUPERADAS**' : '❌ **FALLO EN PRUEBAS**'}
* **Detalle**: ${testResult.summary}

---

## 3. Últimos Cambios en Git
\`\`\`text
${gitLog || 'Sin commits recientes.'}
\`\`\`

---

## 4. Respuesta / Resumen de Codex
\`\`\`text
${responseText.slice(0, 2500)}
\`\`\`
`;

      fs.writeFileSync(auditArtifact, report, 'utf8');
      console.log(`[Helen Watchdog] Informe guardado en: ${auditArtifact}`);

      // 7. Notificar al móvil
      const notifBody = `Codex ha terminado. Relevo: ${hasHandoff ? 'GENERADO' : 'NO'}. Tests Helen: ${testResult.ok ? 'VERDES (Funciona)' : 'FALLO'}.`;
      sendNotification('Helen: Tarea Codex Completada', notifBody);
      break;
    }

    // Esperar 15 segundos antes de la siguiente comprobación
    await new Promise(r => setTimeout(r, 15000));
  }
}

watch().catch(console.error);
