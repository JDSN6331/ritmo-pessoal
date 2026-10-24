import { addDays, addMonths, addWeeks, addYears, format, parseISO, subDays } from "date-fns";

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type TaskStatus = "pending" | "in_progress" | "done";

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "Não repete",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const todayISO = () => toISODate(new Date());

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

/** A task is overdue when it has a past due date and is not done. */
export function isOverdue(t: { due_date: string | null; status: string }, today = todayISO()) {
  return !!t.due_date && t.status !== "done" && t.due_date < today;
}

export type DisplayStatus = "done" | "overdue" | "in_progress" | "pending";
export function displayStatus(t: { due_date: string | null; status: string }, today = todayISO()): DisplayStatus {
  if (t.status === "done") return "done";
  if (isOverdue(t, today)) return "overdue";
  return t.status === "in_progress" ? "in_progress" : "pending";
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
