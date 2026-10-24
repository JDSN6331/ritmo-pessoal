import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame, Plus, Trash2 } from "lucide-react";
import { useDeleteHabit, useHabits, useSaveHabit, useToggleHabit } from "@/lib/data";
import { habitStreak, isHabitDay, toISODate } from "@/lib/planner";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/habitos")({
  head: () => ({ meta: [{ title: "Hábitos — Ritmo" }, { name: "description", content: "Acompanhe seus hábitos e sequências." }] }),
  component: HabitsPage,
});

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

function HabitsPage() {
  const { data } = useHabits();
  const toggle = useToggleHabit();
  const del = useDeleteHabit();
  const save = useSaveHabit();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const last14 = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));
  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !days.length) return;
    save.mutate({ title: title.trim(), days_of_week: days, frequency: days.length === 7 ? "daily" : "custom" }, {
      onSuccess: () => { setOpen(false); setTitle(""); setDays([0, 1, 2, 3, 4, 5, 6]); },
    });
  };

  return (
    <>
      <PageHeader title="Hábitos" subtitle="Últimos 14 dias" action={<Button onClick={() => setOpen(true)}><Plus /> Novo hábito</Button>} />
      <div className="space-y-3">
        {habits.length === 0 && <Empty>Crie seu primeiro hábito para começar uma sequência.</Empty>}
        {habits.map((h) => {
          const set = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date));
          const streak = habitStreak(h.days_of_week, set);
          return (
            <div key={h.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{h.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.days_of_week.length === 7 ? "Todos os dias" : h.days_of_week.map((d) => WEEK[d]).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
                    streak > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                    <Flame className="size-4" /> {streak}
                  </span>
                  <Button size="icon" variant="ghost" aria-label="Excluir hábito" onClick={() => del.mutate(h.id)}><Trash2 /></Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1.5 sm:grid-cols-14">
                {last14.map((d) => {
                  const iso = toISODate(d);
                  const sched = isHabitDay(h.days_of_week, d);
                  const done = set.has(iso);
                  return (
                    <button key={iso} disabled={!sched} title={format(d, "d MMM", { locale: ptBR })}
                      onClick={() => toggle.mutate({ habitId: h.id, date: iso, done })}
                      className={cn("flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors",
                        !sched && "opacity-25",
                        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
                      <span>{WEEK[d.getDay()]}</span>
                      <span className="text-xs font-semibold">{format(d, "d")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo hábito</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="h-title">Nome</Label>
              <Input id="h-title" autoFocus placeholder="Ex.: Ler 20 páginas" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Dias da semana</Label>
              <div className="flex gap-1.5">
                {WEEK.map((w, i) => {
                  const on = days.includes(i);
                  return (
                    <button type="button" key={i} onClick={() => setDays(on ? days.filter((d) => d !== i) : [...days, i].sort())}
                      className={cn("size-9 rounded-lg text-sm font-medium transition-colors", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
