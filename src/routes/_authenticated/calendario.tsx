import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
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
  head: () => ({ meta: [{ title: "Calendário — Ritmo" }] }),
  component: CalendarPage,
});
const DOT = {
  done: "bg-success",
  not_done: "bg-orange-500",
  overdue: "bg-destructive",
  in_progress: "bg-info",
  pending: "bg-primary",
} as const;

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayISO());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const byDate = new Map<string, Task[]>();
  tasks
    .filter((task) => !task.parent_id)
    .forEach((t) => {
      if (t.due_date) byDate.set(t.due_date, [...(byDate.get(t.due_date) ?? []), t]);
    });
  const today = todayISO();
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });
  const periodDays =
    view === "week"
      ? eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })
      : [new Date(selected + "T12:00")];
  const move = (direction: -1 | 1) => {
    if (view === "month") setCursor(direction < 0 ? subMonths(cursor, 1) : addMonths(cursor, 1));
    else if (view === "week") setCursor(direction < 0 ? subWeeks(cursor, 1) : addWeeks(cursor, 1));
    else setSelected(toISODate(addDays(new Date(selected + "T12:00"), direction)));
  };
  return (
    <>
      <PageHeader
        title="Calendário"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Nova tarefa
          </Button>
        }
      />
      <div className="mb-4 flex max-w-sm rounded-lg bg-muted p-1">
        {(["month", "week", "day"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm",
              view === v && "bg-background text-primary shadow-sm",
            )}
          >
            {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">
              {view === "day"
                ? format(new Date(selected + "T12:00"), "d 'de' MMMM yyyy", { locale: ptBR })
                : format(cursor, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Período anterior"
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCursor(new Date());
                  setSelected(today);
                }}
              >
                Hoje
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Próximo período"
                onClick={() => move(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          {view === "month" ? (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <div key={i} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((d) => {
                  const iso = toISODate(d);
                  const items = byDate.get(iso) ?? [];
                  return (
                    <button
                      key={iso}
                      onClick={() => setSelected(iso)}
                      className={cn(
                        "flex aspect-square flex-col items-center gap-1 rounded-lg p-1.5 text-sm hover:bg-accent",
                        !isSameMonth(d, cursor) && "text-muted-foreground/40",
                        selected === iso && "bg-accent ring-1 ring-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full",
                          iso === today && "bg-primary font-semibold text-primary-foreground",
                        )}
                      >
                        {format(d, "d")}
                      </span>
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {items.slice(0, 4).map((t) => (
                          <span
                            key={t.id}
                            className={cn("size-1.5 rounded-full", DOT[displayStatus(t, today)])}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={cn("grid gap-2", view === "week" && "sm:grid-cols-7")}>
              {periodDays.map((d) => {
                const iso = toISODate(d);
                const items = byDate.get(iso) ?? [];
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={cn(
                      "min-h-40 rounded-xl border p-3 text-left hover:border-primary/40",
                      selected === iso && "border-primary/60 bg-accent/40",
                    )}
                  >
                    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                      {format(d, view === "week" ? "EEE d" : "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                    {items.length ? (
                      items.map((t) => (
                        <div key={t.id} className="mb-2 rounded-md bg-background p-2 text-xs">
                          <span
                            className={cn(
                              "mr-2 inline-block size-2 rounded-full",
                              DOT[displayStatus(t, today)],
                            )}
                          />
                          {t.due_time && (
                            <span className="mr-1 text-muted-foreground">{t.due_time}</span>
                          )}
                          {t.title}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem tarefas</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">
            {format(new Date(selected + "T12:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {(byDate.get(selected) ?? []).length ? (
              (byDate.get(selected) ?? []).map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  subtasks={tasks.filter((subtask) => subtask.parent_id === t.id)}
                  onEdit={(item) => {
                    setEditing(item);
                    setOpen(true);
                  }}
                />
              ))
            ) : (
              <Empty>Sem tarefas neste dia.</Empty>
            )}
          </div>
        </div>
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} defaultDate={selected} />
    </>
  );
}
