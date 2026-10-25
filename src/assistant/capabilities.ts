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
      es: "Antigravity & Codex (Sesiones y Proyectos)",
      en: "Antigravity & Codex (Sessions & Projects)",
    },
    can: {
      es: [
        "Leer los historiales y transcripts de tus sesiones locales en Antigravity y Codex.",
        "Resumir qué estabas haciendo en la última sesión y qué tareas o código quedaron pendientes.",
        "Indicarte el tiempo transcurrido desde la última actividad y el identificador de sesión.",
        "Responder por voz en Alexa o Telegram para consultar el estado sin abrir el ordenador.",
      ],
      en: [
        "Read transcripts and histories of your local Antigravity and Codex sessions.",
        "Summarize what you were doing in the last session and what tasks or code remained pending.",
        "Report elapsed time since last activity and the session ID.",
        "Answer hands-free on Alexa or Telegram to check status without opening your computer.",
      ],
    },
    cannot: {
      es: [
        "No ejecuta comandos destructivos (como git reset --hard o borrado de ramas) de forma autónoma.",
        "No inventa acciones de programación que no estén registradas en el log de la sesión.",
      ],
      en: [
        "Does not execute destructive commands (like git reset --hard or branch deletion) autonomously.",
        "Does not hallucinate coding actions not recorded in the session log.",
      ],
    },
    examples: {
      es: [
        "«¿Qué estábamos haciendo en Codex?»",
        "«¿Qué dejamos a medias en Antigravity?»",
        "«Sesión de Codex»",
      ],
      en: [
        '"What were we doing in Codex?"',
        '"What did we leave pending in Antigravity?"',
        '"Codex status"',
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
      es: [
        "No bloquea tu calendario ni altera eventos sin tu confirmación.",
      ],
      en: ["Does not block your calendar or alter events without confirmation."],
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
        "Sincronizar directamente con las alarmas nativas de tu altavoz Amazon Echo para que suene físicamente en casa.",
        "Posponer («pospónlo 15 minutos») o mover de hora («pasa el aviso de llamar a Juan a las 6»).",
      ],
      en: [
        'Create exact reminders ("tomorrow at 9am"), relative ("in 20 minutes"), or recurring ("every Monday at 10am").',
        "Sync natively with Amazon Echo alarms so the physical speaker rings in your home.",
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
        "Resumir tu bandeja de entrada y avisar de correos clave.",
        "Redactar borradores y buscar en tus hilos de correo.",
        "Enviar correos únicamente tras pedir confirmación explícita mostrándote el borrador completo.",
      ],
      en: [
        "Summarize inbox and alert of high-priority emails.",
        "Draft email replies and search through email threads.",
        "Send emails strictly after explicit confirmation showing you the exact draft.",
      ],
    },
    cannot: {
      es: [
        "NUNCA envía un correo sin que confirmes diciendo «Sí».",
        "No borra correos de tu cuenta.",
      ],
      en: [
        'NEVER sends an email without you confirming with "Yes".',
        "Does not delete emails from your account.",
      ],
    },
    examples: {
      es: [
        "«Redacta un correo a Carlos diciendo que llego tarde»",
        "«Revisa mi correo»",
      ],
      en: [
        '"Draft an email to Carlos saying I am running late"',
        '"Check my email"',
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
      es: "Memoria, Aprendizaje y Charlas de la Vida",
      en: "Memory, Continuous Learning & Chat",
    },
    can: {
      es: [
        "Guardar datos que le digas («recuerda que mi talla de zapatos es 42») y recuperarlos («¿qué sabes de mi talla?»).",
        "Notas temporales con caducidad automática («recuerda hasta el viernes: el código de la puerta es 1234»).",
        "Charlar de cualquier tema reflexivo estilo ChatGPT con opiniones fundadas.",
        "Aprender de ti de forma autónoma guardando preferencias y rutinas en memoria.",
      ],
      en: [
        'Save notes you provide ("remember my shoe size is 42") and recall them ("what is my shoe size?").',
        'Temporary memories with auto-expiry ("remember until Friday: gate code is 1234").',
        "Hold thoughtful, deep conversations on any topic like ChatGPT.",
        "Continuously learn user preferences and routines autonomously via memory.",
      ],
    },
    cannot: {
      es: [
        "NUNCA almacena contraseñas maestras ni números completos de tarjeta de crédito (filtro de seguridad activo).",
        "No comparte tus recuerdos fuera de tu entorno local.",
      ],
      en: [
        "NEVER stores master passwords or full credit card numbers (strict security filter).",
        "Does not share your memories outside your private local instance.",
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
        ? "Helen nunca envía correos sin confirmación, no guarda contraseñas en texto plano, y en altavoz no lee datos privados."
        : "Helen never sends emails without confirmation, never stores plaintext passwords, and suppresses private data on speakers.";
      return { text: lines.join("\n"), speech };
    }

    const matched = findCapability(options.topic);
    if (matched) {
      const lines: string[] = [];
      lines.push(`✨ *${matched.title[lang]}*`);
      lines.push(es ? "\n🟢 *Qué PUEDE hacer:*" : "\n🟢 *What it CAN do:*");
      matched.can[lang].forEach((c) => lines.push(`  • ${c}`));
      lines.push(es ? "\n🔴 *Qué NO puede hacer:*" : "\n🔴 *What it CANNOT do:*");
      matched.cannot[lang].forEach((c) => lines.push(`  • ${c}`));
      lines.push(es ? "\n💬 *Ejemplos para probar:*" : "\n💬 *Examples to try:*");
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
      ? "Puedo gestionar tus tareas y calcular qué es lo más urgente teniendo en cuenta listas desatendidas, hacer el cierre del día, consultar tus sesiones de Codex, sincronizar recordatorios con tu Echo, redactar correos en Gmail y charlar de cualquier tema guardando memoria de tus preferencias."
      : "I can prioritize tasks based on urgency and neglected areas, run your daily shutdown, check your Codex sessions, sync reminders to your Echo, draft Gmail messages, and chat while continuously learning your habits.";
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
      ? "Estoy preparado para gestionar tu día a día con rigor y cero fricción. Aquí tienes mis áreas principales:\n"
      : "Engineered to manage your day with precision and zero friction. Here are my core domains:\n",
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
    ? "Puedo gestionar tus tareas y urgencias, tus sesiones de Codex, tus rituales diarios, avisos en Alexa, Gmail y memoria continua."
    : "I can manage your tasks, Codex sessions, daily rituals, Alexa alarms, Gmail, and continuous memory.";

  return { text: lines.join("\n"), speech };
}
