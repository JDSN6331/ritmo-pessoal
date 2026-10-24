import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useDeleteGoal, useGoals, useSaveGoal, type Goal } from "@/lib/data";
import { goalProgress } from "@/lib/planner";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — Ritmo" }, { name: "description", content: "Acompanhe o progresso das suas metas." }] }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals = [] } = useGoals();
  const save = useSaveGoal();
  const del = useDeleteGoal();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const bump = (g: Goal, delta: number) => {
    const step = Number(g.target_value) >= 20 ? Math.max(1, Math.round(Number(g.target_value) / 20)) : 1;
    save.mutate({ id: g.id, title: g.title, current_value: Math.max(0, Number(g.current_value) + delta * step) });
  };

  return (
    <>
      <PageHeader title="Metas" action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Nova meta</Button>} />
      {goals.length === 0 && <Empty>Defina uma meta e acompanhe seu avanço.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const p = goalProgress(Number(g.current_value), Number(g.target_value));
          const left = g.deadline ? differenceInCalendarDays(parseISO(g.deadline), new Date()) : null;
          return (
            <div key={g.id} className={cn("rounded-2xl border bg-card p-5", p === 100 && "border-primary/50")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-semibold">{p === 100 && <Trophy className="size-4 text-primary" />}{g.title}</h3>
                  {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" aria-label="Editar meta" onClick={() => { setEditing(g); setOpen(true); }}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir meta" onClick={() => del.mutate(g.id)}><Trash2 /></Button>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <p className="font-display text-3xl font-bold text-primary">{p}%</p>
                <p className="text-sm text-muted-foreground">{Number(g.current_value)} / {Number(g.target_value)} {g.unit}</p>
              </div>
              <Progress value={p} className="mt-3 h-2" />
              <div className="mt-4 flex items-center justify-between">
                <span className={cn("text-xs", left !== null && left < 0 && p < 100 ? "text-destructive" : "text-muted-foreground")}>
                  {g.deadline ? (left! < 0 && p < 100 ? `Prazo vencido em ${format(parseISO(g.deadline), "d MMM", { locale: ptBR })}` : `Prazo: ${format(parseISO(g.deadline), "d MMM yyyy", { locale: ptBR })}`) : "Sem prazo"}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="secondary" aria-label="Diminuir" onClick={() => bump(g, -1)}><Minus /></Button>
                  <Button size="icon" aria-label="Aumentar" onClick={() => bump(g, 1)}><Plus /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <GoalDialog open={open} onOpenChange={setOpen} goal={editing} />
    </>
  );
}

function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (o: boolean) => void; goal: Goal | null }) {
  const save = useSaveGoal();
  const [f, setF] = useState({ title: "", description: "", target_value: "100", current_value: "0", unit: "%", deadline: "" });
  useEffect(() => {
    if (open) setF({
      title: goal?.title ?? "", description: goal?.description ?? "",
      target_value: String(goal?.target_value ?? 100), current_value: String(goal?.current_value ?? 0),
      unit: goal?.unit ?? "%", deadline: goal?.deadline ?? "",
    });
  }, [open, goal]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({
      id: goal?.id, title: f.title.trim(), description: f.description || null,
      target_value: Number(f.target_value) || 1, current_value: Number(f.current_value) || 0,
      unit: f.unit, deadline: f.deadline || null,
    }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="g-t">Meta</Label><Input id="g-t" autoFocus required placeholder="Ex.: Ler 24 livros" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="g-d">Descrição</Label><Textarea id="g-d" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label htmlFor="g-c">Atual</Label><Input id="g-c" type="number" min={0} step="any" value={f.current_value} onChange={(e) => setF({ ...f, current_value: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-a">Alvo</Label><Input id="g-a" type="number" min={1} step="any" value={f.target_value} onChange={(e) => setF({ ...f, target_value: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-u">Unidade</Label><Input id="g-u" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="g-dl">Prazo</Label><Input id="g-dl" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
