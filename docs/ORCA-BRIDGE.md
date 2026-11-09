# Automations from Telegram (Orca bridge)

HELEN can tell you what is queued in [ai-ecosystem](https://github.com/eneekoruiz/ai-ecosystem) (the Orca queue), per provider, when quota returns, and can cancel or queue a task. It only reads the queue files; every change goes through `orca-queue.ps1`, which keeps its own locking and validation.

## Configure

```powershell
helen assistant config set automation.ecosystemDir "C:\machine-profile\ai-ecosystem"
helen assistant config set automation.projectPath "C:\Users\User\Desktop\ENEKO\helen"   # only needed to queue
```

Without `automation.ecosystemDir` HELEN says it is not configured and does nothing. Without `automation.projectPath` it reports and cancels but never queues.

## Say it

| You write | HELEN does |
| :--- | :--- |
| `/cola`, `qué hay en la cola`, `tareas programadas`, `cuota de claude` | Lists open work grouped by provider, with status, target time and the next quota returns. |
| `cancela la tarea 8b230d42` (or `/cancelar 8b230d42`) | Finds the one cancellable task with that id prefix, asks yes/no, then cancels. |
| `programa en codex mañana a las 9: continúa con el plan` | Parses the time, asks yes/no, then queues it. Goal after `: `. |

The id in brackets (`[8b230d42]`) is the first 8 hex characters of the task id.

## Limits

- Everything needs the verified owner channel. Voice and unverified channels get nothing and change nothing.
- Goals are shown only on channels allowed to show private text (`privacy.showSensitiveOn`); otherwise you see provider, status and time.
- Cancel works on `PENDING`, `WAITING_*` and `FAILED` tasks. Running or finished tasks are refused by the engine.
- Queueing: Claude or Codex, less than 24 hours ahead, goal 3 to 500 characters that does not start with `-` or `/`, passed to the engine as a single argument (no shell). It uses the `provider-cli` backend.
- Resuming a specific CLI conversation (`-ConversationId`) is supported by the engine and validated here, but there is no phrase for it yet.
- Quota times come from `quota_resets.json`, which the engine writes without a time zone; HELEN reads them in the PC's zone.

## Requires

An ai-ecosystem checkout with `orca-queue.ps1` that supports `-Cancel` and `-List -Json` (ai-ecosystem PR #2), and Windows PowerShell on the machine running HELEN.
