/**
 * The chat page served by `helen assistant serve` at "/". One file, no external resources, no data inside:
 * it asks once for the API token (kept in this browser only) and talks to /chat. Replies are inserted as text,
 * never as HTML.
 */
export function chatPage(nonce: string, lang: "es" | "en"): string {
  const es = lang === "es";
  const t = {
    title: "HELEN",
    placeholder: es ? "Escribe o pregunta algo…" : "Type or ask something…",
    send: es ? "Enviar" : "Send",
    tokenLabel: es
      ? "Token de acceso (helen assistant token --show)"
      : "Access token (helen assistant token --show)",
    save: es ? "Guardar" : "Save",
    forget: es ? "Olvidar token" : "Forget token",
    chips: es
      ? ["¿Qué tengo hoy?", "Lista de la compra", "Recordatorios", "Ayuda"]
      : ["What do I have today?", "Shopping list", "My reminders", "Help"],
    offline: es ? "No puedo conectar con HELEN." : "Cannot reach HELEN.",
    denied: es ? "Token incorrecto." : "Wrong token.",
    settings: es ? "Ajustes" : "Settings",
    close: es ? "Cerrar" : "Close",
    attach: es ? "Adjuntar" : "Attach",
    voice: es ? "Dictar" : "Dictate",
    confirm: es ? "Confirmar tareas" : "Confirm tasks",
    discard: es ? "Descartar" : "Discard",
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
html, body { overflow-x: clip; color-scheme: light dark; }
[hidden] { display: none !important; }
button, a { touch-action: manipulation; }
a { color: var(--accent); }
button { min-height: 36px; white-space: nowrap; }
select, textarea { min-width: 0; max-width: 100%; background: var(--panel); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 9px; font: inherit; }
textarea { width: 100%; min-height: 72px; resize: vertical; }
button:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; }
body { grid-template-columns: minmax(0, 1fr); }
main, footer, #chat, .chips { min-width: 0; }
header { padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; min-width: 0; }
header #settingsOpen { margin-left: auto; }
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
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 10px; }
.hint { color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
dialog { color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 12px; width: min(94vw, 600px); max-height: 86dvh; padding: 20px; overflow: auto; }
dialog::backdrop { background: #0009; }
dialog h2 { margin: 0 0 16px; font-size: 21px; }
dialog h3 { margin: 20px 0 8px; font-size: 17px; }
dialog form, .fields { display: grid; gap: 12px; }
dialog label { display: grid; gap: 5px; min-width: 0; }
dialog label.check { display: flex; align-items: center; gap: 10px; }
dialog input[type=checkbox] { flex: none; width: 20px; height: 20px; }
dialog button { min-height: 40px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; }
.dialogHead { display: flex; justify-content: space-between; align-items: start; gap: 8px; position: sticky; top: 0; background: var(--bg); z-index: 1; }
.candidate { display: grid; gap: 6px; border-top: 1px solid var(--line); padding: 12px 0; }
body.large { font-size: 20px; }
body.large input, body.large select, body.large textarea { font-size: 20px; }
body.large .hint, body.large .link, body.large .chips button { font-size: 16px; }
@media(max-width: 414px) { header, main, footer { padding-left: 12px; padding-right: 12px; } form { gap: 6px; } form button { padding: 0 12px; } dialog { padding: 14px; } }
@media (prefers-reduced-motion: no-preference) { .msg { animation: in .16s ease-out; } @keyframes in { from { opacity: 0; transform: translateY(4px); } } }
</style>
</head>
<body>
<header><h1>HELEN</h1><span id="status" role="status"></span><button id="settingsOpen" type="button" class="link" hidden>${t.settings}</button></header>
<main id="log" aria-live="polite"></main>
<footer>
  <form id="token" hidden>
    <input id="tokenInput" type="password" autocomplete="current-password" aria-label="${t.tokenLabel}" placeholder="${t.tokenLabel}">
    <button type="submit">${t.save}</button>
  </form>
  <div id="chat" hidden>
    <div class="chips">${t.chips.map((chip) => `<button type="button" data-say="${chip}">${chip}</button>`).join("")}</div>
    <form id="ask"><input id="text" autocomplete="off" aria-label="${t.placeholder}" placeholder="${t.placeholder}" maxlength="4000"><button type="submit">${t.send}</button></form>
    <div class="toolbar"><button type="button" class="link" id="voice">${t.voice}</button><button type="button" class="link" id="attach">${t.attach}</button><button type="button" class="link" id="forget">${t.forget}</button></div>
    <p id="voiceHint" class="hint" role="status"></p>
    <input id="file" type="file" hidden accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.wav,.mp3,.ogg,text/plain,text/markdown,application/pdf,image/png,image/jpeg,audio/wav,audio/mpeg,audio/ogg">
  </div>
</footer>
<dialog id="settings" aria-labelledby="settingsTitle">
  <div class="dialogHead"><h2 id="settingsTitle">${t.settings}</h2><button id="settingsClose" type="button">${t.close}</button></div>
  <form id="preferences">
    <label>${es ? "Detalle de las respuestas" : "Response detail"}<select id="detail"><option value="brief">${es ? "Breve" : "Brief"}</option><option value="balanced">${es ? "Equilibrado" : "Balanced"}</option><option value="detailed">${es ? "Detallado" : "Detailed"}</option></select></label>
    <label>${es ? "Idioma preferido" : "Preferred language"}<select id="preferredLanguage"><option value="es-ES">Español</option><option value="en-US">English</option><option value="fr-FR">Français</option><option value="eu-ES">Euskara</option></select></label>
    <label class="check"><input id="simpleLanguage" type="checkbox">${es ? "Lenguaje sencillo" : "Simple language"}</label>
    <label class="check"><input id="stepByStep" type="checkbox">${es ? "Paso a paso" : "Step by step"}</label>
    <label class="check"><input id="largeText" type="checkbox">${es ? "Texto grande en este navegador" : "Large text in this browser"}</label>
    <label class="check"><input id="readReplies" type="checkbox">${es ? "Leer respuestas en voz alta" : "Read replies aloud"}</label>
    <p class="hint">${es ? "El dictado depende del navegador y puede utilizar el servicio de su proveedor. Actívalo solo si aceptas compartir el audio con ese servicio." : "Dictation depends on your browser and may use its provider’s service. Activate it only if you accept sharing audio with that service."}</p>
    <button type="submit">${t.save}</button>
  </form>
  <h3>Gmail</h3><p id="gmailStatus" class="hint" role="status"></p>
  <div class="fields" id="gmailCredentials"><label>Google OAuth client ID<input id="googleClientId" autocomplete="off" maxlength="500"></label><label>${es ? "Secreto del cliente (si se necesita)" : "Client secret (if needed)"}<input id="googleClientSecret" type="password" autocomplete="off" maxlength="1000"></label><p class="hint">${es ? "Solo para la conexión inicial. Usa el cliente OAuth de tu instalación; HELEN pedirá autorización a Google." : "Initial connection only. Use your installation’s OAuth client; HELEN will ask Google for authorization."}</p></div>
  <div class="toolbar"><button id="gmailConnect" type="button">${es ? "Conectar" : "Connect"}</button><button id="gmailRefresh" type="button">${es ? "Actualizar estado" : "Refresh status"}</button><button id="gmailDisconnect" type="button">${es ? "Desconectar" : "Disconnect"}</button></div>
  <p><a id="gmailConsent" hidden target="_blank" rel="noopener noreferrer">${es ? "Autorizar en Google" : "Authorize with Google"}</a></p>
  <form id="contact"><label>${es ? "Nombre del contacto" : "Contact name"}<input id="contactName" maxlength="100" required></label><label>Email<input id="contactEmail" type="email" maxlength="254" required></label><button type="submit">${es ? "Guardar contacto" : "Save contact"}</button></form>
  <h3>Recordatorios</h3><p id="recordatoriosStatus" class="hint" role="status"></p>
  <p class="hint">${es ? "Conecta tu cuenta de la aplicación de Recordatorios para sincronizar tareas. El servidor de esa aplicación debe tener desplegada la integración de HELEN." : "Connect your Recordatorios account to synchronize tasks. That application must have the HELEN integration deployed."}</p>
  <form id="recordatoriosConnect"><label>${es ? "Dirección de la aplicación" : "Application address"}<input id="recordatoriosOrigin" type="url" value="https://eneko-ruiz.com" required></label><label>Email<input id="recordatoriosEmail" type="email" autocomplete="username" maxlength="254" required></label><label>${es ? "Contraseña" : "Password"}<input id="recordatoriosPassword" type="password" autocomplete="off" maxlength="1000" required></label><label>${es ? "Código de verificación (si está activado)" : "Verification code (if enabled)"}<input id="recordatoriosCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"></label><button type="submit">${es ? "Conectar Recordatorios" : "Connect Recordatorios"}</button></form>
  <div class="toolbar"><button type="button" id="recordatoriosRefresh">${es ? "Actualizar conexión" : "Refresh connection"}</button><button type="button" id="recordatoriosDisconnect" disabled>${es ? "Desconectar Recordatorios" : "Disconnect Recordatorios"}</button></div>
  <p id="recordatoriosMessage" class="hint" role="status"></p>
  <p id="settingsMessage" class="hint" role="status"></p>
</dialog>
<dialog id="capture" aria-labelledby="captureTitle"><div class="dialogHead"><h2 id="captureTitle">${es ? "Revisar tareas propuestas" : "Review proposed tasks"}</h2><button type="button" id="captureDiscard">${t.discard}</button></div><p class="hint">${es ? "Revisa texto y fechas. Confirmar guarda estas tareas; cerrar no guarda tareas." : "Review text and dates. Confirm saves these tasks; closing saves no tasks."}</p><div id="candidates"></div><p id="captureMessage" class="hint" role="status"></p><button type="button" id="captureConfirm">${t.confirm}</button></dialog>
<script nonce="${nonce}">
(() => {
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
  const log = document.getElementById('log');
  const tokenForm = document.getElementById('token');
  const chat = document.getElementById('chat');
  const el = id => document.getElementById(id);
  let draft = null;
  let captureRevision = 0;
  let recognition = null;
  let reading = false;
  let session = 0;
  let conversation = store.get('helen-conversation');
  if (!conversation) { conversation = Math.random().toString(36).slice(2, 12); store.set('helen-conversation', conversation); }
  const add = (text, who) => { const div = document.createElement('div'); div.className = 'msg ' + who; div.textContent = text; log.appendChild(div); log.scrollTop = log.scrollHeight; };
  const show = () => { const has = Boolean(store.get('helen-token')); tokenForm.hidden = has; chat.hidden = !has; el('settingsOpen').hidden = !has; if(!has)el('recordatoriosConnect').querySelector('button').disabled=false; (has ? el('text') : el('tokenInput')).focus(); };
  const clearCapture = () => { captureRevision++; draft = null; el('candidates').replaceChildren(); el('captureMessage').textContent = ''; el('file').value = ''; el('captureConfirm').disabled = false; };
  const logout = () => { session++; store.del('helen-token'); store.del('helen-conversation'); conversation = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 12); store.set('helen-conversation', conversation); log.replaceChildren(); ['text','tokenInput','googleClientId','googleClientSecret','contactName','contactEmail','recordatoriosEmail','recordatoriosPassword','recordatoriosCode'].forEach(id => el(id).value = ''); ['settingsMessage','gmailStatus','voiceHint','recordatoriosStatus','recordatoriosMessage'].forEach(id => el(id).textContent = ''); el('recordatoriosOrigin').value = 'https://eneko-ruiz.com'; el('recordatoriosDisconnect').disabled = true; el('detail').value = 'balanced'; el('preferredLanguage').value = document.documentElement.lang === 'es' ? 'es-ES' : 'en-US'; el('simpleLanguage').checked = false; el('stepByStep').checked = false; el('gmailConsent').hidden = true; el('gmailConsent').removeAttribute('href'); el('settings').close(); el('capture').close(); clearCapture(); recognition?.abort(); reading = false; el('readReplies').checked = false; window.speechSynthesis?.cancel(); show(); };
  async function api(url, body) {
    const requestSession = session;
    const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + store.get('helen-token'), 'X-Helen-Client': 'web' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (requestSession !== session) throw new Error('session-ended');
    if (response.status === 401) { logout(); throw new Error(${JSON.stringify(t.denied)}); }
    const data = await response.json();
    if (requestSession !== session) throw new Error('session-ended');
    if (!response.ok) throw new Error(data.error || ${JSON.stringify(t.offline)});
    return data;
  }
  async function run(action, target = 'settingsMessage') { const current = session; try { await action(); } catch(error) { if(current === session) el(target).textContent = error.message || ${JSON.stringify(t.offline)}; } }
  async function send(text) {
    if (!text.trim()) return;
    const requestSession = session;
    add(text, 'me');
    try {
      const response = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + store.get('helen-token'), 'X-Helen-Client': 'web' }, body: JSON.stringify({ text, conversation, requestId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) }) });
      if (requestSession !== session) return;
      if (response.status === 401) { logout(); add(${JSON.stringify(t.denied)}, 'error'); return; }
      const data = await response.json();
      if (requestSession !== session) return;
      add(data.text || data.error || '…', data.error ? 'error' : 'helen');
      if (reading && data.text && window.speechSynthesis) { const utterance = new SpeechSynthesisUtterance(data.text); utterance.lang = el('preferredLanguage').value || document.documentElement.lang; window.speechSynthesis.speak(utterance); }
    } catch { if (requestSession === session) add(${JSON.stringify(t.offline)}, 'error'); }
  }
  tokenForm.addEventListener('submit', event => { event.preventDefault(); const value = document.getElementById('tokenInput').value.trim(); if (value) { store.set('helen-token', value); el('tokenInput').value = ''; show(); } });
  document.getElementById('ask').addEventListener('submit', event => { event.preventDefault(); const input = document.getElementById('text'); const text = input.value; input.value = ''; send(text); });
  document.querySelectorAll('[data-say]').forEach(button => button.addEventListener('click', () => send(button.dataset.say)));
  document.getElementById('forget').addEventListener('click', logout);
  const large = store.get('helen-large-text') === 'true'; document.body.classList.toggle('large', large); el('largeText').checked = large;
  el('largeText').addEventListener('change', () => { document.body.classList.toggle('large', el('largeText').checked); store.set('helen-large-text', String(el('largeText').checked)); });
  el('readReplies').disabled = !window.speechSynthesis;
  el('readReplies').addEventListener('change', () => { reading = el('readReplies').checked; if(!reading) window.speechSynthesis?.cancel(); });
  async function refreshGmail() { const data = await api('/gmail/status'); el('gmailStatus').textContent = data.connection ? ${JSON.stringify(es ? "Conectado: " : "Connected: ")} + data.connection.account : ${JSON.stringify(es ? "Gmail sin conectar." : "Gmail is not connected.")}; el('gmailCredentials').hidden = Boolean(data.connection); el('gmailDisconnect').disabled = !data.connection; }
  el('settingsOpen').addEventListener('click', () => { el('settings').showModal(); run(async () => { const data = await api('/preferences'); el('detail').value = data.assistance.detail; el('simpleLanguage').checked = data.assistance.simpleLanguage; el('stepByStep').checked = data.assistance.stepByStep; el('preferredLanguage').value = data.assistance.preferredLanguage || data.locale; await Promise.all([run(refreshGmail),run(refreshRecordatorios,'recordatoriosMessage')]); }); });
  el('settingsClose').addEventListener('click', () => el('settings').close());
  el('settings').addEventListener('close', () => { ['googleClientSecret','recordatoriosPassword','recordatoriosCode'].forEach(id=>el(id).value=''); });
  el('preferences').addEventListener('submit', event => { event.preventDefault(); run(async () => { await api('/preferences', { assistance: { detail: el('detail').value, simpleLanguage: el('simpleLanguage').checked, stepByStep: el('stepByStep').checked, preferredLanguage: el('preferredLanguage').value } }); el('settingsMessage').textContent = ${JSON.stringify(es ? "Preferencias guardadas." : "Preferences saved.")}; }); });
  el('gmailRefresh').addEventListener('click', () => run(refreshGmail));
  el('gmailConnect').addEventListener('click', () => run(async () => { const clientId = el('googleClientId').value.trim(); const clientSecret = el('googleClientSecret').value; el('googleClientSecret').value = ''; const data = await api('/gmail/connect', { conversation, redirectUri: window.location.origin + '/gmail/callback', ...(clientId ? {clientId} : {}), ...(clientSecret ? {clientSecret} : {}) }); const url = new URL(data.url); if(url.protocol !== 'https:' || url.hostname !== 'accounts.google.com') throw new Error('Invalid Google authorization URL.'); el('gmailConsent').href = url.href; el('gmailConsent').hidden = false; el('gmailConsent').focus(); }));
  el('gmailDisconnect').addEventListener('click', () => { if(window.confirm(${JSON.stringify(es ? "¿Desconectar Gmail y revocar el acceso?" : "Disconnect Gmail and revoke access?")})) run(async () => { const disconnected = await api('/gmail/disconnect', {confirm:true}); el('gmailConsent').hidden = true; el('gmailConsent').removeAttribute('href'); await refreshGmail(); el('settingsMessage').textContent = disconnected.revoked ? ${JSON.stringify(es ? "Gmail desconectado y acceso revocado." : "Gmail disconnected and access revoked.")} : ${JSON.stringify(es ? "Gmail desconectado localmente. No pude confirmar la revocación: revoca el acceso a HELEN desde la seguridad de tu cuenta de Google." : "Gmail disconnected locally. Revocation could not be confirmed: revoke HELEN access in your Google account security settings.")}; }); });
  el('contact').addEventListener('submit', event => { event.preventDefault(); run(async () => { const data = await api('/gmail/contacts', {name:el('contactName').value.trim(),email:el('contactEmail').value.trim()}); el('contactName').value = ''; el('contactEmail').value = ''; el('settingsMessage').textContent = ${JSON.stringify(es ? "Contacto guardado: " : "Contact saved: ")} + data.saved; }); });
  async function refreshRecordatorios() { const current=session; el('recordatoriosStatus').textContent=${JSON.stringify(es ? "Verificando conexión…" : "Checking connection…")}; try { const data=await api('/recordatorios/status'); el('recordatoriosStatus').textContent=data.connected ? ${JSON.stringify(es ? "Recordatorios conectado." : "Recordatorios connected.")} : ${JSON.stringify(es ? "Recordatorios sin conectar." : "Recordatorios is not connected.")}; el('recordatoriosDisconnect').disabled=!data.connected; if(data.url||data.origin)el('recordatoriosOrigin').value=data.url||data.origin; } catch(error) { if(current===session)el('recordatoriosStatus').textContent=${JSON.stringify(es ? "Conexión de Recordatorios sin verificar." : "Recordatorios connection could not be verified.")}; throw error; } }
  el('recordatoriosConnect').addEventListener('submit',event=>{event.preventDefault();run(async()=>{ const current=session; const button=el('recordatoriosConnect').querySelector('button');const password=el('recordatoriosPassword').value;const code=el('recordatoriosCode').value.trim();el('recordatoriosPassword').value='';el('recordatoriosCode').value='';button.disabled=true;try{await api('/recordatorios/connect',{url:el('recordatoriosOrigin').value.trim(),email:el('recordatoriosEmail').value.trim(),password,...(code?{code}:{})});await refreshRecordatorios();el('recordatoriosMessage').textContent=${JSON.stringify(es ? "Conexión verificada. La sincronización necesita el servidor de HELEN en ejecución." : "Connection verified. Synchronization requires the HELEN server to be running.")};}finally{if(current===session)button.disabled=false;}},'recordatoriosMessage');});
  el('recordatoriosRefresh').addEventListener('click',()=>run(refreshRecordatorios,'recordatoriosMessage'));
  el('recordatoriosDisconnect').addEventListener('click',()=>{if(window.confirm(${JSON.stringify(es ? "¿Desconectar Recordatorios? Las tareas y el registro de sincronización se conservan." : "Disconnect Recordatorios? Tasks and the synchronization ledger are preserved.")}))run(async()=>{await api('/recordatorios/disconnect',{confirm:true});await refreshRecordatorios();el('recordatoriosMessage').textContent=${JSON.stringify(es ? "Recordatorios desconectado; las tareas se conservan." : "Recordatorios disconnected; tasks are preserved.")};},'recordatoriosMessage');});
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceNotice = ${JSON.stringify(es ? "El dictado puede usar el servicio del navegador. Revisa el texto si hay dudas." : "Dictation may use your browser provider’s service. Review uncertain text.")};
  el('voiceHint').textContent = Recognition ? voiceNotice : ${JSON.stringify(es ? "Dictado no disponible en este navegador. Puedes escribir o adjuntar un audio para transcripción local." : "Dictation is unavailable in this browser. Type or attach audio for local transcription.")};
  el('voice').disabled = !Recognition;
  el('voice').addEventListener('click', () => { if(!Recognition) return; if(recognition) { recognition.stop(); return; } const current = session; const active = new Recognition(); recognition = active; active.lang = el('preferredLanguage').value || document.documentElement.lang; active.interimResults = true; active.onresult = event => { if(current !== session) return; const result = event.results[event.resultIndex]; const alternative = result?.[0]; if(!alternative) return; el('text').value = alternative.transcript; if(result.isFinal && alternative.confidence >= .65) { const value = el('text').value; el('text').value = ''; send(value); } else if(result.isFinal) { el('voiceHint').textContent = ${JSON.stringify(es ? "Revisa el dictado y pulsa Enviar." : "Review the dictation and press Send.")}; el('text').focus(); } }; active.onerror = () => { if(current === session) el('voiceHint').textContent = ${JSON.stringify(es ? "No se pudo usar el micrófono. Revisa el permiso del navegador o escribe tu mensaje." : "The microphone could not be used. Check browser permission or type your message.")}; }; active.onend = () => { if(recognition === active) recognition = null; el('voice').textContent = ${JSON.stringify(t.voice)}; }; try { active.start(); el('voice').textContent = ${JSON.stringify(es ? "Detener" : "Stop")}; } catch { recognition = null; el('voiceHint').textContent = voiceNotice; } });
  el('attach').addEventListener('click', () => el('file').click());
  el('file').addEventListener('change', () => run(async () => { const file = el('file').files[0]; if(!file) return; if(file.size > 10 * 1024 * 1024) throw new Error(${JSON.stringify(es ? "El adjunto supera los 10 MB." : "The attachment exceeds 10 MB.")}); const extensions = {txt:'text/plain',md:'text/markdown',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg'}; const mime = extensions[file.name.split('.').pop().toLowerCase()]; if(!mime) throw new Error(${JSON.stringify(es ? "Formato no compatible." : "Unsupported file format.")}); const current = session; const revision = ++captureRevision; const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Cannot read attachment.')); reader.readAsDataURL(file); }); if(current !== session || revision !== captureRevision) return; const result = await api('/capture', {conversation,attachment:{base64:data,mime}}); if(revision !== captureRevision) return; draft = result.draft || result; renderCapture(); el('capture').showModal(); }, 'voiceHint'));
  function renderCapture() { el('candidates').replaceChildren(); draft.items.forEach((item,index) => { const group = document.createElement('div'); group.className = 'candidate'; const label = document.createElement('label'); label.textContent = ${JSON.stringify(es ? "Tarea " : "Task ")} + (index+1); const input = document.createElement('textarea'); input.value = item.text; input.maxLength = 300; input.dataset.index = index; label.appendChild(input); group.appendChild(label); const due = document.createElement('p'); due.className = 'hint'; due.textContent = ${JSON.stringify(es ? "Fecha propuesta (UTC): " : "Proposed deadline (UTC): ")} + (item.due || ${JSON.stringify(es ? "Sin fecha" : "No date")}); group.appendChild(due); const missing = document.createElement('p'); missing.className = 'hint'; missing.textContent = item.missing.join(' · '); group.appendChild(missing); el('candidates').appendChild(group); }); }
  el('captureDiscard').addEventListener('click', () => el('capture').close());
  el('capture').addEventListener('close', clearCapture);
  el('captureConfirm').addEventListener('click', () => run(async () => { if(!draft) return; const current = session; const revision = captureRevision; el('captureConfirm').disabled = true; try { const items = draft.items.map((item,index) => ({...item,text:el('candidates').querySelectorAll('textarea')[index].value.trim()})); if(JSON.stringify(items) !== JSON.stringify(draft.items)) { const edited = await api('/capture/' + draft.id + '/edit', {conversation,version:draft.version,items}); if(revision !== captureRevision) return; draft = edited.draft || edited; } const result = await api('/capture/' + draft.id + '/confirm', {conversation,version:draft.version,items:draft.items}); if(current !== session || revision !== captureRevision) return; add(${JSON.stringify(es ? "Tareas guardadas: " : "Tasks saved: ")} + result.tasks.length, 'helen'); el('capture').close(); } finally { if(current === session) el('captureConfirm').disabled = false; } }, 'captureMessage'));
  show();
})();
</script>
</body>
</html>
`;
}
