import makeWASocketPkg, { Browsers, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import path from "node:path";
import fs from "node:fs";
import { handleMessage } from "../dist/assistant/brain.js";
import { helenHome } from "../dist/assistant/home.js";

const makeWASocket = makeWASocketPkg.default || makeWASocketPkg;

const ARTIFACT_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\dbc03471-87a1-482c-b843-e43d4c5a807e";
const ARTIFACT_QR_PATH = path.join(ARTIFACT_DIR, "whatsapp-qr.png");
const LOCAL_QR_PATH = path.resolve("whatsapp-qr.png");
const PAIRING_CODE_PATH = path.join(ARTIFACT_DIR, "whatsapp-pairing-code.txt");

const authDir = path.join(helenHome(), "whatsapp-auth");
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Extraer teléfono si se pasa por CLI, variable de entorno o archivo
let phoneNumber = process.env.WHATSAPP_PHONE ? process.env.WHATSAPP_PHONE.replace(/\D/g, "") : null;
const phoneIdx = process.argv.findIndex((a) => a === "--phone" || a === "-p");
if (phoneIdx !== -1 && process.argv[phoneIdx + 1]) {
  phoneNumber = process.argv[phoneIdx + 1].replace(/\D/g, "");
}
if (!phoneNumber) {
  const phoneFile = path.join(helenHome(), "whatsapp-phone.txt");
  if (fs.existsSync(phoneFile)) {
    phoneNumber = fs.readFileSync(phoneFile, "utf8").trim().replace(/\D/g, "");
  }
}

let sock = null;

async function startWhatsApp() {
  console.log(`[WhatsApp] Inicializando sesión con auth en ${authDir}...`);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    // Usar firma oficial Ubuntu Chrome para evitar rechazo de conexión por WhatsApp
    browser: Browsers.ubuntu("Chrome"),
  });

  sock.ev.on("creds.update", saveCreds);

  // Si hay número de teléfono configurado y no está registrado aún, solicitar código de emparejamiento
  if (phoneNumber && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        console.log(`[WhatsApp] Solicitando código de vinculación para +${phoneNumber}...`);
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n========================================`);
        console.log(`👉 CÓDIGO DE VINCULACIÓN: ${code}`);
        console.log(`========================================\n`);
        fs.writeFileSync(PAIRING_CODE_PATH, code, "utf8");
      } catch (err) {
        console.error("[WhatsApp] Error solicitando código de vinculación:", err);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !phoneNumber) {
      console.log("[WhatsApp] ¡Nuevo código QR recibido (firma Ubuntu Chrome)!");
      try {
        await QRCode.toFile(ARTIFACT_QR_PATH, qr, {
          scale: 10,
          margin: 3,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        await QRCode.toFile(LOCAL_QR_PATH, qr, {
          scale: 10,
          margin: 3,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        console.log(`[WhatsApp] QR guardado exitosamente en:\n  - ${ARTIFACT_QR_PATH}\n  - ${LOCAL_QR_PATH}`);
      } catch (err) {
        console.error("[WhatsApp] Error generando PNG del QR:", err);
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Conexión cerrada (status ${statusCode}). Reconectar: ${shouldReconnect}`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("[WhatsApp] Sesión cerrada/desvinculada. Limpiando credenciales para nuevo intento...");
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
          fs.mkdirSync(authDir, { recursive: true });
        } catch (e) {
          console.error("Error al limpiar credenciales:", e);
        }
      }

      if (shouldReconnect || statusCode === DisconnectReason.loggedOut) {
        console.log("[WhatsApp] Reiniciando conexión en 4 segundos...");
        setTimeout(startWhatsApp, 4000);
      }
    } else if (connection === "open") {
      console.log(`[WhatsApp] ¡CONECTADO CON ÉXITO! Helen vinculada como: ${sock.user?.id || sock.user?.name || "Asistente"}`);
      try {
        const statusPath = path.join(helenHome(), "whatsapp-status.json");
        fs.writeFileSync(statusPath, JSON.stringify({
          status: "CONNECTED",
          user: sock.user,
          connectedAt: new Date().toISOString()
        }, null, 2), "utf8");
      } catch {
        /* ignore status save errors */
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith("@broadcast")) continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";
      if (!text.trim()) continue;

      console.log(`[WhatsApp Recibido] [${remoteJid}]: ${text}`);

      try {
        const reply = await handleMessage(text, {
          home: helenHome(),
          channel: "whatsapp",
          conversation: remoteJid,
          ownerVerified: true,
        });

        if (reply && reply.text) {
          await sock.sendMessage(remoteJid, { text: reply.text });
          console.log(`[WhatsApp Enviado] [${remoteJid}]: ${reply.text}`);
        }
      } catch (err) {
        console.error(`[WhatsApp Error] al responder a ${remoteJid}:`, err);
        try {
          await sock.sendMessage(remoteJid, {
            text: "Error interno de Helen: " + (err.message || String(err)),
          });
        } catch {
          /* ignore send failure */
        }
      }
    }
  });
}

startWhatsApp().catch((err) => {
  console.error("[WhatsApp Fatal]", err);
  process.exit(1);
});
