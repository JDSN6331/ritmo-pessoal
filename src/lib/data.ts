import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { nextDueDate, type Recurrence } from "@/lib/planner";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type HabitInsert = Database["public"]["Tables"]["habits"]["Insert"];
export type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];

const fail = (e: Error) => toast.error(e.message);

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TaskInsert & { id?: string }) => {
      const { id, ...rest } = t;
      const { error } = id
        ? await supabase.from("tasks").update(rest).eq("id", id)
        : await supabase.from("tasks").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: fail,
  });
}

export function useSetTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, status }: { task: Task; status: Task["status"] }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", task.id);
      if (error) throw error;
      // Concluding a recurring task schedules its next occurrence.
      if (status === "done" && task.status !== "done" && task.due_date) {
        const next = nextDueDate(task.due_date, task.recurrence as Recurrence, task.recurrence_interval);
        if (next) {
          const { error: e2 } = await supabase.from("tasks").insert({
            title: task.title,
            description: task.description,
            priority: task.priority,
            recurrence: task.recurrence,
            recurrence_interval: task.recurrence_interval,
            due_date: next,
          });
          if (e2) throw e2;
          return next;
        }
      }
      return null;
    },
    onSuccess: (next) => {
      if (next) toast.success("Próxima ocorrência agendada");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: fail,
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: fail,
  });
}

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const [h, l] = await Promise.all([
        supabase.from("habits").select("*").order("created_at"),
        supabase.from("habit_logs").select("*"),
      ]);
      if (h.error) throw h.error;
      if (l.error) throw l.error;
      return { habits: h.data, logs: l.data };
    },
  });
}

export function useSaveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: HabitInsert & { id?: string }) => {
      const { id, ...rest } = h;
      const { error } = id
        ? await supabase.from("habits").update(rest).eq("id", id)
        : await supabase.from("habits").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
    onError: fail,
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
    onError: fail,
  });
}

export function useToggleHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, done }: { habitId: string; date: string; done: boolean }) => {
      const { error } = done
        ? await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date)
        : await supabase.from("habit_logs").insert({ habit_id: habitId, log_date: date });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
    onError: fail,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: GoalInsert & { id?: string }) => {
      const { id, ...rest } = g;
      const { error } = id
        ? await supabase.from("goals").update(rest).eq("id", id)
        : await supabase.from("goals").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    onError: fail,
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    onError: fail,
  });
}
