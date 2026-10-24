import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTasks, type Task } from "@/lib/data";
import { displayStatus, type DisplayStatus } from "@/lib/planner";
import { TaskItem } from "@/components/task-item";
import { TaskDialog } from "@/components/task-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Ritmo" }, { name: "description", content: "Todas as suas tarefas." }] }),
  component: TasksPage,
});

type Filter = "all" | DisplayStatus;
const FILTERS: { v: Filter; l: string }[] = [
  { v: "all", l: "Todas" },
  { v: "pending", l: "Pendentes" },
  { v: "in_progress", l: "Em andamento" },
  { v: "overdue", l: "Atrasadas" },
  { v: "done", l: "Concluídas" },
];

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const counts = tasks.reduce<Record<string, number>>((a, t) => {
    const s = displayStatus(t);
    a[s] = (a[s] ?? 0) + 1;
    return a;
  }, {});
  const list = tasks
    .filter((t) => filter === "all" ? displayStatus(t) !== "done" : displayStatus(t) === filter)
    .filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Tarefas" action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Nova tarefa</Button>} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex-wrap h-auto">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.v} value={f.v}>
                {f.l}{f.v !== "all" && counts[f.v] ? <span className="ml-1.5 text-xs opacity-60">{counts[f.v]}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-56" />
      </div>
      <div className="space-y-2">
        {isLoading ? null : list.length ? list.map((t) => (
          <TaskItem key={t.id} task={t} onEdit={(t) => { setEditing(t); setOpen(true); }} />
        )) : <Empty>Nenhuma tarefa aqui.</Empty>}
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} />
    </>
  );
}
