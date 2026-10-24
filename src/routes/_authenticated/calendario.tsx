import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTasks, type Task } from "@/lib/data";
import { displayStatus, toISODate, todayISO } from "@/lib/planner";
import { TaskItem } from "@/components/task-item";
import { TaskDialog } from "@/components/task-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Ritmo" }, { name: "description", content: "Suas tarefas no calendário." }] }),
  component: CalendarPage,
});

const DOT = { done: "bg-success", overdue: "bg-destructive", in_progress: "bg-info", pending: "bg-primary" } as const;

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const byDate = new Map<string, Task[]>();
  tasks.forEach((t) => { if (t.due_date) byDate.set(t.due_date, [...(byDate.get(t.due_date) ?? []), t]); });
  const today = todayISO();
  const dayTasks = byDate.get(selected) ?? [];

  return (
    <>
      <PageHeader title="Calendário" action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Nova tarefa</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</h2>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setMonth(new Date()); setSelected(today); }}>Hoje</Button>
              <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = toISODate(d);
              const ts = byDate.get(iso) ?? [];
              return (
                <button key={iso} onClick={() => setSelected(iso)}
                  className={cn("flex aspect-square flex-col items-center justify-start gap-1 rounded-lg p-1.5 text-sm transition-colors hover:bg-accent",
                    !isSameMonth(d, month) && "text-muted-foreground/40",
                    selected === iso && "bg-accent ring-1 ring-primary/50")}>
                  <span className={cn("flex size-7 items-center justify-center rounded-full", iso === today && "bg-primary font-semibold text-primary-foreground")}>
                    {format(d, "d")}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {ts.slice(0, 4).map((t) => <span key={t.id} className={cn("size-1.5 rounded-full", DOT[displayStatus(t, today)])} />)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">
            {format(new Date(selected + "T12:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {dayTasks.length ? dayTasks.map((t) => <TaskItem key={t.id} task={t} onEdit={(t) => { setEditing(t); setOpen(true); }} />) : <Empty>Sem tarefas neste dia.</Empty>}
          </div>
        </div>
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} defaultDate={selected} />
    </>
  );
}
