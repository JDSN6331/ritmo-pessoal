import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  api,
  type Goal,
  type GoalStep,
  type Habit,
  type HabitLog,
  type Task,
  type TaskList,
  type User,
} from "@/lib/api";

export type { Goal, GoalStep, Habit, HabitLog, Task, TaskList, User };
export type TaskInsert = Partial<Task> & Pick<Task, "title">;
export type SubtaskDraft = { id?: string; title: string; position?: number };
export type HabitInsert = Partial<Habit> & Pick<Habit, "title">;
export type GoalStepDraft = {
  id?: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  metric_type: "numeric" | "boolean";
};
export type GoalInsert = Partial<Omit<Goal, "steps">> &
  Pick<Goal, "title"> & { steps?: GoalStepDraft[] };
export type Dashboard = {
  user: User;
  tasks: Task[];
  trash: Task[];
  habits: Habit[];
  logs: HabitLog[];
  goals: Goal[];
  lists: TaskList[];
};

const fail = (e: Error) => toast.error(e.message);
export const dashboardKey = ["dashboard"] as const;

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKey,
    queryFn: () => api<Dashboard>("dashboard"),
    staleTime: 15_000,
  });
}

function useAction<T extends Record<string, unknown>>(action: string, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: T) => api(action, payload),
    onSuccess: () => {
      if (success) toast.success(success);
      qc.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: fail,
  });
}

export function useTasks() {
  const q = useDashboard();
  return { ...q, data: q.data?.tasks };
}
export function useTrash() {
  const q = useDashboard();
  return { ...q, data: q.data?.trash };
}
export const useSaveTask = () =>
  useAction<TaskInsert & { id?: string; subtasks?: SubtaskDraft[] }>("task.save", "Tarefa salva");
export const useReorderSubtasks = () =>
  useAction<{ parent_id: string; ids: string[] }>("task.subtasks.reorder");
export function useSetTaskStatus() {
  const action = useAction<{ id: string; status: string }>("task.status");
  return {
    ...action,
    mutate: (
      { task, status }: { task: Task; status: Task["status"] },
      options?: Parameters<typeof action.mutate>[1],
    ) => action.mutate({ id: task.id, status }, options),
  };
}
export function useDeleteTask() {
  const action = useAction<{ id: string }>("task.delete", "Tarefa movida para a lixeira");
  return { ...action, mutate: (id: string) => action.mutate({ id }) };
}
export function useRestoreTask() {
  const action = useAction<{ id: string }>("task.restore", "Tarefa restaurada");
  return { ...action, mutate: (id: string) => action.mutate({ id }) };
}
export const useEmptyTrash = () =>
  useAction<Record<string, never>>("trash.empty", "Lixeira esvaziada");
export const useBulkTasks = () =>
  useAction<{ ids: string[]; operation: string; value?: string | null }>(
    "task.bulk",
    "Tarefas atualizadas",
  );

export function useLists() {
  const q = useDashboard();
  return { ...q, data: q.data?.lists };
}
export const useSaveList = () =>
  useAction<Partial<TaskList> & Pick<TaskList, "name">>("list.save", "Lista salva");
export function useDeleteList() {
  const action = useAction<{ id: string }>("list.delete", "Lista excluída");
  return { ...action, mutate: (id: string) => action.mutate({ id }) };
}

export function useHabits() {
  const q = useDashboard();
  return { ...q, data: q.data ? { habits: q.data.habits, logs: q.data.logs } : undefined };
}
export const useSaveHabit = () =>
  useAction<HabitInsert & { id?: string }>("habit.save", "Hábito salvo");
export function useDeleteHabit() {
  const action = useAction<{ id: string }>("habit.delete", "Hábito excluído");
  return { ...action, mutate: (id: string) => action.mutate({ id }) };
}
export function useToggleHabit() {
  const action = useAction<{ habit_id: string; log_date: string }>("habit.toggle");
  return {
    ...action,
    mutate: ({ habitId, date }: { habitId: string; date: string; done: boolean }) =>
      action.mutate({ habit_id: habitId, log_date: date }),
  };
}

export function useGoals() {
  const q = useDashboard();
  return { ...q, data: q.data?.goals };
}
export const useSaveGoal = () => useAction<GoalInsert & { id?: string }>("goal.save", "Meta salva");
export const useChangeGoalProgress = () =>
  useAction<{ id: string; delta: -1 | 1 }>("goal.progress");
export const useChangeGoalTargetProgress = () =>
  useAction<{ id: string; delta: -1 | 1 }>("goal.target.progress");
export const useSetGoalStepStatus = () =>
  useAction<{ id: string; completed: boolean }>("goal.step.status");
export function useDeleteGoal() {
  const action = useAction<{ id: string }>("goal.delete", "Meta excluída");
  return { ...action, mutate: (id: string) => action.mutate({ id }) };
}
