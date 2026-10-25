import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock3, RotateCcw, Trash2 } from "lucide-react";
import { useEmptyTrash, useRestoreTask, useTrash } from "@/lib/data";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/lixeira")({
  head: () => ({ meta: [{ title: "Lixeira — Ritmo" }] }),
  component: TrashPage,
});

function TrashPage() {
  const { data: tasks = [], isLoading } = useTrash();
  const restore = useRestoreTask();
  const empty = useEmptyTrash();
  const [emptyOpen, setEmptyOpen] = useState(false);
  const roots = tasks.filter(
    (task) => !task.parent_id || !tasks.some((candidate) => candidate.id === task.parent_id),
  );

  return (
    <>
      <PageHeader
        title="Lixeira"
        subtitle="As tarefas excluídas são removidas definitivamente após 30 dias."
        action={
          tasks.length ? (
            <Button
              variant="destructive"
              disabled={empty.isPending}
              onClick={() => setEmptyOpen(true)}
            >
              <Trash2 /> Esvaziar lixeira
            </Button>
          ) : null
        }
      />
      <div className="space-y-2">
        {isLoading ? null : roots.length ? (
          roots.map((task) => {
            const deletedAt = parseISO(task.deleted_at!);
            const elapsed = Math.max(0, differenceInCalendarDays(new Date(), deletedAt));
            const remaining = Math.max(0, 30 - elapsed);
            const childCount = tasks.filter((child) => child.parent_id === task.id).length;
            return (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{task.title}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Excluída em {format(deletedAt, "d 'de' MMMM", { locale: ptBR })}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" /> {remaining}{" "}
                      {remaining === 1 ? "dia restante" : "dias restantes"}
                    </span>
                    {childCount > 0 && <span>{childCount} subtarefa(s) vinculada(s)</span>}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(task.id)}
                >
                  <RotateCcw /> Restaurar
                </Button>
              </div>
            );
          })
        ) : (
          <Empty>A lixeira está vazia.</Empty>
        )}
      </div>
      <AlertDialog open={emptyOpen} onOpenChange={setEmptyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esvaziar a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              {tasks.length}{" "}
              {tasks.length === 1 ? "tarefa será excluída" : "tarefas serão excluídas"}
              definitivamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={empty.isPending}
              onClick={() => empty.mutate({})}
            >
              <Trash2 /> Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
