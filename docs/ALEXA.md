# HELEN on an Amazon Echo

Talk to HELEN from an Echo ("Alexa, pídele a asistente helen que me recuerde mañana a las nueve llamar a mamá") with a private Alexa skill of your own. Reminders you set by voice are also created as native Alexa reminders, so the Echo itself rings at the time.

The skill stays in development mode on your Amazon account: no certification, no publication, only your devices.

## What you need

- `helen assistant serve` running on a computer that stays on (`helen assistant service` prints how to start it at login).
- A public HTTPS address for it. Alexa only calls HTTPS endpoints with a trusted certificate, so put a tunnel in front of HELEN. HELEN does not install one; pick one you trust and run it yourself, for example:
  - Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:8787`
  - Tailscale Funnel: `tailscale funnel 8787`
  - ngrok: `ngrok http 8787`
- A free Amazon developer account with the same Amazon account as your Echo.

`helen assistant alexa setup` prints these steps with your own port and language.

## Steps

1. **Create the skill.** In the [Alexa developer console](https://developer.amazon.com/alexa/console/ask), create a skill: type Custom, backend "Provision your own", the language of your Echo (for example Spanish (ES)).
2. **Interaction model.** Build > Interaction Model > JSON Editor. Paste the output of `helen assistant alexa model --locale es-ES` (use your locale), then Save and Build. The invocation name is `asistente helen` (`helen assistant` in English); change it with `--invocation`.
3. **Endpoint.** Build > Endpoint: HTTPS, Default Region `https://<your tunnel address>/alexa`, SSL certificate type "My development endpoint has a certificate from a trusted certificate authority".
4. **Reminders permission.** Build > Permissions: turn on Reminders. The first time you set a reminder by voice, Alexa asks you to allow it; HELEN sets the native reminder as soon as you agree, and does not ask again for a month if you say no.
5. **Allow your skill in HELEN.** Copy the Skill ID (`amzn1.ask.skill....`) and run `helen assistant config set alexa.skillIds '["amzn1.ask.skill.<id>"]'`.
6. **Run it.** `helen assistant serve` (with the tunnel running). Then Test > Development in the console, and on your Echo: "Alexa, abre asistente helen".
7. **Pin your account (recommended).** The server log prints the Alexa account id of the first request; add it with `helen assistant config set alexa.userIds '["amzn1.ask.account...."]'` so only you are answered.

## What you can say

| Say | Result |
|---|---|
| "Alexa, pídele a asistente helen que me recuerde mañana a las nueve llamar a mamá" | Reminder in HELEN and on the Echo |
| "Alexa, dile a asistente helen que recuerde que el coche está en la planta menos dos" | A note |
| "Alexa, pregúntale a asistente helen qué tengo hoy" | Your agenda, spoken briefly |
| "Alexa, pídele a asistente helen que añada leche a la lista de la compra" | Shopping list |
| "Alexa, pregúntale a asistente helen dónde está el coche" | Recall from your notes |
| "Alexa, pídele a asistente helen que cancele el recordatorio de mamá" | Cancels it, on the Echo too |

Private notes and reminders are never read aloud: HELEN says it has something private and to check it on your phone.

## How requests are checked

Every request to `/alexa` is verified the way Amazon requires for skills hosted as a web service, and rejected with HTTP 400 otherwise:

- `SignatureCertChainUrl` must be `https://s3.amazonaws.com/echo.api/...` (port 443 if given, after normalizing the path).
- The certificate chain is downloaded (cached until it expires), must be currently valid, name `echo-api.amazon.com` and chain to a trusted root.
- The `Signature-256` header must be a valid SHA-256 signature of the exact request body by that certificate.
- The request timestamp must be within 150 seconds.
- The skill id must be in `alexa.skillIds`, and the account in `alexa.userIds` when you set it.

Native reminders are created with the access token Alexa includes in each request, only against Amazon's Alexa API hosts. The implementation is in `src/assistant/alexa.ts`.

## Troubleshooting

- "There was a problem with the requested skill's response": run `helen assistant serve` in a terminal and read the log; a rejected verification is logged with its reason.
- The Echo does not ring: check that Reminders is enabled in Build > Permissions and allowed in the Alexa app (Skills > your skill > Settings > Permissions).
- Wrong time: `helen assistant config set timezone Europe/Madrid` (HELEN uses its own time zone for what you say and sends it to Alexa with each reminder).
