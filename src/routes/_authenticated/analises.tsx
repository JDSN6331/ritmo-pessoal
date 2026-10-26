import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, CircleX, Clock3, ListChecks, TrendingUp } from "lucide-react";
import { useDashboard } from "@/lib/data";
import {
  displayStatus,
  localDateFromTimestamp,
  mainTasks,
  todayISO,
  toISODate,
} from "@/lib/planner";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/analises")({
  head: () => ({ meta: [{ title: "Análises — Ritmo" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data } = useDashboard();
  const [selectedList, setSelectedList] = useState("all");
  const tasks = mainTasks(data?.tasks ?? []).filter(
    (task) => selectedList === "all" || task.list_id === selectedList,
  );
  const done = tasks.filter((t) => t.status === "done");
  const notDone = tasks.filter((t) => t.status === "not_done");
  const overdue = tasks.filter((t) => displayStatus(t) === "overdue");
  const active = tasks.filter((t) => !["done", "not_done"].includes(t.status));
  const rate = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = toISODate(d);
    return {
      iso,
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }),
      count: done.filter((t) => t.completed_at && localDateFromTimestamp(t.completed_at) === iso)
        .length,
    };
  });
  const max = Math.max(1, ...last7.map((d) => d.count));
  const cards = [
    { label: "Total", value: tasks.length, icon: ListChecks },
    { label: "Concluídas", value: done.length, icon: CheckCircle2 },
    { label: "Em aberto", value: active.length, icon: Clock3 },
    { label: "Não feitas", value: notDone.length, icon: CircleX },
    { label: "Taxa de conclusão", value: `${rate}%`, icon: TrendingUp },
  ];
  return (
    <>
      <PageHeader
        title="Painel de análise"
        subtitle={`Visão geral atualizada em ${new Date(todayISO() + "T12:00").toLocaleDateString("pt-BR")}`}
        action={
          <Select value={selectedList} onValueChange={setSelectedList}>
            <SelectTrigger
              className="w-full min-w-52 sm:w-64"
              aria-label="Filtrar análise por lista"
            >
              <SelectValue placeholder="Selecione uma lista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as listas</SelectItem>
              {(data?.lists ?? []).map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-5">
            <c.icon className="mb-4 size-5 text-primary" />
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Conclusões nos últimos 7 dias</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {last7.map((d) => (
              <div key={d.iso} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold">{d.count}</span>
                <div
                  className="w-full rounded-t-md bg-primary/80"
                  style={{ height: `${Math.max(4, (d.count / max) * 140)}px` }}
                />
                <span className="text-[11px] capitalize text-muted-foreground">
                  {d.label.replace(".", "")}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Saúde das tarefas</h2>
          <div className="mt-6 space-y-5">
            <Metric
              label="Concluídas"
              value={done.length}
              total={tasks.length}
              color="bg-success"
            />
            <Metric
              label="Em andamento"
              value={tasks.filter((t) => t.status === "in_progress").length}
              total={tasks.length}
              color="bg-info"
            />
            <Metric
              label="Atrasadas"
              value={overdue.length}
              total={tasks.length}
              color="bg-destructive"
            />
            <Metric
              label="Não feitas"
              value={notDone.length}
              total={tasks.length}
              color="bg-orange-500"
            />
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
