import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  CornerDownRight,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { displayStatus, RECURRENCE_LABEL, subtaskProgress, type Recurrence } from "@/lib/planner";
import { useDeleteTask, useSaveTask, useSetTaskStatus, type Task } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  not_done: { label: "Não Feita", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
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
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const saveTask = useSaveTask();
  const progress = subtaskProgress(subtasks);

  const openAddSubtask = () => {
    setNewSubtaskTitle("");
    setAddSubtaskOpen(true);
  };

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
      {(subtasks.length > 0 || !onSelectedChange) && (
        <div className="border-t bg-muted/[0.12] px-3 pb-2">
          {subtasks.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={subtasksExpanded}
                onClick={() => setSubtasksExpanded((expanded) => !expanded)}
              >
                {subtasksExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                <CornerDownRight className="size-3.5" />
                {subtasks.length} {subtasks.length === 1 ? "subtarefa" : "subtarefas"}
                <span
                  className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-semibold tabular-nums text-primary"
                  title={`${progress.done} de ${progress.total} subtarefas concluídas`}
                >
                  {progress.done}/{progress.total} = {progress.percentage}%
                </span>
              </button>
              {!onSelectedChange && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={openAddSubtask}
                >
                  <Plus /> Adicionar
                </Button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              onClick={openAddSubtask}
            >
              <Plus className="size-3.5" /> Adicionar subtarefa
            </button>
          )}
          {subtasks.length > 0 && (
            <div
              className="mb-2 h-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progresso das subtarefas"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percentage}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}
          {subtasks.length > 0 && subtasksExpanded && (
            <div className="divide-y rounded-lg border bg-background/40">
              {subtasks.map((subtask) => (
                <TaskRow key={subtask.id} task={subtask} nested onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>
      )}
      <Dialog
        open={addSubtaskOpen}
        onOpenChange={(open) => {
          setAddSubtaskOpen(open);
          if (!open) setNewSubtaskTitle("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar subtarefa</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const title = newSubtaskTitle.trim();
              if (!title) return;
              saveTask.mutate(
                { title, parent_id: task.id },
                {
                  onSuccess: () => {
                    setNewSubtaskTitle("");
                    setAddSubtaskOpen(false);
                  },
                },
              );
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor={`new-subtask-${task.id}`}>Nome da subtarefa</Label>
              <Input
                id={`new-subtask-${task.id}`}
                autoFocus
                required
                maxLength={500}
                value={newSubtaskTitle}
                onChange={(event) => setNewSubtaskTitle(event.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">
                {newSubtaskTitle.length}/500
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddSubtaskOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveTask.isPending || !newSubtaskTitle.trim()}>
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
          nested && "gap-2.5 p-2.5",
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
            aria-label={
              done
                ? nested
                  ? "Reabrir subtarefa"
                  : "Reabrir tarefa"
                : nested
                  ? "Concluir subtarefa"
                  : "Concluir tarefa"
            }
            onClick={() => setStatus.mutate({ task, status: done ? "pending" : "done" })}
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
              nested && "size-4 rounded-[4px]",
              done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/50 hover:border-primary",
            )}
          >
            {done && <Check className={cn("size-3.5", nested && "size-3")} strokeWidth={3} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {!nested && (
              <span
                className={cn("mt-2 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])}
              />
            )}
            <p
              className={cn(
                "min-w-0 font-medium",
                nested
                  ? "whitespace-normal break-words text-xs font-normal leading-relaxed [overflow-wrap:anywhere]"
                  : "break-words sm:truncate",
                done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </p>
          </div>
          {!nested && task.description && (
            <p className="mt-0.5 text-sm text-muted-foreground sm:line-clamp-1">
              {task.description}
            </p>
          )}
          {!nested && (
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
          )}
        </div>
        <div
          className={cn(
            "flex gap-1 opacity-60 transition-opacity hover:opacity-100",
            nested && "gap-0",
          )}
        >
          {!nested && task.status === "pending" && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Iniciar"
              onClick={() => setStatus.mutate({ task, status: "in_progress" })}
            >
              <Play />
            </Button>
          )}
          {!nested && task.status !== "done" && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={
                task.status === "not_done" ? "Voltar para pendente" : "Marcar como não feita"
              }
              onClick={() =>
                setStatus.mutate({
                  task,
                  status: task.status === "not_done" ? "pending" : "not_done",
                })
              }
            >
              {task.status === "not_done" ? <RotateCcw /> : <CircleX />}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className={cn(nested && "size-8")}
            aria-label={nested ? "Editar nome da subtarefa" : "Editar"}
            onClick={() => onEdit(task)}
          >
            <Pencil />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(nested && "size-8")}
            aria-label={nested ? "Excluir subtarefa" : "Excluir"}
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
