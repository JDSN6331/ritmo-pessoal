import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Plus } from "lucide-react";
import { useGoals, useHabits, useTasks, useToggleHabit, type Task } from "@/lib/data";
import {
  goalProgress,
  groupTasks,
  isHabitDay,
  isOverdue,
  localDateFromTimestamp,
  mainTasks,
  todayISO,
} from "@/lib/planner";
import { TaskItem } from "@/components/task-item";
import { TaskDialog } from "@/components/task-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({
    meta: [{ title: "Hoje — Ritmo" }, { name: "description", content: "Seu painel do dia." }],
  }),
  component: Today,
});

function Today() {
  const { data: tasks = [] } = useTasks();
  const { data: hd } = useHabits();
  const { data: goals = [] } = useGoals();
  const toggle = useToggleHabit();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const today = todayISO();
  const primaryTasks = mainTasks(tasks);

  const overdue = primaryTasks.filter((t) => isOverdue(t, today));
  const dueToday = primaryTasks.filter((t) => t.due_date === today && t.status === "pending");
  const notDone = primaryTasks.filter((t) => t.status === "not_done" && t.due_date === today);
  const inProgress = primaryTasks.filter((t) => t.status === "in_progress" && t.due_date === today);
  const doneToday = primaryTasks.filter(
    (t) =>
      t.status === "done" && t.completed_at && localDateFromTimestamp(t.completed_at) === today,
  ).length;
  const habitsToday = (hd?.habits ?? []).filter((h) => isHabitDay(h.days_of_week, new Date()));
  const logSet = new Set(
    (hd?.logs ?? []).filter((l) => l.log_date === today).map((l) => l.habit_id),
  );

  const stats = [
    { label: "Para hoje", value: dueToday.length, cls: "text-foreground" },
    {
      label: "Em andamento",
      value: inProgress.length,
      cls: "text-info",
    },
    { label: "Atrasadas", value: overdue.length, cls: "text-destructive" },
    { label: "Não feitas", value: notDone.length, cls: "text-orange-500" },
    { label: "Concluídas hoje", value: doneToday, cls: "text-success" },
  ];

  const edit = (t: Task) => {
    setEditing(t);
    setOpen(true);
  };
  const taskGroups = (items: Task[]) =>
    groupTasks(tasks, items).map(({ task, subtasks }) => (
      <TaskItem key={task.id} task={task} subtasks={subtasks} onEdit={edit} />
    ));

  return (
    <>
      <PageHeader
        title="Hoje"
        subtitle={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className={cn("font-display text-3xl font-bold", s.cls)}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {overdue.length > 0 && (
            <Section title="Atrasadas" tone="text-destructive">
              {taskGroups(overdue)}
            </Section>
          )}
          <Section title="Para hoje">
            {dueToday.length ? taskGroups(dueToday) : <Empty>Nada agendado para hoje.</Empty>}
          </Section>
          {notDone.length > 0 && (
            <Section title="Não feitas" tone="text-orange-500">
              {taskGroups(notDone)}
            </Section>
          )}
          {inProgress.length > 0 && (
            <Section title="Em andamento" tone="text-info">
              {taskGroups(inProgress)}
            </Section>
          )}
        </div>

        <div className="space-y-8">
          <Section
            title="Hábitos de hoje"
            link={
              <Link to="/habitos" className="text-xs text-primary">
                ver todos
              </Link>
            }
          >
            {habitsToday.length ? (
              habitsToday.map((h) => {
                const done = logSet.has(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggle.mutate({ habitId: h.id, date: today, done })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
                      done ? "border-primary/40" : "hover:border-primary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border-2",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/50",
                      )}
                    >
                      {done && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className={cn("text-sm", done && "text-muted-foreground line-through")}>
                      {h.title}
                    </span>
                  </button>
                );
              })
            ) : (
              <Empty>Nenhum hábito para hoje.</Empty>
            )}
          </Section>
          <Section
            title="Metas"
            link={
              <Link to="/metas" className="text-xs text-primary">
                ver todas
              </Link>
            }
          >
            {goals.length ? (
              goals.slice(0, 4).map((g) => {
                const p = goalProgress(Number(g.current_value), Number(g.target_value));
                return (
                  <div key={g.id} className="rounded-xl border bg-card p-3">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{g.title}</span>
                      <span className="text-primary">{p}%</span>
                    </div>
                    <Progress value={p} className="mt-2 h-1.5" />
                  </div>
                );
              })
            ) : (
              <Empty>Nenhuma meta ainda.</Empty>
            )}
          </Section>
        </div>
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} defaultDate={today} />
    </>
  );
}

function Section({
  title,
  tone,
  link,
  children,
}: {
  title: string;
  tone?: string;
  link?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2
          className={cn(
            "text-sm font-semibold uppercase tracking-wider text-muted-foreground",
            tone,
          )}
        >
          {title}
        </h2>
        {link}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
