import { findSecrets, looksSensitive } from "../core/secrets.js";
import { listReminders } from "./reminders.js";
import { isTaskSensitive, listTasks } from "./tasks.js";
export {
  runWeeklyReview,
  nextSundayReviewAt,
  nextMondayAt,
} from "./weeklyRitual.js";

/** Safe for voice, notifications and model context: private text never enters the result. */
export function weeklyReview(home: string, now = new Date()) {
  const safe = (text: string) =>
    !looksSensitive(text) && findSecrets(text).length === 0;
  const tasks = listTasks(home).filter(
    (item) => safe(item.text) && !isTaskSensitive(item),
  );
  const reminders = listReminders(home)
    .filter((item) => !item.sensitive && safe(item.text))
    .map(({ id, text, due, updated, failedAttempts }) => ({
      id,
      text,
      due,
      updated,
      failedAttempts,
    }));
  const cutoff = now.getTime() - 7 * 24 * 3600_000;
  return {
    generated: now.toISOString(),
    completedLast7Days: listTasks(home, { status: "done" }).filter(
      (item) =>
        safe(item.text) &&
        !isTaskSensitive(item) &&
        item.done &&
        Date.parse(item.done) >= cutoff &&
        Date.parse(item.done) <= now.getTime(),
    ),
    pendingTasks: tasks,
    overdueTasks: tasks.filter(
      (item) => item.due && Date.parse(item.due) < now.getTime(),
    ),
    staleTasks: tasks.filter((item) => Date.parse(item.updated) < cutoff),
    pendingReminders: reminders,
    staleReminders: reminders.filter(
      (item) => Date.parse(item.updated) < cutoff,
    ),
    upcomingReminders: reminders.filter(
      (item) =>
        Date.parse(item.due) >= now.getTime() &&
        Date.parse(item.due) <= now.getTime() + 7 * 24 * 3600_000,
    ),
    overdueReminders: reminders.filter(
      (item) => Date.parse(item.due) < now.getTime(),
    ),
    failedReminders: reminders.filter((item) => item.failedAttempts > 0),
  };
}
