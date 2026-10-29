import { addDays, addMonths, addWeeks, addYears, format, parseISO, subDays } from "date-fns";

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type TaskStatus = "pending" | "in_progress" | "done" | "not_done";

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "Não repete",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const todayISO = () => toISODate(new Date());
export const localDateFromTimestamp = (timestamp: string) => toISODate(new Date(timestamp));

/** Next due date for a recurring task, counted from its current due date. */
export function nextDueDate(due: string, recurrence: Recurrence, interval = 1): string | null {
  if (recurrence === "none") return null;
  const n = Math.max(1, interval);
  const d = parseISO(due);
  const next =
    recurrence === "daily"
      ? addDays(d, n)
      : recurrence === "weekly"
        ? addWeeks(d, n)
        : recurrence === "monthly"
          ? addMonths(d, n)
          : addYears(d, n);
  return toISODate(next);
}

/** A task becomes overdue on the day after its due date while it is still actionable. */
export function isOverdue(t: { due_date: string | null; status: string }, today = todayISO()) {
  return !!t.due_date && !["done", "not_done"].includes(t.status) && t.due_date < today;
}

export type DisplayStatus = "done" | "not_done" | "overdue" | "in_progress" | "pending";

/** Subtasks are internal steps and must never inflate task-level indicators. */
export function mainTasks<T extends { parent_id: string | null }>(tasks: T[]) {
  return tasks.filter((task) => !task.parent_id);
}

export function subtaskProgress<T extends { status: string }>(subtasks: T[]) {
  const total = subtasks.length;
  const done = subtasks.filter((subtask) => subtask.status === "done").length;
  const percentage = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percentage };
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  )
    return items;
  const reordered = [...items];
  const [item] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, item!);
  return reordered;
}

/** Keeps actionable subtasks first while preserving the saved order inside each group. */
export function orderSubtasks<T extends { status: string; position: number }>(subtasks: T[]) {
  return [...subtasks].sort((a, b) => {
    const statusOrder = Number(a.status === "done") - Number(b.status === "done");
    return statusOrder || a.position - b.position;
  });
}

export function displayStatus(
  t: { due_date: string | null; status: string },
  today = todayISO(),
): DisplayStatus {
  if (t.status === "done") return "done";
  if (t.status === "not_done") return "not_done";
  if (isOverdue(t, today)) return "overdue";
  return t.status === "in_progress" ? "in_progress" : "pending";
}

/** Keeps every visible subtask inside its main task instead of rendering it as a loose item. */
export function groupTasks<T extends { id: string; parent_id: string | null }>(
  allTasks: T[],
  visibleTasks: T[] = allTasks,
) {
  const visibleIds = new Set(visibleTasks.map((task) => task.id));
  const rootIds = new Set(visibleTasks.map((task) => task.parent_id ?? task.id));
  return [...rootIds]
    .map((rootId) => allTasks.find((task) => task.id === rootId && !task.parent_id))
    .filter((task): task is T => Boolean(task))
    .map((task) => ({
      task,
      subtasks: allTasks
        .filter(
          (candidate) =>
            candidate.parent_id === task.id &&
            (visibleIds.has(task.id) || visibleIds.has(candidate.id)),
        )
        .sort(
          (a, b) =>
            ((a as { position?: number }).position ?? 0) -
            ((b as { position?: number }).position ?? 0),
        ),
    }));
}

/** Whether a habit is scheduled on a given date (days_of_week uses 0 = Sunday). */
export function isHabitDay(daysOfWeek: number[], date: Date) {
  return daysOfWeek.includes(date.getDay());
}

/**
 * Current streak: consecutive scheduled days completed, ending today
 * (today counts only if done; an undone today doesn't break the streak).
 */
export function habitStreak(daysOfWeek: number[], logDates: Set<string>, today = new Date()) {
  if (daysOfWeek.length === 0) return 0;
  let streak = 0;
  let d = today;
  if (isHabitDay(daysOfWeek, d) && !logDates.has(toISODate(d))) d = subDays(d, 1);
  for (let i = 0; i < 730; i++) {
    if (isHabitDay(daysOfWeek, d)) {
      if (logDates.has(toISODate(d))) streak++;
      else break;
    }
    d = subDays(d, 1);
  }
  return streak;
}

export function goalProgress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

export function goalProgressWithSteps(
  current: number,
  target: number,
  steps: Array<{ completed_at: string | null }>,
) {
  if (!steps.length) return goalProgress(current, target);
  return Math.round((steps.filter((step) => step.completed_at).length / steps.length) * 100);
}

export function goalOverallProgress(
  current: number,
  target: number,
  metricType: "numeric" | "boolean",
  targets: Array<{
    current_value: number;
    target_value: number;
    metric_type: "numeric" | "boolean";
  }>,
) {
  if (metricType !== "boolean" || targets.length === 0) return goalProgress(current, target);
  const totalProgress = targets.reduce((sum, item) => {
    const progress =
      item.metric_type === "boolean"
        ? Number(item.current_value) >= 1
          ? 100
          : 0
        : goalProgress(Number(item.current_value), Number(item.target_value));
    return sum + progress;
  }, 0);
  return Math.round(totalProgress / targets.length);
}
