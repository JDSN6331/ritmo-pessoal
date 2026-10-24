import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, Pencil, Play, Repeat, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { displayStatus, RECURRENCE_LABEL, type Recurrence } from "@/lib/planner";
import { useDeleteTask, useSetTaskStatus, type Task } from "@/lib/data";
import { Button } from "@/components/ui/button";

const STATUS_STYLE = {
  done: { label: "Concluída", cls: "bg-success/15 text-success" },
  overdue: { label: "Atrasada", cls: "bg-destructive/15 text-destructive" },
  in_progress: { label: "Em andamento", cls: "bg-info/15 text-info" },
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
} as const;

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

export function TaskItem({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const setStatus = useSetTaskStatus();
  const del = useDeleteTask();
  const ds = displayStatus(task);
  const st = STATUS_STYLE[ds];
  const done = task.status === "done";

  return (
    <div className="group flex items-start gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/30">
      <button
        aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
        onClick={() => setStatus.mutate({ task, status: done ? "pending" : "done" })}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 hover:border-primary",
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
          <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>{task.title}</p>
        </div>
        {task.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{task.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", st.cls)}>{st.label}</span>
          {task.due_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {format(parseISO(task.due_date), "d MMM", { locale: ptBR })}
            </span>
          )}
          {task.recurrence !== "none" && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3" />
              {RECURRENCE_LABEL[task.recurrence as Recurrence]}
              {task.recurrence_interval > 1 && ` ×${task.recurrence_interval}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        {task.status === "pending" && (
          <Button size="icon" variant="ghost" aria-label="Iniciar" onClick={() => setStatus.mutate({ task, status: "in_progress" })}>
            <Play />
          </Button>
        )}
        <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit(task)}>
          <Pencil />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => del.mutate(task.id)}>
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
