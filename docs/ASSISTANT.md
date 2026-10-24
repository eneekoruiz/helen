# HELEN as your personal assistant

Besides orchestrating coding agents, HELEN can be your own assistant and long-term memory: it keeps notes, reminders, lists and your agenda, reminds you on its own, and answers on the terminal, a chat page, Telegram and an Amazon Echo.

Everything lives in `~/.helen` (or the folder in `HELEN_HOME`), with permissions only you can read. Nothing goes into a project repository, and nothing leaves your machine unless you connect a channel or a model that does so (see [Privacy](#privacy)).

## Quick start

```bash
helen assistant config init --owner "Your name" --locale es-ES     # detects your time zone
helen remember "El wifi de casa se llama Casa_5G" --tags casa
helen remind llamar a mamá mañana a las 9
helen todo --list compra leche, huevos y pan
helen agenda            # today; also: mañana, semana
helen ask "¿qué tengo mañana?"
helen chat              # a conversation in the terminal
```

Every command accepts `--json` for scripts and agents.

## What it understands

HELEN reads everyday Spanish and English with rules (instant, offline, predictable):

| You say | HELEN does |
|---|---|
| "Recuérdame llamar a mamá mañana a las 9", "remind me to call mom at 9am" | A reminder at 09:00 tomorrow, in your time zone |
| "Recuérdame sacar la basura los martes y jueves a las 21", "every weekday at 7am" | A recurring reminder (daily, weekly by day, monthly, yearly, every N days/weeks) |
| "Recuérdame comprar un regalo para Ana" | Asks "¿Cuándo te lo recuerdo?" and takes your next message as the time |
| "Recuerda que el wifi de casa se llama Casa_5G" | A note. If it carries a future date ("el viernes a las 17 tengo dentista") it also schedules a reminder |
| "¿Cuál es el wifi de casa?", "¿cuándo es el dentista?", "what do you know about Ana?" | Searches notes, reminders and lists |
| "Añade leche, huevos y pan a la lista de la compra", "tengo que renovar el DNI antes del viernes" | One item per product on the shopping list; a task with a deadline |
| "Ya he comprado la leche", "tacha los huevos de la lista" | Ticks the item off |
| "¿Qué tengo hoy?", "agenda de esta semana", "buenos días" | Your agenda (a morning summary for "buenos días") |
| "Cancela el recordatorio de mamá", "pospónlo 10 minutos" | Cancels or snoozes; when several match, it asks which |
| "Olvida lo del wifi" | Asks for confirmation, then deletes the note for good |

Dates: "mañana", "pasado mañana", "el viernes por la tarde", "en 2 horas", "dentro de 3 días", "el 15 de noviembre a las 17:30", "a las nueve menos cuarto", "15/11" (day/month outside the US), ISO dates. Hours said as words, as voice assistants transcribe them, also work ("a las nueve y media"). Times are wall-clock times in your zone, so daylight saving changes do not move them.

## Commands

| Area | Commands |
|---|---|
| Notes | `helen remember <text> [--kind note\|fact\|idea\|decision\|person\|bookmark\|journal] [--tags ...] [--agents] [--sensitive] [--expires <when>]` · `helen recall <words>` · `helen notes` · `helen forget <id>` |
| Reminders | `helen remind <text with when>` · `helen remind "<text>" --at "<when>"` · `helen reminders [--all]` · `helen reminders cancel <words\|id>` · `helen reminders snooze <id> <when>` · `helen reminders done <id>` |
| Lists | `helen todo <task> [--list <name>] [--due <when>] [--priority high]` · `helen todo list [--list <name>]` · `helen todo done <words\|id>` · `helen todo rm <words\|id>` · `helen todo clear` |
| Agenda and chat | `helen agenda [hoy\|mañana\|semana]` · `helen ask <anything> [--speaker]` · `helen chat` |
| Setup | `helen assistant status` · `helen assistant config [show\|set <key> <value>\|init]` · `helen assistant check [--send-test]` · `helen assistant token [--show\|--rotate]` · `helen assistant export [--out <file>]` |
| Running | `helen assistant serve [--port] [--host] [--no-scheduler] [--no-telegram]` · `helen assistant service` |
| Channels | `helen assistant telegram setup\|allow <chat id>` · `helen assistant alexa setup\|model [--locale]` |

Notes are plain Markdown files in `~/.helen/memory/` (you can open them in any editor or in Obsidian); reminders, tasks and short conversation state are JSON files next to them.

## Getting reminders where you are

`helen assistant serve` runs the scheduler: it delivers every due reminder once, says when one comes late because HELEN was off, and moves recurring reminders to their next time. Only one scheduler runs per home. Channels:

| Channel | How to turn it on | Notes |
|---|---|---|
| Terminal | on by default | Lines in the server output |
| Desktop | on by default | `notify-send` (Linux), `osascript` (macOS) or a PowerShell balloon (Windows); skipped where missing |
| Phone (ntfy) | `helen assistant config set channels.webhook '{"url":"https://ntfy.sh/<a long private topic>","format":"ntfy"}'` | Install the ntfy app and subscribe to the same topic |
| Slack, Discord, any webhook | `format` `slack`, `discord` or `json` | |
| Telegram | `helen assistant telegram setup` | Also lets you chat with HELEN |

A daily summary at a fixed time: `helen assistant config set briefing.time 08:00`. Test every channel with `helen assistant check --send-test`.

To keep HELEN running, `helen assistant service` prints the systemd, launchd or Task Scheduler definition for your system.

## Chat page and API

`helen assistant serve` listens on `http://127.0.0.1:8787`:

- `/`: a chat page. It asks once for the token (`helen assistant token --show`) and keeps it in that browser only.
- `POST /chat {"text": "..."}`, `GET /agenda` (query `range`: `today`, `tomorrow` or `week`), `GET /reminders`, `GET /tasks` (query `list`, for example `compra`), `POST /remember {"text"}`, `POST /remind {"text", "when"}`: JSON API with `Authorization: Bearer <token>`.
- `GET /health`: no token.

The API limits requests per address, locks out an address after ten wrong tokens, caps request bodies at 64 KiB and serves the page with a strict Content Security Policy. Keep it on localhost and use a tunnel for remote access.

## Telegram

1. Create a bot with @BotFather and keep its token in an environment variable: `export HELEN_TELEGRAM_TOKEN=...`.
2. `helen assistant config set channels.telegram '{"tokenEnv":"HELEN_TELEGRAM_TOKEN"}'`
3. Run `helen assistant serve` and write to your bot. It answers strangers only with their chat id and the command that allows them: `helen assistant telegram allow <chat id>`.

The bot polls Telegram, so your computer needs no public address. Shortcuts: `/agenda`, `/manana`, `/semana`, `/compra [items]`, `/tareas`, `/recordatorios`, `/recuerda <texto>`, `/recuerdame <texto>`, `/busca <texto>`.

## Alexa and your Echo

See [ALEXA.md](ALEXA.md). In short: a private custom skill (`helen assistant alexa model` prints its interaction model), an HTTPS tunnel to `/alexa`, and your skill id in the config. Reminders you set by voice also become native Echo reminders, so the Echo itself rings.

## Free-form questions with a model (optional)

Rules cover the everyday requests. For anything else you can add a model:

- A local command, for example Claude Code in print mode: `helen assistant config set provider '{"type":"command","command":["claude","-p"]}'`. By default it receives the question with relevant notes and today's agenda and has no HELEN action tools. Enable `commandTools` for the validated action protocol described below.
- The Claude API with tools: `helen assistant config set provider '{"type":"anthropic","model":"<model id from the Anthropic docs>"}'` and an API key in `ANTHROPIC_API_KEY` (or name another variable in `keyEnv`). The model can search and save notes, create and cancel reminders and manage lists, through the same functions as the rules; every tool call is validated.

`mode` `fallback` (default) only sends what the rules do not understand; `always` sends every message. `timeoutMs` and `voiceTimeoutMs` bound waiting (voice assistants give up after about eight seconds, so HELEN answers from its own rules and memory when the model is slower). HELEN ships no default model id: pick one from your provider's documentation.

## Coding agents

Through `helen mcp`, coding agents get three tools: `helen_memory_search` (only notes you marked `--agents`, never private ones), `helen_memory_add` (saved as shared with agents, optionally tagged with the project) and `helen_remind`. Use them for conventions you are tired of repeating ("we use pnpm and conventional commits"). Set `shareAllMemoryWithAgents` to let agents read all non-private notes.

## Privacy

- **Credentials are refused**: passwords, API keys, tokens and card numbers, also when written in words ("la contraseña del banco es ..."). Use a password manager.
- **Private items**: notes and reminders that look like personal identifiers or door codes are marked private automatically (or with `--sensitive`). They are never spoken by Alexa, never sent to a model unless `provider.allowSensitive` is true, never returned to coding agents, and are shown only on channels listed in `privacy.showSensitiveOn` (default: terminal, API and chat page; not Telegram). Remote notification channels get "you have a private reminder" instead of the text.
- **What leaves your machine**: nothing by default. A webhook, Telegram or Alexa channel sends the messages it carries through that service; a model provider receives the questions sent to it (secrets are redacted first). Each one is off until you configure it.
- **Files**: `~/.helen` is created with mode 700 and files with mode 600; `helen assistant status` warns if that changed. `helen assistant export` writes everything as one JSON document for backups.

## Settings reference

`~/.helen/config.json` (edit with `helen assistant config set <key> <value>`; values are JSON when they parse as JSON):

| Key | Default | Meaning |
|---|---|---|
| `owner` | your user name | How HELEN addresses you |
| `locale` | `es-ES` | Language of answers and date reading |
| `timezone` | detected | IANA name, for example `Europe/Madrid` |
| `defaultTime` | `09:00` | Time used when only a day is given |
| `channels.console`, `channels.desktop` | `true` | Local delivery |
| `channels.webhook` | off | `{"url", "format": "json\|ntfy\|slack\|discord"}` |
| `channels.telegram` | off | `{"tokenEnv", "allowedChats": []}` |
| `provider` | off | `{"type": "anthropic\|command", "model", "keyEnv", "baseUrl", "effort", "command", "mode", "allowSensitive", "maxRounds", "timeoutMs", "voiceTimeoutMs"}` |
| `server.host`, `server.port` | `127.0.0.1`, `8787` | Where `helen assistant serve` listens |
| `alexa.skillIds`, `alexa.userIds`, `alexa.nativeReminders` | `[]`, `[]`, `true` | See [ALEXA.md](ALEXA.md) |
| `privacy.showSensitiveOn` | `["cli","http","web"]` | Channels allowed to show private items |
| `briefing.time` | off | Daily summary time, `HH:MM` |
| `shareAllMemoryWithAgents` | `false` | Let MCP clients read every non-private note |

The code lives in `src/assistant/` (brain, intents, dates, stores, scheduler, server, Telegram, Alexa) and `src/commands/assistantCmd.ts`.

## Conversations that continue

With a configured model, HELEN can discuss ideas, explain a subject, compare decisions, help write or study, and work through a problem. Follow-ups such as “develop the second option” receive the previous conversation. This uses the same brain in the terminal, web, Telegram and Alexa.

For an included Claude CLI subscription, sign in with `claude auth login`, keep extra usage disabled in the account, and configure:

```bash
helen assistant config set provider '{"type":"command","command":["claude","-p","--tools","","--no-session-persistence"],"commandTools":true,"subscriptionOnly":true,"mode":"always"}'
```

`commandTools` enables HELEN's structured JSON action protocol. CLI built-in tools are disabled in this example: HELEN validates each requested action and returns its result to the next model round. Identical repeated tool-call ids replay their recorded result instead of repeating a mutation. Malformed output fails safely. `subscriptionOnly` removes API credentials from the child environment; it does not change or inspect account billing settings. Without `commandTools`, command providers retain their original text-only behavior.

Each channel/session retains at most 24 messages and 24,000 characters locally, expires after two days without activity, and excludes credentials. Private context is withheld from providers by default and is never exposed through a speaker. Conversation context is separate from long-term notes: ordinary chat is not automatically saved as a durable preference.

- “¿Qué recuerdas de mí?” lists visible notes.
- “Borra la conversación” clears temporary context across channels.
- “Olvida lo de …” deletes a note after confirmation and clears cached conversation copies. An older model response cannot restore that history afterward.
- “Deshaz eso” undoes the last task/reminder change in that conversation for ten minutes, provided nothing else has changed those items. It does not undo permanent note deletion or retract an already sent notification.
- “Cámbialo al viernes” moves the last reminder.
- “Revisión semanal” summarizes pending, overdue and neglected tasks and delivery problems. The model also has a weekly-review tool for planning follow-ups.

For API models supporting adaptive thinking, set `provider.thinking` to `adaptive` and optionally `provider.effort` to a supported level. Unsupported model/settings combinations are reported as provider errors. `provider.maxOutputTokens` bounds the output (256–16000, default 4096). Tool rounds and timeouts remain bounded. An interrupted response reports incomplete work rather than claiming success; inspect tasks/reminders before retrying.

HELEN's conversation quality depends on the configured model. It has no live web search tool and does not claim to have verified current facts or accessed unconnected apps. A command provider is a trusted local executable with its own permissions; its program may access the machine even though HELEN does not expose action tools to that mode. Configuring a provider does not imply paid calls are authorized.

## Reliable notifications and recovery

New reminders retain their creation time zone, so changing your current zone does not move recurring appointments. Repeated wall-clock times during the autumn transition choose the earlier instant; nonexistent spring times follow the documented forward-shift policy in the time conversion code. Natural phrases such as “30 minutos antes de la cita mañana a las 10” create an advance notice; model/API calls can also pass `leadMinutes`.

Set silence hours with `helen assistant config set quietHours '{"start":"23:00","end":"08:00"}'`. Ordinary reminders wait until silence ends. An explicit `urgent: true` in a reminder request bypasses silence.

Native Echo alarms cannot express every scheduler policy: non-urgent reminders with configured quiet hours and recurring advance notices use HELEN's other configured channels, with an explicit spoken explanation. Existing Echo alarms keep their own schedule until removed. Native private reminders announce only that a private reminder exists. Model conversations keep the Echo microphone open for a follow-up.

Each occurrence and destination has a durable delivery record. Successful destinations are not resent when another destination fails. A crash or ambiguous network outcome stays `inflight`/`uncertain` for review; a remote service cannot guarantee exactly-once delivery. Failed reminders are no longer silently closed after a day.

```bash
helen assistant doctor                       # read-only checks; no model calls or test messages
helen assistant doctor --tunnel https://your-tunnel.example
helen assistant delivery status
helen assistant review
helen assistant backup /private/path/helen-backup.json
helen assistant restore /private/path/helen-backup.json
helen assistant restore-recover               # recover a restore interrupted by process death
```

Use `delivery resolve <key> sent` only after verifying receipt; `retry --accept-duplicate-risk` explicitly permits another send. Doctor checks configuration, model executable or credential presence, channel allowlists, unresolved deliveries and server/tunnel health. Presence checks do not prove model authentication or end-device delivery.

Backups exclude credentials, executable provider/webhook configuration and temporary conversations/undo. They contain personal data and must stay private. Restore requires the scheduler to be stopped, retains a private copy of the previous data, and cancels overdue restored reminders to prevent historical notification replay. Reconfigure omitted connections after moving machines.

The portable snapshot carries sanitized delivery identities. Restore merges them without turning a completed or uncertain send back into a retry. If a restore is interrupted, a durable transaction marker blocks ordinary changes until `restore-recover` rolls back the interrupted swap. Recovery retains the replacement files for inspection and invalidates pre-restore chat/undo context.

## Calendar files

```bash
helen assistant calendar export --out /private/path/reminders.ics
helen assistant calendar import /private/path/calendar.ics
```

Export omits sensitive items unless `--include-sensitive` is explicit. Events and dated tasks use stable UIDs; repeated imports skip known UIDs rather than overwriting changes or rearming delivered reminders. Interrupted imports resume from durable reservations. Input is fully validated before writing.

Supported recurrence must fit HELEN's recurrence model: unsupported COUNT/UNTIL/exceptions and short-month clamping cases are rejected explicitly. Explicitly private calendar tasks are rejected because the task store cannot preserve that classification. Files use IANA TZID identifiers without embedded VTIMEZONE definitions; real Google/Apple interoperability still needs a device/account check.

The authenticated API exposes `GET /review`, `GET /calendar` (text/calendar) and `POST /calendar {"calendar":"...ics..."}`. The existing `POST /remind` accepts `leadMinutes` and `urgent`.

## Browser conversation checks

After `npm run build`, run `node scripts/run-assistant-qa.mjs`. Playwright must already be available; `--playwright-module /absolute/path/to/playwright/index.mjs` reuses an existing installation. The script uses an isolated synthetic home, tests the actual web chat, records errors and saves six viewport/theme screenshots under the ignored `.helen/qa/` directory. Logout clears visible messages, credentials and the browser conversation identity; replies from the previous session are discarded. Stored notes remain until explicitly deleted.

For real conversations, authenticate with `claude auth login`, then add `--live --claude-extra-usage-disabled` only when extra usage is disabled in the Claude account. The script strips API credentials, requires subscription authentication and caps the session at 20 minutes and 32 provider invocations. It records actual duration; blocked authentication sends no evaluation prompts. Review the transcript to assess reasoning and context. Offline checks alone cannot establish conversation quality, and screenshots without a baseline cannot establish visual regression coverage.

## Correcting memory and interrupting requests

`de dónde sabes que prefiero estudiar` shows the matching memory's source, creation/update timestamps and expiry. Private memories stay hidden on speakers and unauthorized channels. Use the identifier shown in recall results to correct an item: `corrige el recuerdo m123abc: Prefiero estudiar por la mañana`. To keep a fact temporarily, say `recuerda hasta mañana a las 18: las llaves están en el cajón azul`, or change an existing item's expiry with `haz temporal el recuerdo m123abc hasta el viernes a las 18`. Expired memories disappear from retrieval; their files remain available for deliberate deletion. The model tools expose the same metadata and can set or remove expiry on explicit request.

`espera, eso no`, `cancela lo pendiente` or `stop` interrupts the current session, drops queued requests and clears unanswered confirmation/date questions. A new topic can start immediately. HTTP API generation is aborted and the command provider is signalled to stop; custom providers must cooperate with cancellation. No later tool may act for an interrupted turn. Completed atomic actions remain and can be reviewed or undone where supported. Physical microphone barge-in still depends on the voice channel delivering the interruption message.

## Turning a conversation failure into a regression

After a bad answer, use `prepara prueba: fragmento que debería contener la respuesta correcta`. HELEN previews up to three recent exchanges and the expected answer fragment. It rejects private turns and credentials and masks email/phone-shaped values. **Review names and indirect identifiers yourself**: redaction does not guarantee anonymity. Confirm with `sí` only after that review; `no` or a topic change discards the draft. Nothing is collected automatically or sent to a provider by this command. Cases stay in the private `assistant-regressions.json` file, with a maximum of 100 cases.

Repeat reviewed cases with `node scripts/run-assistant-qa.mjs --regressions /absolute/path/assistant-regressions.json`. Each case runs in a separate synthetic home with its recorded date and timezone; the runner checks the expected literal fragment, which is a regression assertion rather than a quality score. Cases requiring a model are explicitly skipped unless the authenticated subscription flags described above are supplied. Replay shares the same time/call budget with the conversation session. Reviewed cases can be copied into repository fixtures deliberately; private recordings are never committed automatically. Delete cases you no longer want retained separately from personal notes.
