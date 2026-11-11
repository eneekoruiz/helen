import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function normalizeOwnerJid(value) {
  const match = /^(\d{5,20})(?::\d+)?@(s\.whatsapp\.net|lid)$/.exec(
    String(value ?? ""),
  );
  return match ? match[1] + "@" + match[2] : null;
}

/** Only an explicitly configured self-chat matching the linked account can act as owner. */
export function createOwnerMessageHandler({
  ownerJid,
  linkedJid,
  handleMessage,
  sendMessage,
  home,
  log = () => {},
}) {
  const owner = normalizeOwnerJid(ownerJid);
  if (!owner) throw new Error("Configure the exact owner JID locally");
  const seen = new Set();
  return async ({ messages, type }) => {
    if (
      type !== "notify" ||
      normalizeOwnerJid(linkedJid()) !== owner ||
      !Array.isArray(messages)
    )
      return;
    for (const msg of messages) {
      const remote = msg?.key?.remoteJid;
      const text =
        msg?.message?.conversation ?? msg?.message?.extendedTextMessage?.text;
      const id = msg?.key?.id;
      if (
        normalizeOwnerJid(remote) !== owner ||
        msg.key.participant ||
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 4000 ||
        text.startsWith("Helen: ") ||
        typeof id !== "string" ||
        seen.has(id)
      )
        continue;
      seen.add(id);
      if (seen.size > 2000) seen.delete(seen.values().next().value);
      try {
        const reply = await handleMessage(text, {
          home,
          channel: "whatsapp",
          conversation: owner,
          ownerVerified: true,
          requestId: id,
        });
        if (reply?.text)
          await sendMessage(remote, { text: "Helen: " + reply.text });
        log(
          "Owner message processed; remote delivery is not independently verified.",
        );
      } catch {
        log("Owner message or delivery unconfirmed; no automatic retry.");
      }
    }
  };
}

async function main() {
  if (!process.argv.includes("--connect") || process.argv.includes("--help")) {
    console.log(
      "Experimental Baileys/WhatsApp Web adapter (not Meta Cloud API). Manual use: set WHATSAPP_OWNER_JID to the exact linked self-chat JID; node scripts/whatsapp-helen.mjs --connect. Initial pairing additionally requires --allow-pairing in a private terminal. Nothing connects by default.",
    );
    return;
  }
  const owner = normalizeOwnerJid(process.env.WHATSAPP_OWNER_JID);
  if (!owner) throw new Error("Missing explicit owner identity");
  const allowPairing = process.argv.includes("--allow-pairing");
  if (allowPairing && !process.stdout.isTTY)
    throw new Error("Pairing requires a private interactive terminal");
  const [
    {
      default: makeWASocketPkg,
      Browsers,
      DisconnectReason,
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
    },
    { default: QRCode },
    { default: pino },
    { handleMessage },
    { helenHome, readConfig, writePrivate },
  ] = await Promise.all([
    import("@whiskeysockets/baileys"),
    import("qrcode"),
    import("pino"),
    import("../dist/assistant/brain.js"),
    import("../dist/assistant/home.js"),
  ]);
  const home = helenHome();
  if (!readConfig(home).privacy.showSensitiveOn.includes("whatsapp"))
    throw new Error(
      "Enable the private WhatsApp channel locally before connecting",
    );
  process.umask(0o077);
  const authDir = path.join(home, "whatsapp-auth");
  if (fs.existsSync(authDir) && fs.lstatSync(authDir).isSymbolicLink())
    throw new Error("Unsafe credential directory");
  fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
  const makeWASocket = makeWASocketPkg.default || makeWASocketPkg;
  let retries = 0,
    stopped = false,
    socket,
    retryTimer,
    pairingTimer;
  const stop = () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(pairingTimer);
    socket?.end(new Error("Stopped locally"));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  async function start() {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    if (!state.creds.registered && !allowPairing)
      throw new Error("Initial pairing is not enabled");
    let timer;
    const metadata = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Version metadata timeout")),
          15000,
        );
      }),
    ]).finally(() => clearTimeout(timer));
    if (
      !Array.isArray(metadata.version) ||
      metadata.version.length !== 3 ||
      !metadata.version.every(
        (value) => Number.isSafeInteger(value) && value >= 0,
      )
    )
      throw new Error("Invalid compatibility version");
    console.log(
      "Baileys compatibility version selected; this is not an official Meta client.",
    );
    socket = makeWASocket({
      version: metadata.version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: Browsers.windows("Desktop"),
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });
    socket.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch {
        stop();
        console.error(
          "Private credential persistence failed; adapter stopped.",
        );
      }
    });
    if (!state.creds.registered && allowPairing && process.env.WHATSAPP_PHONE) {
      const phone = process.env.WHATSAPP_PHONE.replace(/\D/g, "");
      if (!/^\d{10,15}$/.test(phone))
        throw new Error("Invalid local pairing phone");
      pairingTimer = setTimeout(async () => {
        try {
          console.log(
            "Local pairing code: " + (await socket.requestPairingCode(phone)),
          );
        } catch {
          console.error(
            "Pairing was not confirmed; inspect the private terminal.",
          );
        }
      }, 3000);
    }
    socket.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect, qr }) => {
        if (qr && !state.creds.registered && !process.env.WHATSAPP_PHONE) {
          if (!allowPairing || !process.stdout.isTTY) {
            stop();
            return;
          }
          try {
            console.log(
              await QRCode.toString(qr, { type: "terminal", small: true }),
            );
          } catch {
            console.error("Could not display pairing QR locally.");
            stop();
          }
        }
        if (connection === "open") {
          if (normalizeOwnerJid(socket.user?.id) !== owner) {
            stop();
            console.error(
              "Linked account does not match the configured owner.",
            );
            return;
          }
          retries = 0;
          writePrivate(
            path.join(home, "whatsapp-status.json"),
            JSON.stringify({
              status: "SOCKET_CONNECTED",
              delivery: "not-verified",
              connectedAt: new Date().toISOString(),
            }),
          );
          console.log(
            "Owner socket connected; remote delivery is not independently verified.",
          );
        } else if (connection === "close") {
          clearTimeout(pairingTimer);
          writePrivate(
            path.join(home, "whatsapp-status.json"),
            JSON.stringify({
              status: "DISCONNECTED",
              delivery: "not-verified",
              updatedAt: new Date().toISOString(),
            }),
          );
          if (
            stopped ||
            lastDisconnect?.error?.output?.statusCode ===
              DisconnectReason.loggedOut ||
            ++retries > 3
          ) {
            stopped = true;
            console.log(
              "Adapter disconnected; credentials retained, manual review required.",
            );
            return;
          }
          retryTimer = setTimeout(
            () =>
              start().catch(() => {
                stop();
                console.error("Reconnect failed; manual review required.");
              }),
            retries * 4000,
          );
        }
      },
    );
    socket.ev.on(
      "messages.upsert",
      createOwnerMessageHandler({
        ownerJid: owner,
        linkedJid: () => socket.user?.id,
        handleMessage,
        sendMessage: (jid, content) => socket.sendMessage(jid, content),
        home,
        log: (message) => console.log(message),
      }),
    );
  }
  await start();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    console.error(
      "WhatsApp adapter was not activated or lost its verified state. Review dependencies, private configuration and explicit pairing locally; no credentials are displayed.",
    );
    process.exit(1);
  });
