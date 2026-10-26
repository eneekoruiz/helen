import type { AgendaRange } from "./agenda.js";
import { fold, guessLanguage } from "./text.js";

/**
 * What the owner wants, from one sentence in Spanish or English. Rules, not a model: predictable,
 * instant, offline and testable. Anything they do not cover goes to the configured model, if any.
 */
export type Intent =
  | { name: "remind"; text: string }
  | { name: "remember"; text: string }
  | { name: "forget"; query: string }
  | { name: "reminder.cancel"; query: string }
  | { name: "reminder.snooze"; when: string }
  | { name: "reminder.move"; query: string; when: string }
  | { name: "remove"; query: string }
  | { name: "reminders.list" }
  | { name: "task.add"; text: string; list?: string }
  | { name: "task.done"; query: string; list?: string }
  | { name: "tasks.list"; list?: string }
  | { name: "tasks.urgent" }
  | { name: "tasks.reschedule_overdue"; when?: string }
  | { name: "task.next_free" }
  | { name: "day.shutdown" }
  | { name: "day.kickoff" }
  | { name: "codex.status"; query?: string }
  | { name: "agenda"; range: AgendaRange }
  | { name: "recall"; query: string }
  | { name: "time" }
  | { name: "date" }
  | { name: "help"; topic?: string }
  | { name: "greeting"; morning: boolean }
  | { name: "thanks" }
  | { name: "stop" }
  | { name: "yes" }
  | { name: "no" }
  | { name: "unknown"; text: string };

export interface Understood {
  intent: Intent;
  lang: "es" | "en";
  /** The sentence without wake words and courtesy, as the owner wrote it. */
  cleaned: string;
}

type Groups = Record<string, string | undefined>;
interface Rule {
  pattern: RegExp;
  build: (
    groups: Groups,
    original: (name: string) => string | undefined,
  ) => Intent | null;
}

const LIST = String.raw`(?:(?:la|mi|las|mis|the|my)\s+)?(?:lista(?:\s+de(?:\s+(?:la|las|los|el))?\s+[a-z0-9n -]+?)?|[a-z0-9 -]+?\s+list|list|compra|shopping)`;
const RANGE_ES = String.raw`hoy|manana|esta\s+semana|la\s+semana(?:\s+que\s+viene)?|esta\s+tarde|esta\s+noche`;

function range(value: string | undefined): AgendaRange {
  const text = fold(value ?? "").trim();
  if (/^(?:manana|tomorrow)/.test(text)) return "tomorrow";
  if (/semana|week/.test(text)) return "week";
  return "today";
}

/** Rules in priority order: specific phrasings before general ones ("recuérdamelo" before "recuérdame"). */
const RULES: Rule[] = [
  // Snooze the reminder that just fired.
  {
    pattern:
      /^(?:pospon(?:lo|la|er)?|aplaza(?:lo|la)?|retrasa(?:lo|la)?|recuerdamelo|recuerdamela|avisame\s+otra\s+vez|repitelo|snooze(?:\s+it|\s+that)?|remind\s+me\s+again)(?:\s+(?:eso|esto|ese|este|el\s+recordatorio|it|that))?(?:\s+(?<when>.+))?$/,
    build: (_g, o) => ({ name: "reminder.snooze", when: o("when") ?? "" }),
  },
  // Move a reminder to another time.
  {
    pattern:
      /^(?:cambia|cambiame|mueve|mueveme|pasa|pasame|reprograma|retrasa|adelanta|pospon|aplaza)\s+(?:el\s+|mi\s+|ese\s+)?(?:recordatorio|aviso|alarma)\s+(?:de\s+|del\s+|para\s+|sobre\s+)?(?<query>.+?)\s+(?:a\s+las?|a|para\s+las?|para|al|hasta)\s+(?<when>.+)$/,
    build: (_g, o) => ({
      name: "reminder.move",
      query: o("query")!,
      when: o("when")!,
    }),
  },
  {
    pattern:
      /^(?:move|change|reschedule|push)\s+(?:the\s+|my\s+)?reminder\s+(?:to\s+|about\s+|for\s+|of\s+)?(?<query>.+?)\s+(?:to|until|for)\s+(?<when>.+)$/,
    build: (_g, o) => ({
      name: "reminder.move",
      query: o("query")!,
      when: o("when")!,
    }),
  },
  // Cancel a reminder.
  {
    pattern:
      /^(?:cancela|borra|elimina|quita|anula|desactiva)\s+(?:el\s+|mi\s+|ese\s+|este\s+|los\s+)?(?:recordatorios?|avisos?|alarmas?)(?:\s+(?:de|para|sobre|que)\b)?\s*(?<query>.*)$/,
    build: (_g, o) => ({ name: "reminder.cancel", query: o("query") ?? "" }),
  },
  {
    pattern:
      /^(?:cancel|delete|remove|clear)\s+(?:the\s+|my\s+|that\s+|this\s+)?reminders?(?:\s+(?:to|about|for|of)\b)?\s*(?<query>.*)$/,
    build: (_g, o) => ({ name: "reminder.cancel", query: o("query") ?? "" }),
  },
  // List reminders.
  {
    pattern:
      /^(?:(?:que|cuales\s+son\s+(?:mis\s+|los\s+)?)\s*recordatorios(?:\s+tengo)?|(?:mis|ver|lista\s+de|dime\s+(?:mis|los)|leeme\s+(?:mis|los))\s+recordatorios|recordatorios(?:\s+pendientes)?|(?:list|show|read)\s+(?:me\s+)?(?:my\s+)?reminders|what\s+reminders(?:\s+do\s+i\s+have)?|(?:my\s+)?reminders)$/,
    build: () => ({ name: "reminders.list" }),
  },
  // "Todos los lunes a las 8 recuérdame ir al gimnasio": the time comes first.
  {
    pattern:
      /^(?<when>(?:todos\s+los|cada|el|la|los|manana|hoy|pasado\s+manana|esta|este|en\s+\d+|a\s+las|every|tomorrow|today|on|at|in\s+\d+|next)\b.+?),?\s+(?:recuerdame|avisame|alertame|remind\s+me)\s+(?:de\s+|to\s+|that\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remind", text: `${o("text")!} ${o("when")!}` }),
  },
  // Create a reminder.
  {
    pattern:
      /^(?:recuerdame|recordarme|acuerdame|avisame|alertame)\s+(?:de\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remind", text: o("text")! }),
  },
  {
    pattern:
      /^(?:me\s+(?:recuerdas|recordaras|avisas|avisaras)|(?:puedes|podrias)\s+(?:recordarme|avisarme))\s+(?:de\s+|que\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remind", text: o("text")! }),
  },
  {
    pattern:
      /^(?:pon(?:me)?|crea(?:me)?|anade|programa|configura)\s+(?:un\s+)?(?:recordatorio|aviso|alarma)\s+(?:para\s+|de\s+|que\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remind", text: o("text")! }),
  },
  {
    pattern: /^remind\s+me\s+(?:to\s+|that\s+|about\s+|of\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remind", text: o("text")! }),
  },
  {
    pattern:
      /^(?:set|create|add)\s+(?:a\s+)?reminder\s+(?:to\s+|for\s+|about\s+|that\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remind", text: o("text")! }),
  },
  // Add to a list.
  {
    pattern: new RegExp(
      String.raw`^(?:anade|agrega|apunta|pon|mete|incluye|add|put)\s+(?<text>.+?)\s+(?:a|en|to|on|in)\s+(?<list>${LIST})$`,
    ),
    build: (_g, o) => ({
      name: "task.add",
      text: o("text")!,
      list: o("list") ?? "lista",
    }),
  },
  {
    pattern: new RegExp(
      String.raw`^(?:anade|agrega|apunta|pon|mete|incluye|add|put)\s+(?:a|en|to|on|in)\s+(?<list>${LIST})\s*:?\s+(?<text>.+)$`,
    ),
    build: (_g, o) => ({
      name: "task.add",
      text: o("text")!,
      list: o("list") ?? "lista",
    }),
  },
  // "necesito…" is left out on purpose: "necesito saber dónde dejé la bici" is a question, not a task.
  {
    pattern:
      /^(?:tengo\s+que|debo|he\s+de|hay\s+que|i\s+(?:need|have)\s+to|i\s+must)\s+(?<text>.+)$/,
    build: (_g, o) => ({ name: "task.add", text: o("text")! }),
  },
  {
    pattern:
      /^(?:anade\s+(?:una\s+)?tarea|nueva\s+tarea|tarea|pendiente|todo|task|new\s+task|add\s+(?:a\s+)?task|to-?do)\s*:?\s+(?<text>.+)$/,
    build: (_g, o) => ({ name: "task.add", text: o("text")! }),
  },
  // Tick something off.
  {
    pattern: new RegExp(
      String.raw`^(?:marca|tacha|quita|borra|elimina|remove|delete|take|cross\s+off|check\s+off)\s+(?<query>.+?)\s+(?:de|en|from|off|on)\s+(?<list>${LIST})$`,
    ),
    build: (_g, o) => ({
      name: "task.done",
      query: o("query")!,
      list: o("list"),
    }),
  },
  {
    pattern:
      /^(?:marca|tacha|mark)\s+(?<query>.+?)\s+(?:como\s+(?:hech[oa]s?|completad[oa]s?|terminad[oa]s?)|as\s+(?:done|complete|completed|finished))$/,
    build: (_g, o) => ({ name: "task.done", query: o("query")! }),
  },
  {
    pattern:
      /^(?:ya\s+)?(?:he\s+)?(?:comprado|compre|hecho|hice|terminado|termine|acabado|acabe|completado|complete|cogido|pillado|llamado|llame|enviado|envie|pagado|pague)\s+(?<query>.+)$/,
    build: (_g, o) => ({ name: "task.done", query: o("query")! }),
  },
  {
    pattern:
      /^(?:i\s+(?:already\s+)?(?:did|finished|bought|got|completed|called|sent|paid)|done(?:\s+with)?|finished|completed|bought|cross\s+off|check\s+off|tick\s+off)\s+(?<query>.+)$/,
    build: (_g, o) => ({ name: "task.done", query: o("query")! }),
  },
  // Read a list.
  {
    pattern: new RegExp(
      String.raw`^(?:que\s+(?:hay|tengo|queda|pone)\s+(?:en|apuntado\s+en)\s+|(?:dime|leeme|lee|muestrame|ensename|ver|abre|what(?:'s|\s+is)\s+on|read\s+(?:me\s+)?|show\s+(?:me\s+)?)\s*)(?<list>${LIST})$`,
    ),
    build: (_g, o) => ({ name: "tasks.list", list: o("list") }),
  },
  {
    pattern:
      /^(?:que\s+tengo\s+que\s+comprar|que\s+(?:hace\s+falta|falta)\s+(?:comprar|en\s+casa)|what\s+do\s+i\s+need\s+to\s+buy|(?:la\s+|mi\s+)?lista\s+de\s+la\s+compra|(?:the\s+|my\s+)?shopping\s+list)$/,
    build: () => ({ name: "tasks.list", list: "compra" }),
  },
  {
    pattern:
      /^(?:que\s+(?:es\s+|tengo\s+)?(?:lo\s+)?mas\s+urgente|tareas?\s+urgentes?|lo\s+urgente|what\s+is\s+(?:most\s+)?urgent|urgent\s+tasks?)[.!?]?$/,
    build: () => ({ name: "tasks.urgent" }),
  },
  {
    pattern:
      /^(?:pasa|pasame|mueve|mueveme|reprograma|reprogramame|retrasa|pospon|aplaza)\s+(?:todas\s+)?(?:las\s+)?(?:tareas\s+)?(?:atrasadas|vencidas|pendientes\s+atrasadas|pendientes\s+vencidas|lo\s+atrasado|lo\s+vencido)(?:\s+(?:a|para|hasta)\s+(?<when>.+))?[.!?]?$/,
    build: (_g, o) => ({
      name: "tasks.reschedule_overdue",
      when: o("when") ?? "hoy",
    }),
  },
  {
    pattern:
      /^(?:reschedule|move|push|postpone)\s+(?:all\s+)?(?:the\s+)?(?:overdue\s+tasks|overdue|late\s+tasks)(?:\s+(?:to|until|for)\s+(?<when>.+))?[.!?]?$/,
    build: (_g, o) => ({
      name: "tasks.reschedule_overdue",
      when: o("when") ?? "today",
    }),
  },
  // Daily shutdown ritual.
  {
    pattern:
      /^(?:cierro\s+por\s+hoy|cerrar\s+(?:el\s+)?dia|cierre\s+(?:del\s+)?dia|daily\s+shutdown|fin\s+del\s+dia|resumen\s+(?:del\s+)?cierre|shutdown)[.!?]?$/,
    build: () => ({ name: "day.shutdown" }),
  },
  // Daily kickoff / morning plan.
  {
    pattern:
      /^(?:como\s+arranco\s+manana|plan\s+de\s+manana|preparar?\s+manana|kickoff(?:\s+(?:de\s+)?manana)?|como\s+empiezo\s+(?:el\s+dia|manana)|morning\s+kickoff)[.!?]?$/,
    build: () => ({ name: "day.kickoff" }),
  },
  // Smart next task for free slot.
  {
    pattern:
      /^(?:que\s+(?:puedo\s+hacer|hago)\s+(?:ahora|en\s+este\s+hueco|en\s+este\s+rato)|tengo\s+un\s+(?:rato|hueco)\s+libre|recomiendame\s+algo\s+(?:para\s+hacer|que\s+hacer)|en\s+que\s+me\s+pongo|what\s+should\s+i\s+do\s+now|what\s+can\s+i\s+do\s+in\s+this\s+slot|free\s+slot\s+task)[.!?]?$/,
    build: () => ({ name: "task.next_free" }),
  },
  // Antigravity & Codex session status.
  {
    pattern:
      /^(?:que\s+estabamos\s+haciendo\s+en\s+codex|que\s+dejamos\s+(?:a\s+medias\s+|pendiente\s+)?en\s+codex|sesion(?:es)?\s+de\s+codex|que\s+hay\s+pendiente\s+en\s+antigravity|que\s+estabamos\s+haciendo\s+en\s+antigravity|resumen\s+de\s+(?:la\s+)?sesion\s+de\s+antigravity|codex\s+status|antigravity\s+status)[.!?]?$/,
    build: (_g, o) => ({ name: "codex.status", query: o("query") }),
  },
  {
    pattern:
      /^(?:que\s+(?:tengo|me\s+queda)\s+(?:pendiente|por\s+hacer)|(?:mis\s+)?(?:tareas|pendientes)(?:\s+pendientes)?|(?:my\s+)?(?:tasks|to-?dos?)|what\s+do\s+i\s+(?:need|have)\s+to\s+do)$/,
    build: () => ({ name: "tasks.list" }),
  },
  // Agenda.
  {
    pattern: new RegExp(
      String.raw`^(?:que\s+(?:tengo|hay)(?:\s+(?:para|en\s+la\s+agenda(?:\s+para)?))?|que\s+me\s+espera|como\s+(?:es|viene|pinta)\s+(?:mi\s+|el\s+)?dia(?:\s+de)?)\s+(?<range>${RANGE_ES})$`,
    ),
    build: (_g, o) => ({ name: "agenda", range: range(o("range")) }),
  },
  {
    pattern: new RegExp(
      String.raw`^(?:mi\s+)?agenda(?:\s+(?:de|para))?(?:\s+(?<range>${RANGE_ES}))?$`,
    ),
    build: (_g, o) => ({ name: "agenda", range: range(o("range")) }),
  },
  {
    pattern:
      /^(?:resumen(?:\s+del\s+dia|\s+de\s+hoy)?|como\s+(?:es|viene|pinta)\s+(?:mi\s+|el\s+)?dia|briefing|daily\s+brief(?:ing)?)$/,
    build: () => ({ name: "agenda", range: "today" }),
  },
  {
    pattern:
      /^what(?:'s|\s+is|\s+do\s+i\s+have)\s+(?:on\s+)?(?:for\s+)?(?:my\s+)?(?:agenda\s+|schedule\s+)?(?:for\s+)?(?<range>today|tomorrow|this\s+week)$/,
    build: (_g, o) => ({ name: "agenda", range: range(o("range")) }),
  },
  {
    pattern:
      /^(?:my\s+)?(?:agenda|schedule)(?:\s+for)?(?:\s+(?<range>today|tomorrow|this\s+week))?$/,
    build: (_g, o) => ({ name: "agenda", range: range(o("range")) }),
  },
  // Time and date.
  {
    pattern:
      /^(?:que\s+hora\s+es|que\s+horas\s+son|(?:me\s+)?(?:dices|das)\s+la\s+hora|what\s+time\s+is\s+it|(?:tell\s+me\s+)?the\s+time)$/,
    build: () => ({ name: "time" }),
  },
  {
    pattern:
      /^(?:que\s+dia\s+es(?:\s+hoy)?|a\s+que\s+(?:dia\s+)?estamos(?:\s+hoy)?|que\s+fecha\s+es(?:\s+hoy)?|what(?:'s|\s+is)\s+(?:the\s+)?(?:date|day)(?:\s+today)?|what\s+day\s+is\s+(?:it|today))$/,
    build: () => ({ name: "date" }),
  },
  // Forget.
  {
    pattern:
      /^(?:olvida|olvidate\s+de|borra\s+de\s+tu\s+memoria|elimina\s+de\s+tu\s+memoria|borra\s+la\s+nota(?:\s+de|\s+sobre)?)\s+(?:que\s+|lo\s+del?\s+|la\s+nota\s+(?:de|sobre)\s+)?(?<query>.+)$/,
    build: (_g, o) => ({ name: "forget", query: o("query")! }),
  },
  {
    pattern:
      /^(?:forget|delete\s+(?:the\s+)?note)\s+(?:about\s+|that\s+|on\s+)?(?<query>.+)$/,
    build: (_g, o) => ({ name: "forget", query: o("query")! }),
  },
  // Ask memory.
  {
    pattern:
      /^(?:que\s+sabes\s+(?:de|sobre)|que\s+recuerdas\s+(?:de|sobre)|que\s+te\s+dije\s+(?:de|sobre)|que\s+tienes\s+(?:de|sobre|apuntado\s+(?:de|sobre))|busca(?:me)?(?:\s+en\s+(?:tu\s+|la\s+)?memoria)?|buscar|te\s+acuerdas\s+de|recuerdas)\s+(?<query>.+)$/,
    build: (_g, o) => ({ name: "recall", query: o("query")! }),
  },
  {
    pattern:
      /^(?:what\s+do\s+you\s+know\s+about|what\s+did\s+i\s+(?:tell|say\s+to)\s+you\s+about|do\s+you\s+remember|search(?:\s+(?:for|my\s+notes\s+for))?|find|look\s+up)\s+(?<query>.+)$/,
    build: (_g, o) => ({ name: "recall", query: o("query")! }),
  },
  {
    pattern:
      /^(?:que\s+(?:me\s+)?(?:habias|has|habia)\s+dicho\s+(?:de|sobre)|que\s+te\s+(?:habia\s+)?(?:dicho|conte|comente)\s+(?:de|sobre)|cuando\s+(?:era|es|fue)\s+(?:lo\s+d[eo]l?\s+|lo\s+de\s+|el\s+|la\s+|mi\s+)?|como\s+se\s+llama|cual\s+(?:era|es)\s+(?:el\s+|la\s+|mi\s+)?|donde\s+(?=(?:deje|puse|guarde|esta|estan)\b)|dime\s+(?:lo\s+que\s+sabes\s+(?:de|sobre)|algo\s+(?:de|sobre)))\s*(?<query>.+)$/,
    build: (_g, o) => ({ name: "recall", query: o("query")! }),
  },
  // Remember a fact.
  {
    pattern:
      /^(?:recuerda|recuerdalo|apunta(?:me|te)?|anota(?:me|te)?|guarda(?:me)?|memoriza|toma\s+nota(?:\s+de)?|no\s+olvides|ten\s+en\s+cuenta|quiero\s+que\s+recuerdes)\s+(?:que\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remember", text: o("text")! }),
  },
  {
    pattern:
      /^(?:remember|note|keep\s+in\s+mind|don'?t\s+forget|save|write\s+down|take\s+a\s+note(?:\s+of)?|make\s+a\s+note(?:\s+of)?)\s+(?:that\s+|of\s+)?(?<text>.+)$/,
    build: (_g, o) => ({ name: "remember", text: o("text")! }),
  },
  // "Borra lo de la leche": the target could be a task, a reminder or a note; the brain finds out.
  {
    pattern:
      /^(?:borra|elimina|quita|cancela|anula|delete|remove|cancel)\s+(?:lo\s+d[eo]l?\s+|el\s+|la\s+|los\s+|las\s+|the\s+|that\s+)?(?<query>.+)$/,
    build: (_g, o) => ({ name: "remove", query: o("query")! }),
  },
  // Small talk.
  // Specific topic capabilities: "qué puedes hacer con antigravity", "qué puedes hacer con recordatorios", etc.
  {
    pattern:
      /^(?:que\s+(?:puedes|sabes)\s+hacer\s+(?:con|en|sobre|de)\s+|what\s+can\s+you\s+do\s+(?:with|in|about)\s+)(?<topic>.+?)[.!?]?$/,
    build: (_g, o) => ({ name: "help", topic: o("topic") }),
  },
  // What can you do and what can you NOT do: "qué puedes y qué no puedes hacer", "tus límites", etc.
  {
    pattern:
      /^(?:que\s+(?:puedes|sabes)\s+y\s+que\s+no\s+(?:puedes|sabes)?\s+hacer|cuales\s+son\s+tus\s+limites|que\s+no\s+puedes\s+hacer|what\s+can\s+and\s+can'?t\s+you\s+do|what\s+are\s+your\s+limits)[.!?]?$/,
    build: () => ({ name: "help", topic: "limits" }),
  },
  // General capabilities.
  {
    pattern:
      /^(?:ayuda|ayudame|que\s+puedes\s+hacer|que\s+sabes\s+hacer|como\s+funcionas|cuales\s+son\s+tus\s+funciones|instrucciones|help|what\s+can\s+you\s+do|how\s+do\s+you\s+work|what\s+are\s+your\s+features)[.!?]?$/,
    build: () => ({ name: "help" }),
  },
  {
    pattern: /^(?:buenos\s+dias|good\s+morning)(?:\s+helen)?$/,
    build: () => ({ name: "greeting", morning: true }),
  },
  {
    pattern:
      /^(?:hola|buenas(?:\s+tardes|\s+noches)?|hey|hello|hi|good\s+(?:afternoon|evening))(?:\s+helen)?$/,
    build: () => ({ name: "greeting", morning: false }),
  },
  {
    pattern:
      /^(?:(?:muchas\s+)?gracias|genial|perfecto|thanks|thank\s+you|great|perfect)(?:\s+helen)?$/,
    build: () => ({ name: "thanks" }),
  },
  {
    pattern:
      /^(?:si|claro|vale|de\s+acuerdo|ok|okay|hazlo|guardalo|adelante|yes|yep|yeah|sure|do\s+it|go\s+ahead)(?:\s+(?:por\s+favor|please|gracias|thanks))?$/,
    build: () => ({ name: "yes" }),
  },
  {
    pattern: /^(?:no|nope|mejor\s+no|no\s+gracias|dejalo|no\s+thanks|don'?t)$/,
    build: () => ({ name: "no" }),
  },
  {
    pattern:
      /^(?:para|parar|stop|cancela|cancel|adios|hasta\s+luego|chao|bye|goodbye|nada|nothing|olvidalo|never\s+mind|salir|exit)$/,
    build: () => ({ name: "stop" }),
  },
];

const QUESTION_START =
  /^(?:cual|cuales|cuando|donde|quien|quienes|como|cuanto|cuanta|cuantos|cuantas|que|por\s+que|what|when|where|who|which|how|why|is|are|do|does|did|tengo|hay|esta|estan|es)\b/;

/** Remove wake words, courtesy and punctuation that carry no meaning ("Oye HELEN, ¿me recuerdas…?"). */
export function cleanUtterance(input: string): string {
  return input
    .normalize("NFC")
    .replace(/^[\s¿¡"'«]+/, "")
    .replace(/^(?:(?:oye|hey|hola|ok|okay|eh+)[\s,]+)?helen[\s,:;.!-]+/i, "")
    .replace(
      /^(?:oye|oiga|mira|vale|bueno|pues|venga|a\s+ver|eh+|mmm+|este|o\s+sea)[\s,]+(?=\S)/i,
      "",
    )
    .replace(/^(?:por\s+favor|please)[\s,]+/i, "")
    .replace(/\b(?:eh+|mmm+|uh+|um+)\b/gi, "")
    .replace(/^[\s¿¡"'«]+/, "")
    .replace(/[\s,]+(?:por\s+favor|please)[\s.!?]*$/i, "")
    .replace(/[\s?!.¿¡"'»]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Understand one sentence. `fallbackLang` decides when the sentence gives no clue. */
export function understand(
  input: string,
  fallbackLang: "es" | "en" = "es",
): Understood {
  const cleaned = cleanUtterance(input);
  const lang = guessLanguage(cleaned, fallbackLang);
  const folded = fold(cleaned);
  // Folding keeps positions for NFC text, so captured groups can be read back from the original (accents and case kept).
  const aligned = folded.length === cleaned.length;
  for (const rule of RULES) {
    const match = new RegExp(rule.pattern.source, "d").exec(folded);
    if (!match?.groups) {
      if (match) {
        const intent = rule.build({}, () => undefined);
        if (intent) return { intent, lang, cleaned };
      }
      continue;
    }
    const original = (name: string): string | undefined => {
      const span = match.indices?.groups?.[name];
      if (!span) return undefined;
      const text = (
        aligned
          ? cleaned.slice(span[0], span[1])
          : folded.slice(span[0], span[1])
      ).trim();
      return text || undefined;
    };
    const intent = rule.build(match.groups as Groups, original);
    if (intent) return { intent, lang, cleaned };
  }
  if (/[?¿]/.test(input) || QUESTION_START.test(folded))
    return { intent: { name: "recall", query: cleaned }, lang, cleaned };
  return { intent: { name: "unknown", text: cleaned }, lang, cleaned };
}
