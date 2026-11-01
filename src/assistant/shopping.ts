import { withHomeLock } from "./home.js";
import {
  TaskSchema,
  SHOPPING,
  listTasks,
  isTaskSensitive,
  type Task,
} from "./tasks.js";
import { updateCollection } from "./store.js";
import { fold } from "./text.js";

export const SHOPPING_AISLES = [
  "Frutería/Frescos",
  "Lácteos/Nevera",
  "Carnicería/Pescado",
  "Limpieza",
  "Despensa",
  "Sin clasificar",
] as const;
export type ShoppingAisle = (typeof SHOPPING_AISLES)[number];
export interface ShoppingButton {
  text: string;
  callback_data: string;
}
export function classifyShoppingItem(text: string): ShoppingAisle {
  const value = fold(text);
  if (
    /\b(?:lejia|detergente|lavavajillas|suavizante|limpiador\w*|fregasuelos|jabon|estropajo\w*|bayeta\w*|bolsas? de basura|papel higienico|bleach|detergent|dish soap)\b/.test(
      value,
    )
  )
    return "Limpieza";
  if (
    /\b(?:conservas?|en lata|canned|aceite|arroz|pasta|macarrones|espaguetis|harina|azucar|sal|cafe|te|pan|galletas|cereales|lentejas|garbanzos|alubias|judias secas|vinagre|chocolate|miel|mermelada|agua|rice|bread|flour|sugar|coffee)\b/.test(
      value,
    )
  )
    return "Despensa";
  if (
    /\b(?:leche|yogur\w*|queso\w*|mantequilla|nata|kefir|huevos?|milk|yogurt|cheese|butter|eggs?)\b/.test(
      value,
    )
  )
    return "Lácteos/Nevera";
  if (
    /\b(?:pollo|pavo|ternera|cerdo|carne|bistec|filetes?|salmon|merluza|bacalao|atun|sardinas?|pescado|gambas?|langostinos?|marisco|chicken|beef|pork|fish|salmon|shrimp)\b/.test(
      value,
    )
  )
    return "Carnicería/Pescado";
  if (
    /\b(?:manzanas?|platanos?|bananas?|peras?|naranjas?|mandarinas?|limones?|fresas?|uvas?|kiwis?|melocotones?|melones?|sandias?|aguacates?|tomates?|lechugas?|patatas?|cebollas?|ajos?|zanahorias?|pimientos?|calabacines?|brocoli|espinacas?|champi[nñ]ones?|frutas?|verduras?|apples?|bananas?|oranges?|potatoes?|onions?|carrots?|lettuce|tomatoes?)\b/.test(
      value,
    )
  )
    return "Frutería/Frescos";
  return "Sin clasificar";
}
export function groupShoppingItems(
  tasks: Task[],
): Array<{ aisle: ShoppingAisle; items: Task[] }> {
  return SHOPPING_AISLES.map((aisle) => ({
    aisle,
    items: tasks.filter(
      (task) =>
        task.list === SHOPPING &&
        task.status === "open" &&
        classifyShoppingItem(task.text) === aisle,
    ),
  })).filter((group) => group.items.length > 0);
}
export function shoppingList(
  home: string,
  lang: "es" | "en" = "es",
  requestedPage = 0,
): { text: string; buttons: ShoppingButton[][]; page: number; pages: number } {
  const tasks = groupShoppingItems(
    listTasks(home, { list: SHOPPING }).filter(
      (task) => !isTaskSensitive(task),
    ),
  ).flatMap((group) => group.items);
  const pages = Math.max(1, Math.ceil(tasks.length / 10));
  const page = Math.min(
    pages - 1,
    Math.max(0, Number.isSafeInteger(requestedPage) ? requestedPage : 0),
  );
  const visible = tasks.slice(page * 10, (page + 1) * 10);
  const text = tasks.length
    ? `${lang === "es" ? "Lista de la compra" : "Shopping list"} (${tasks.length})\n${groupShoppingItems(
        visible,
      )
        .map(
          (group) =>
            `${group.aisle}\n${group.items.map((task) => `☐ ${task.text}`).join("\n")}`,
        )
        .join("\n\n")}${pages > 1 ? `\n\n${page + 1}/${pages}` : ""}`
    : lang === "es"
      ? "La lista de la compra está vacía."
      : "Your shopping list is empty.";
  const buttons = visible.map((task) => [
    {
      text: `✓ ${Array.from(task.text).slice(0, 40).join("")}`,
      callback_data: `shop:done:${task.id}:${page}`,
    },
  ]);
  const navigation: ShoppingButton[] = [];
  if (page > 0)
    navigation.push({ text: "←", callback_data: `shop:page:${page - 1}` });
  if (page + 1 < pages)
    navigation.push({ text: "→", callback_data: `shop:page:${page + 1}` });
  if (navigation.length) buttons.push(navigation);
  return { text, buttons, page, pages };
}
export function completeShoppingItem(
  home: string,
  id: string,
  now = new Date(),
): Task {
  return withHomeLock(home, () =>
    updateCollection(home, "tasks", TaskSchema, (items) => {
      const task = items.find(
        (item) => item.id === id && item.list === SHOPPING,
      );
      if (!task) throw new Error("Shopping item not found");
      if (task.status === "open") {
        task.status = "done";
        task.done = now.toISOString();
        task.completions = [
          ...new Set([...(task.completions ?? []), task.done]),
        ].slice(-10000);
        task.updated = now.toISOString();
      }
      return { ...task };
    }),
  );
}
