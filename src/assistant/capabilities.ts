import { fold } from "./text.js";

export interface CapabilityItem {
  key: string;
  aliases: string[];
  title: { es: string; en: string };
  can: { es: string[]; en: string[] };
  cannot: { es: string[]; en: string[] };
  examples: { es: string[]; en: string[] };
}

export const CAPABILITIES: CapabilityItem[] = [
  {
    key: "antigravity",
    aliases: [
      "antigravity",
      "codex",
      "codigo",
      "code",
      "programacion",
      "desarrollo",
      "proyectos",
      "sesiones",
    ],
    title: {
      es: "Registros locales de Antigravity",
      en: "Local Antigravity logs",
    },
    can: {
      es: [
        "Consultar objetivos de usuario en registros JSONL compatibles de Antigravity desde un canal privado autorizado.",
        "Mostrar los objetivos encontrados y la fecha de modificación del archivo; la lectura tiene límites de tamaño y número de archivos.",
      ],
      en: [
        "Read user goals from compatible Antigravity JSONL logs on an authorized private channel.",
        "Show observed goals and file modification times within bounded file and directory scans.",
      ],
    },
    cannot: {
      es: [
        "No lee los formatos nativos de Codex ni verifica tareas pendientes o trabajo terminado a partir de un objetivo escrito.",
        "No ejecuta comandos ni lee objetivos privados en altavoces.",
      ],
      en: [
        "Does not read native Codex formats or establish pending or completed work from a recorded goal.",
        "Does not execute commands or speak private goals aloud.",
      ],
    },
    examples: {
      es: [
        "«¿Qué estábamos haciendo en Antigravity?»",
        "«¿Qué dejamos a medias en Antigravity?»",
        "«Sesión de Antigravity»",
      ],
      en: [
        '"What were we doing in Antigravity?"',
        '"What did we leave pending in Antigravity?"',
        '"Antigravity status"',
      ],
    },
  },
  {
    key: "tasks",
    aliases: [
      "tareas",
      "tasks",
      "listas",
      "urgencia",
      "urgente",
      "compra",
      "limpieza",
      "cuidado",
    ],
    title: {
      es: "Tareas, Urgencia y Secciones Desatendidas",
      en: "Tasks, Urgency & Neglected Categories",
    },
    can: {
      es: [
        "Calcular «¿Qué es lo más urgente?» ponderando fechas límite y desatención (si saltaste limpieza o cuidado un mes, gana máxima prioridad).",
        "Recomendar tareas específicas cuando tienes un hueco («¿Qué puedo hacer en este hueco?»).",
        "Captura masiva de 1 a 100 tareas desde un tochamen de texto o notas de voz.",
        "Edición conversacional en vivo de borradores («el tercer recordatorio ponlo a las 5») antes de guardar.",
        "Reseteo conversacional inmediato si te equivocas («no, espera, vamos a volver a empezar»).",
        "Reprogramar todas las tareas vencidas a hoy («pasa lo atrasado a hoy»).",
      ],
      en: [
        'Calculate "What is most urgent?" weighting deadlines and neglect (if you skipped cleaning or care last month, it takes top priority).',
        'Recommend specific tasks when you have free time ("What can I do in this slot?").',
        "Massive capture of 1 to 100 tasks from large text dumps or voice messages.",
        'Live conversational editing of pending drafts ("put the third reminder at 5") before saving.',
        'Immediate conversational reset if you change your mind ("wait, let us start over").',
        'Reschedule all overdue tasks to today ("push overdue tasks to today").',
      ],
    },
    cannot: {
      es: [
        "No elimina tareas completadas definitivamente a menos que uses clearDone explícitamente.",
        "No altera listas sin tu indicación.",
      ],
      en: [
        "Does not permanently delete completed tasks unless clearDone is explicitly requested.",
        "Does not modify lists without your instruction.",
      ],
    },
    examples: {
      es: [
        "«¿Qué es lo más urgente?»",
        "«¿Qué puedo hacer en este hueco?»",
        "«Añade comprar leche a la lista de la compra»",
        "«El tercer recordatorio ponlo a las 5»",
      ],
      en: [
        '"What is most urgent?"',
        '"What can I do in this slot?"',
        '"Add milk to my shopping list"',
        '"Put the third reminder at 5pm"',
      ],
    },
  },
  {
    key: "rituals",
    aliases: ["cierre", "shutdown", "kickoff", "rituales", "dia", "rutinas"],
    title: {
      es: "Rituales Diarios de Cierre y Arranque",
      en: "Daily Shutdown & Kickoff Rituals",
    },
    can: {
      es: [
        "Cierre diario («Cierro por hoy»): audita tareas completadas, detecta las que quedaron colgando, alerta de listas desatendidas y genera el Top 3 de prioridades para mañana.",
        "Arranque del día («Cómo arranco mañana» o «Morning kickoff»): briefing con agenda matutina, avisos y primera tarea clave.",
      ],
      en: [
        'Daily shutdown ("Daily shutdown" or "Cierro por hoy"): audits completed tasks, flags leftovers, warns of neglected lists, and prepares Top 3 priorities for tomorrow.',
        'Morning kickoff ("Morning kickoff" or "Cómo arranco mañana"): briefing with morning schedule, reminders, and #1 focus task.',
      ],
    },
    cannot: {
      es: ["No bloquea tu calendario ni altera eventos sin tu confirmación."],
      en: [
        "Does not block your calendar or alter events without confirmation.",
      ],
    },
    examples: {
      es: ["«Cierro por hoy»", "«Cómo arranco mañana»", "«Cierre del día»"],
      en: ['"Daily shutdown"', '"Morning kickoff"', '"End of day"'],
    },
  },
  {
    key: "reminders",
    aliases: ["recordatorios", "reminders", "avisos", "alarmas", "alexa"],
    title: {
      es: "Recordatorios y Sincronización con Alexa Echo",
      en: "Reminders & Alexa Echo Sync",
    },
    can: {
      es: [
        "Crear recordatorios puntuales («mañana a las 9»), relativos («en 20 minutos») o recurrentes («cada lunes a las 10»).",
        "Crear avisos nativos compatibles de Alexa cuando la integración, los permisos y el dispositivo lo permiten.",
        "Posponer («pospónlo 15 minutos») o mover de hora («pasa el aviso de llamar a Juan a las 6»).",
      ],
      en: [
        'Create exact reminders ("tomorrow at 9am"), relative ("in 20 minutes"), or recurring ("every Monday at 10am").',
        "Create supported native Alexa reminders when integration, permissions and the device allow it.",
        'Snooze ("snooze 15 minutes") or reschedule ("move reminder to call John to 6pm").',
      ],
    },
    cannot: {
      es: [
        "No puede hacer sonar el Echo si no has concedido permisos de recordatorios en la app Alexa.",
      ],
      en: [
        "Cannot trigger the Echo alarm if reminders permissions are not granted in the Alexa app.",
      ],
    },
    examples: {
      es: [
        "«Recuérdame mañana a las nueve llamar al médico»",
        "«Pospónlo media hora»",
        "«¿Qué recordatorios tengo?»",
      ],
      en: [
        '"Remind me tomorrow at 9am to call the doctor"',
        '"Snooze for 30 minutes"',
        '"What reminders do I have?"',
      ],
    },
  },
  {
    key: "gmail",
    aliases: ["gmail", "correo", "email", "mails", "inbox"],
    title: {
      es: "Gestión de Gmail y Correos",
      en: "Gmail & Email Management",
    },
    can: {
      es: [
        "Consultar respuestas en hilos vinculados a correos enviados y verificados por HELEN, tras autorizar Gmail.",
        "Preparar borradores y activar seguimientos de respuestas con avisos genéricos.",
        "Enviar un borrador aprobado o un correo literal solicitado explícitamente por el propietario.",
      ],
      en: [
        "Check replies in threads linked to verified HELEN-sent messages after Gmail authorization.",
        "Prepare drafts and explicitly requested reply watches with generic notifications.",
        "Send an approved draft or an exact literal email explicitly requested by the owner.",
      ],
    },
    cannot: {
      es: [
        "No lee todo el buzón ni permite que el modelo apruebe sus propios envíos.",
        "No borra correos de tu cuenta.",
      ],
      en: [
        "Does not scan the whole inbox or let the model approve its own sends.",
        "Does not delete emails from your account.",
      ],
    },
    examples: {
      es: [
        "«Redacta un correo a Carlos diciendo que llego tarde»",
        "«¿Ana ha respondido al correo?»",
      ],
      en: [
        '"Draft an email to Carlos saying I am running late"',
        '"Draft an email to ana@example.com: I am running late"',
      ],
    },
  },
  {
    key: "memory",
    aliases: [
      "memoria",
      "recuerdos",
      "memory",
      "notas",
      "aprendizaje",
      "chatgpt",
      "charlar",
    ],
    title: {
      es: "Memoria y conversación",
      en: "Memory and conversation",
    },
    can: {
      es: [
        "Guardar datos que le digas («recuerda que mi talla de zapatos es 42») y recuperarlos («¿qué sabes de mi talla?»).",
        "Notas temporales con caducidad automática («recuerda hasta el viernes: el código de la puerta es 1234»).",
        "Conversar y adaptar explicaciones con un modelo configurado; la calidad depende del modelo.",
        "Guardar preferencias cuando lo pides y aplicar el estilo que eliges en Ajustes.",
      ],
      en: [
        'Save notes you provide ("remember my shoe size is 42") and recall them ("what is my shoe size?").',
        'Temporary memories with auto-expiry ("remember until Friday: gate code is 1234").',
        "Converse and adapt explanations with a configured model; quality depends on that model.",
        "Remember preferences when requested and apply your selected response style.",
      ],
    },
    cannot: {
      es: [
        "El filtro rechaza patrones de credenciales reconocibles, pero no garantiza detectar cualquier secreto; utiliza un gestor de contraseñas.",
        "Los canales y proveedores configurados pueden recibir datos según los permisos; no activa aprendizaje autónomo de hábitos.",
      ],
      en: [
        "The credential filter rejects recognized patterns but cannot identify every secret; use a password manager.",
        "Configured channels and model providers can receive permitted data; autonomous habit learning is not enabled.",
      ],
    },
    examples: {
      es: [
        "«Recuerda que a mi madre le gustan los tulipanes»",
        "«¿Qué sabes de mi coche?»",
        "«¿Qué opinas sobre cambiar de carrera a los 30?»",
      ],
      en: [
        '"Remember that my mom likes tulips"',
        '"What do you know about my car?"',
        '"What do you think about changing careers at 30?"',
      ],
    },
  },
  {
    key: "channels",
    aliases: ["canales", "alexa", "telegram", "voz", "botones"],
    title: {
      es: "Canales (Alexa Multi-turno y Telegram Interactivo)",
      en: "Channels (Multi-turn Alexa & Interactive Telegram)",
    },
    can: {
      es: [
        "Alexa multi-turno: mantiene el micro del Echo abierto para seguir hablando sin repetir «Alexa...».",
        "Telegram interactivo: botones inline debajo de tareas para marcar como [✓ Hecho] o [Posponer 1d] en un toque.",
        "Transcripción de notas de voz en Telegram con procesador de audio local.",
      ],
      en: [
        'Multi-turn Alexa: keeps the Echo microphone open for follow-ups without repeating "Alexa...".',
        "Interactive Telegram: inline action buttons on tasks to tap [✓ Done] or [Snooze 1d].",
        "Voice note transcription on Telegram using local audio processing.",
      ],
    },
    cannot: {
      es: [
        "En altavoces (Alexa) no lee parrafadas largas ni datos privados (activa speaker: true).",
      ],
      en: [
        "On speakers (Alexa) it does not read long walls of text or private data (enforces speaker: true).",
      ],
    },
    examples: {
      es: [
        "«Alexa, abre Helen»",
        "Enviar audio de 1 minuto a Telegram con 10 tareas mezcladas",
      ],
      en: [
        '"Alexa, open Helen"',
        "Send a 1-minute voice message to Telegram with 10 mixed tasks",
      ],
    },
  },
];

export function findCapability(topic: string): CapabilityItem | undefined {
  const folded = fold(topic).trim();
  if (!folded) return;
  return CAPABILITIES.find(
    (c) =>
      c.key === folded ||
      c.aliases.some((a) => folded.includes(a) || a.includes(folded)),
  );
}

export function formatCapabilities(options: {
  topic?: string;
  lang?: "es" | "en";
  speaker?: boolean;
}): { text: string; speech: string } {
  const lang = options.lang ?? "es";
  const es = lang === "es";
  const speaker = options.speaker ?? false;

  // Si se pide un tema específico (o límites)
  if (options.topic) {
    const foldedTopic = fold(options.topic).trim();

    if (
      foldedTopic === "limits" ||
      foldedTopic.includes("limite") ||
      foldedTopic.includes("limit") ||
      foldedTopic.includes("no puedes") ||
      foldedTopic.includes("cannot")
    ) {
      const lines: string[] = [];
      lines.push(
        es
          ? "🛡️ *Fronteras y Límites de Seguridad de Helen:*"
          : "🛡️ *Helen's Safety Boundaries & Limits:*",
      );
      lines.push(
        es
          ? "\n*Lo que Helen NUNCA hace sin permiso o está restringido:*"
          : "\n*What Helen NEVER does without permission or is restricted:*",
      );
      for (const cap of CAPABILITIES) {
        for (const item of cap.cannot[lang]) {
          lines.push(`• *${cap.title[lang].split(" ")[0]}*: ${item}`);
        }
      }
      const speech = es
        ? "Los envíos requieren una orden explícita del propietario o aprobación del borrador. Los modelos y canales configurados pueden recibir datos autorizados."
        : "Sending requires the owner's explicit instruction or draft approval. Configured models and channels can receive authorized data.";
      return { text: lines.join("\n"), speech };
    }

    const matched = findCapability(options.topic);
    if (matched) {
      const lines: string[] = [];
      lines.push(`✨ *${matched.title[lang]}*`);
      lines.push(es ? "\n🟢 *Qué PUEDE hacer:*" : "\n🟢 *What it CAN do:*");
      matched.can[lang].forEach((c) => lines.push(`  • ${c}`));
      lines.push(
        es ? "\n🔴 *Qué NO puede hacer:*" : "\n🔴 *What it CANNOT do:*",
      );
      matched.cannot[lang].forEach((c) => lines.push(`  • ${c}`));
      lines.push(
        es ? "\n💬 *Ejemplos para probar:*" : "\n💬 *Examples to try:*",
      );
      matched.examples[lang].forEach((ex) => lines.push(`  • ${ex}`));

      const speech = es
        ? `Con ${matched.title[lang].split(" ")[0]}, puedo ${matched.can[lang][0]?.toLowerCase() ?? "ayudarte con tus gestiones"}.`
        : `With ${matched.title[lang].split(" ")[0]}, I can ${matched.can[lang][0]?.toLowerCase() ?? "assist you"}.`;

      return { text: lines.join("\n"), speech };
    }
  }

  // Vista general de capacidades
  if (speaker) {
    const speech = es
      ? "Puedo organizar tareas, preparar un resumen del día y gestionar recordatorios. Gmail, Alexa y conversación libre necesitan su configuración y permisos."
      : "I can organize tasks, prepare daily summaries and manage reminders. Gmail, Alexa and open-ended conversation require configuration and permissions.";
    return { text: speech, speech };
  }

  const lines: string[] = [];
  lines.push(
    es
      ? "⚡ *Capacidades del Sistema HELEN (Qué puedo y qué no puedo hacer)*"
      : "⚡ *HELEN System Capabilities (What I can and cannot do)*",
  );
  lines.push(
    es
      ? "Estas funciones dependen de los datos, conexiones y permisos de tu instalación:\n"
      : "These functions depend on your installation's data, connections and permissions:\n",
  );

  for (const cap of CAPABILITIES) {
    lines.push(`🔹 *${cap.title[lang]}*`);
    lines.push(`   ${cap.can[lang][0]}`);
    lines.push(`   _Ejemplo:_ ${cap.examples[lang][0]}`);
  }

  lines.push(
    es
      ? "\n💡 _Tip: Puedes preguntarme «¿qué puedes hacer con codex?», «¿qué puedes hacer con tareas?» o «¿cuáles son tus límites?» para ver el detalle de cada área._"
      : '\n💡 _Tip: You can ask "what can you do with codex?", "what can you do with tasks?" or "what are your limits?" for specific details._',
  );

  const speech = es
    ? "Puedo organizar tareas, preparar resúmenes y guardar notas. Consulta los requisitos de cada integración antes de usarla."
    : "I can organize tasks, prepare summaries and save notes. Check each integration's requirements before using it.";

  return { text: lines.join("\n"), speech };
}
