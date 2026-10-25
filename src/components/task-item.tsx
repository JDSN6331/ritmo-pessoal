import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  CircleX,
  CornerDownRight,
  Pencil,
  Play,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { displayStatus, RECURRENCE_LABEL, type Recurrence } from "@/lib/planner";
import { useDeleteTask, useSetTaskStatus, type Task } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_STYLE = {
  done: { label: "Concluída", cls: "bg-success/15 text-success" },
  not_done: { label: "Não feita", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  overdue: { label: "Atrasada", cls: "bg-destructive/15 text-destructive" },
  in_progress: { label: "Em andamento", cls: "bg-info/15 text-info" },
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
} as const;

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

type Props = {
  task: Task;
  subtasks?: Task[];
  onEdit: (task: Task) => void;
  selectedIds?: ReadonlySet<string> | undefined;
  onSelectedChange?: ((task: Task, selected: boolean) => void) | undefined;
};

export function TaskItem({ task, subtasks = [], onEdit, selectedIds, onSelectedChange }: Props) {
  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/30",
        selectedIds?.has(task.id) && "border-primary/50 bg-primary/[0.03]",
      )}
    >
      <TaskRow
        task={task}
        onEdit={onEdit}
        selected={selectedIds?.has(task.id)}
        onSelectedChange={onSelectedChange}
      />
      {subtasks.length > 0 && (
        <div className="border-t bg-muted/[0.12] px-3 pb-2">
          <p className="flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-muted-foreground">
            <CornerDownRight className="size-3.5" />
            {subtasks.length} {subtasks.length === 1 ? "subtarefa" : "subtarefas"}
          </p>
          <div className="divide-y rounded-lg border bg-background/50">
            {subtasks.map((subtask) => (
              <TaskRow
                key={subtask.id}
                task={subtask}
                nested
                onEdit={onEdit}
                selected={selectedIds?.has(subtask.id)}
                onSelectedChange={onSelectedChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  nested = false,
  onEdit,
  selected,
  onSelectedChange,
}: {
  task: Task;
  nested?: boolean;
  onEdit: (task: Task) => void;
  selected?: boolean | undefined;
  onSelectedChange?: ((task: Task, selected: boolean) => void) | undefined;
}) {
  const setStatus = useSetTaskStatus();
  const del = useDeleteTask();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const ds = displayStatus(task);
  const st = STATUS_STYLE[ds];
  const done = task.status === "done";

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 p-3.5",
          nested && "py-2.5",
          selected && "bg-primary/[0.05]",
        )}
      >
        {onSelectedChange ? (
          <Checkbox
            className="mt-0.5 size-5"
            checked={selected}
            aria-label={`Selecionar ${task.title}`}
            onCheckedChange={(value) => onSelectedChange(task, value === true)}
          />
        ) : (
          <button
            aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
            onClick={() => setStatus.mutate({ task, status: done ? "pending" : "done" })}
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
              done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/50 hover:border-primary",
            )}
          >
            {done && <Check className="size-3.5" strokeWidth={3} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
            <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>
              {task.title}
            </p>
          </div>
          {task.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{task.description}</p>
          )}
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
        <div className="flex gap-1 opacity-60 transition-opacity hover:opacity-100">
          {task.status === "pending" && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Iniciar"
              onClick={() => setStatus.mutate({ task, status: "in_progress" })}
            >
              <Play />
            </Button>
          )}
          {task.status !== "done" && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={task.status === "not_done" ? "Reabrir tarefa" : "Marcar como não feita"}
              onClick={() =>
                setStatus.mutate({
                  task,
                  status: task.status === "not_done" ? "pending" : "not_done",
                })
              }
            >
              <CircleX />
            </Button>
          )}
          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit(task)}>
            <Pencil />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Excluir"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover “{task.title}” para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              {nested
                ? "A subtarefa poderá ser restaurada durante 30 dias."
                : "A tarefa e suas subtarefas poderão ser restauradas durante 30 dias."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={del.isPending}
              onClick={() => del.mutate(task.id)}
            >
              <Trash2 /> Mover para a lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
