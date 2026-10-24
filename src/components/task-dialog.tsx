import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveTask, type Task } from "@/lib/data";
import { RECURRENCE_LABEL } from "@/lib/planner";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null; defaultDate?: string };

export function TaskDialog({ open, onOpenChange, task, defaultDate }: Props) {
  const save = useSaveTask();
  const [f, setF] = useState({
    title: "", description: "", due_date: "", priority: "medium", status: "pending", recurrence: "none", recurrence_interval: 1,
  });

  useEffect(() => {
    if (!open) return;
    setF({
      title: task?.title ?? "",
      description: task?.description ?? "",
      due_date: task?.due_date ?? defaultDate ?? "",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      recurrence: task?.recurrence ?? "none",
      recurrence_interval: task?.recurrence_interval ?? 1,
    });
  }, [open, task, defaultDate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    if (f.recurrence !== "none" && !f.due_date) return;
    save.mutate(
      { ...f, id: task?.id, title: f.title.trim(), description: f.description || null, due_date: f.due_date || null },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Título</Label>
            <Input id="t-title" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea id="t-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-date">Data</Label>
              <Input id="t-date" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} required={f.recurrence !== "none"} />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-int">A cada</Label>
              <Input id="t-int" type="number" min={1} disabled={f.recurrence === "none"} value={f.recurrence_interval}
                onChange={(e) => setF({ ...f, recurrence_interval: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Situação</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {f.recurrence !== "none" && (
            <p className="text-xs text-muted-foreground">Ao concluir, a próxima ocorrência é criada automaticamente.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
