import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLists, useSaveTask, useTasks, type SubtaskDraft, type Task } from "@/lib/data";
import { RECURRENCE_LABEL } from "@/lib/planner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task | null;
  defaultDate?: string;
};

type SubtaskField = SubtaskDraft & { key: string };

export function TaskDialog({ open, onOpenChange, task, defaultDate }: Props) {
  const save = useSaveTask();
  const [subtasks, setSubtasks] = useState<SubtaskField[]>([]);
  const [f, setF] = useState({
    title: "",
    description: "",
    due_date: "",
    due_time: "",
    list_id: "none",
    priority: "medium",
    status: "pending",
    recurrence: "none",
    recurrence_interval: 1,
  });
  const { data: lists = [] } = useLists();
  const { data: tasks = [] } = useTasks();

  useEffect(() => {
    if (!open) return;
    setF({
      title: task?.title ?? "",
      description: task?.description ?? "",
      due_date: task?.due_date ?? defaultDate ?? "",
      due_time: task?.due_time ?? "",
      list_id: task?.list_id ?? lists[0]?.id ?? "none",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      recurrence: task?.recurrence ?? "none",
      recurrence_interval: task?.recurrence_interval ?? 1,
    });
    setSubtasks(
      task && !task.parent_id
        ? tasks
            .filter((candidate) => candidate.parent_id === task.id)
            .map((candidate) => ({
              id: candidate.id,
              title: candidate.title,
              key: candidate.id,
            }))
        : [],
    );
  }, [open, task, defaultDate, lists, tasks]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    if (f.recurrence !== "none" && !f.due_date) return;
    save.mutate(
      {
        ...f,
        ...(task ? { id: task.id } : {}),
        title: f.title.trim(),
        description: f.description || null,
        due_date: f.due_date || null,
        due_time: f.due_time || null,
        list_id: f.list_id === "none" ? null : f.list_id,
        parent_id: task?.parent_id ?? null,
        ...(!task?.parent_id
          ? {
              subtasks: subtasks
                .filter((subtask) => subtask.title.trim())
                .map(({ id, title }) => ({ ...(id ? { id } : {}), title: title.trim() })),
            }
          : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Título</Label>
            <Input
              id="t-title"
              autoFocus
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea
              id="t-desc"
              rows={2}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          {!task?.parent_id && (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Subtarefas</Label>
                  <p className="text-xs text-muted-foreground">
                    Cadastre as etapas que fazem parte desta tarefa.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSubtasks((current) => [...current, { key: crypto.randomUUID(), title: "" }])
                  }
                >
                  <Plus /> Adicionar
                </Button>
              </div>
              {subtasks.length === 0 ? (
                <button
                  type="button"
                  className="w-full rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  onClick={() => setSubtasks([{ key: crypto.randomUUID(), title: "" }])}
                >
                  + Adicionar a primeira subtarefa
                </button>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div key={subtask.key} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <Input
                        aria-label={`Subtarefa ${index + 1}`}
                        placeholder="Título da subtarefa"
                        value={subtask.title}
                        onChange={(event) =>
                          setSubtasks((current) =>
                            current.map((item) =>
                              item.key === subtask.key
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remover subtarefa ${index + 1}`}
                        onClick={() =>
                          setSubtasks((current) =>
                            current.filter((item) => item.key !== subtask.key),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-date">Data</Label>
              <Input
                id="t-date"
                type="date"
                value={f.due_date}
                onChange={(e) => setF({ ...f, due_date: e.target.value })}
                required={f.recurrence !== "none"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-time">Horário</Label>
              <Input
                id="t-time"
                type="time"
                value={f.due_time}
                onChange={(e) => setF({ ...f, due_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lista</Label>
              <Select value={f.list_id} onValueChange={(v) => setF({ ...f, list_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lista</SelectItem>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Repetição</Label>
              <Select value={f.recurrence} onValueChange={(v) => setF({ ...f, recurrence: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-int">A cada</Label>
              <Input
                id="t-int"
                type="number"
                min={1}
                disabled={f.recurrence === "none"}
                value={f.recurrence_interval}
                onChange={(e) =>
                  setF({ ...f, recurrence_interval: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Situação</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                  <SelectItem value="not_done">Não feita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {f.recurrence !== "none" && (
            <p className="text-xs text-muted-foreground">
              Ao concluir, a próxima ocorrência é criada automaticamente.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
