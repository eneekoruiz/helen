/**
 * The chat page served by `helen assistant serve` at "/". One file, no external resources, no data inside:
 * it asks once for the API token (kept in this browser only) and talks to /chat. Replies are inserted as text,
 * never as HTML.
 */
export function chatPage(nonce: string, lang: 'es' | 'en'): string {
  const es = lang === 'es';
  const t = {
    title: 'HELEN',
    placeholder: es ? 'Escribe o pregunta algo…' : 'Type or ask something…',
    send: es ? 'Enviar' : 'Send',
    tokenLabel: es ? 'Token de acceso (helen assistant token --show)' : 'Access token (helen assistant token --show)',
    save: es ? 'Guardar' : 'Save',
    forget: es ? 'Olvidar token' : 'Forget token',
    chips: es ? ['¿Qué tengo hoy?', 'Lista de la compra', 'Recordatorios', 'Ayuda'] : ['What do I have today?', 'Shopping list', 'My reminders', 'Help'],
    offline: es ? 'No puedo conectar con HELEN.' : 'Cannot reach HELEN.',
    denied: es ? 'Token incorrecto.' : 'Wrong token.',
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>HELEN</title>
<style nonce="${nonce}">
:root { --bg: #f6f4ef; --panel: #ffffff; --ink: #1d1b16; --muted: #5f5a4f; --line: #ddd7ca; --me: #1f3d36; --me-ink: #f6f4ef; --accent: #9a3b12; }
@media (prefers-color-scheme: dark) { :root { --bg: #141311; --panel: #1d1c19; --ink: #ece7dc; --muted: #a59e8f; --line: #34312b; --me: #d9cfb8; --me-ink: #141311; --accent: #f0a170; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; }
header { padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: baseline; gap: 12px; }
header h1 { margin: 0; font-size: 15px; letter-spacing: .14em; }
header span { color: var(--muted); font-size: 13px; }
main { overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.msg { max-width: min(640px, 88%); padding: 10px 14px; border-radius: 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
.helen { background: var(--panel); border: 1px solid var(--line); align-self: flex-start; border-bottom-left-radius: 4px; }
.me { background: var(--me); color: var(--me-ink); align-self: flex-end; border-bottom-right-radius: 4px; }
.error { color: var(--accent); align-self: center; font-size: 14px; }
footer { padding: 12px 16px 16px; border-top: 1px solid var(--line); display: grid; gap: 10px; }
.chips { display: flex; gap: 8px; overflow-x: auto; }
.chips button { flex: none; border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 14px; cursor: pointer; }
form { display: flex; gap: 8px; }
input { flex: 1; min-width: 0; border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 10px; padding: 12px; font: inherit; }
input:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
form button { border: 0; background: var(--ink); color: var(--bg); border-radius: 10px; padding: 0 18px; font: inherit; font-weight: 600; cursor: pointer; }
#token[hidden], #chat[hidden] { display: none; }
.link { background: none; border: 0; color: var(--muted); font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; justify-self: start; padding: 0; }
@media (prefers-reduced-motion: no-preference) { .msg { animation: in .16s ease-out; } @keyframes in { from { opacity: 0; transform: translateY(4px); } } }
</style>
</head>
<body>
<header><h1>HELEN</h1><span id="status"></span></header>
<main id="log" aria-live="polite"></main>
<footer>
  <form id="token" hidden>
    <input id="tokenInput" type="password" autocomplete="current-password" aria-label="${t.tokenLabel}" placeholder="${t.tokenLabel}">
    <button type="submit">${t.save}</button>
  </form>
  <div id="chat" hidden>
    <div class="chips">${t.chips.map(chip => `<button type="button" data-say="${chip}">${chip}</button>`).join('')}</div>
    <form id="ask"><input id="text" autocomplete="off" aria-label="${t.placeholder}" placeholder="${t.placeholder}" maxlength="4000"><button type="submit">${t.send}</button></form>
    <button type="button" class="link" id="forget">${t.forget}</button>
  </div>
</footer>
<script nonce="${nonce}">
(() => {
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
  const log = document.getElementById('log');
  const tokenForm = document.getElementById('token');
  const chat = document.getElementById('chat');
  let conversation = store.get('helen-conversation');
  if (!conversation) { conversation = Math.random().toString(36).slice(2, 12); store.set('helen-conversation', conversation); }
  const add = (text, who) => { const div = document.createElement('div'); div.className = 'msg ' + who; div.textContent = text; log.appendChild(div); log.scrollTop = log.scrollHeight; };
  const show = () => { const has = Boolean(store.get('helen-token')); tokenForm.hidden = has; chat.hidden = !has; (has ? document.getElementById('text') : document.getElementById('tokenInput')).focus(); };
  async function send(text) {
    if (!text.trim()) return;
    add(text, 'me');
    try {
      const response = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + store.get('helen-token'), 'X-Helen-Client': 'web' }, body: JSON.stringify({ text, conversation }) });
      if (response.status === 401) { add(${JSON.stringify(t.denied)}, 'error'); store.del('helen-token'); show(); return; }
      const data = await response.json();
      add(data.text || data.error || '…', data.error ? 'error' : 'helen');
    } catch { add(${JSON.stringify(t.offline)}, 'error'); }
  }
  tokenForm.addEventListener('submit', event => { event.preventDefault(); const value = document.getElementById('tokenInput').value.trim(); if (value) { store.set('helen-token', value); show(); } });
  document.getElementById('ask').addEventListener('submit', event => { event.preventDefault(); const input = document.getElementById('text'); const text = input.value; input.value = ''; send(text); });
  document.querySelectorAll('[data-say]').forEach(button => button.addEventListener('click', () => send(button.dataset.say)));
  document.getElementById('forget').addEventListener('click', () => { store.del('helen-token'); show(); });
  show();
})();
</script>
</body>
</html>
`;
}
