import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CircleX } from "lucide-react";
import { useTasks, type Task } from "@/lib/data";
import { groupTasks } from "@/lib/planner";
import { Empty, PageHeader } from "@/components/page-header";
import { TaskDialog } from "@/components/task-dialog";
import { TaskItem } from "@/components/task-item";

export const Route = createFileRoute("/_authenticated/nao-feitas")({
  head: () => ({ meta: [{ title: "Não feitas — Ritmo" }] }),
  component: NotDonePage,
});

function NotDonePage() {
  const { data: tasks = [], isLoading } = useTasks();
  const [editing, setEditing] = useState<Task | null>(null);
  const notDone = tasks.filter((task) => task.status === "not_done");
  const groups = groupTasks(tasks, notDone);

  return (
    <>
      <PageHeader
        title="Não feitas"
        subtitle="Revise as tarefas encerradas sem conclusão e decida o próximo passo."
      />
      {isLoading ? null : groups.length ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.05] px-4 py-3 text-sm text-muted-foreground">
            <CircleX className="size-4 text-orange-500" />
            {notDone.length} {notDone.length === 1 ? "tarefa marcada" : "tarefas marcadas"} como não
            feita{notDone.length === 1 ? "" : "s"}.
          </div>
          {groups.map(({ task, subtasks }) => (
            <TaskItem key={task.id} task={task} subtasks={subtasks} onEdit={setEditing} />
          ))}
        </div>
      ) : (
        <Empty>Nenhuma tarefa foi marcada como não feita.</Empty>
      )}
      <TaskDialog open={Boolean(editing)} onOpenChange={() => setEditing(null)} task={editing} />
    </>
  );
}
