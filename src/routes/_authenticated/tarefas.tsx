import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarClock,
  FolderPlus,
  ListChecks,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useBulkTasks,
  useDeleteList,
  useLists,
  useSaveList,
  useTasks,
  type Task,
  type TaskList,
} from "@/lib/data";
import { displayStatus, groupTasks, mainTasks, type DisplayStatus } from "@/lib/planner";
import { TaskItem } from "@/components/task-item";
import { TaskDialog } from "@/components/task-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — Ritmo" },
      { name: "description", content: "Todas as suas tarefas." },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | DisplayStatus;
const FILTERS: { v: Filter; l: string }[] = [
  { v: "all", l: "Todas" },
  { v: "pending", l: "Pendentes" },
  { v: "in_progress", l: "Em andamento" },
  { v: "overdue", l: "Atrasadas" },
  { v: "not_done", l: "Não feitas" },
  { v: "done", l: "Concluídas" },
];

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState("");
  const [selectedList, setSelectedList] = useState("all");
  const [listOpen, setListOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [deletingList, setDeletingList] = useState<TaskList | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const { data: lists = [] } = useLists();
  const saveList = useSaveList();
  const deleteList = useDeleteList();
  const bulk = useBulkTasks();
  const primaryTasks = mainTasks(tasks);

  const counts = primaryTasks.reduce<Record<string, number>>((a, t) => {
    const s = displayStatus(t);
    a[s] = (a[s] ?? 0) + 1;
    return a;
  }, {});
  const filtered = primaryTasks
    .filter((t) => selectedList === "all" || t.list_id === selectedList)
    .filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
  const list = filtered.filter((t) =>
    filter === "all"
      ? !["done", "not_done"].includes(displayStatus(t))
      : displayStatus(t) === filter,
  );
  const notDone = filter === "all" ? filtered.filter((t) => displayStatus(t) === "not_done") : [];

  const changeSelection = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const applyBulk = (operation: string, value?: string | null) => {
    if (!selected.size) return;
    bulk.mutate(
      { ids: [...selected], operation, ...(value !== undefined ? { value } : {}) },
      {
        onSuccess: () => {
          setSelected(new Set());
          setSelectionMode(false);
        },
      },
    );
  };
  const renderTasks = (items: Task[]) =>
    groupTasks(tasks, items).map(({ task, subtasks }) => {
      return (
        <TaskItem
          key={task.id}
          task={task}
          subtasks={subtasks}
          selectedIds={selectionMode ? selected : undefined}
          onSelectedChange={
            selectionMode ? (value, checked) => changeSelection(value.id, checked) : undefined
          }
          onEdit={(value) => {
            setEditing(value);
            setOpen(true);
          }}
        />
      );
    });

  return (
    <>
      <PageHeader
        title="Tarefas"
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
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={selectedList === "all" ? "default" : "outline"}
          onClick={() => setSelectedList("all")}
        >
          Todas as listas
        </Button>
        {lists.map((l) => (
          <div key={l.id} className="flex shrink-0 items-center">
            <Button
              size="sm"
              variant={selectedList === l.id ? "default" : "outline"}
              className="rounded-r-none pr-3"
              onClick={() => setSelectedList(l.id)}
            >
              <span className="size-2 rounded-full" style={{ background: l.color }} />
              {l.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant={selectedList === l.id ? "default" : "outline"}
                  className="-ml-px h-8 w-7 rounded-l-none px-0 shadow-none"
                  aria-label={`Ações da lista ${l.name}`}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={() => setDeletingList(l)}
                >
                  <Trash2 /> Excluir lista
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setListOpen(true)}>
          <FolderPlus /> Nova lista
        </Button>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex-wrap h-auto">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.v} value={f.v}>
                {f.l}
                {f.v !== "all" && counts[f.v] ? (
                  <span className="ml-1.5 text-xs opacity-60">{counts[f.v]}</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-56"
        />
        <Button
          variant={selectionMode ? "secondary" : "outline"}
          onClick={() => {
            setSelectionMode((active) => !active);
            setSelected(new Set());
          }}
        >
          {selectionMode ? <X /> : <ListChecks />}
          {selectionMode ? "Cancelar seleção" : "Selecionar"}
        </Button>
      </div>
      {selected.size > 0 && (
        <div className="sticky top-3 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-card/95 p-3 shadow-lg backdrop-blur">
          <span className="mr-1 text-sm font-semibold">{selected.size} selecionada(s)</span>
          <Select onValueChange={(value) => applyBulk("status", value)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Mudar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="done">Concluída</SelectItem>
              <SelectItem value="not_done">Não Feita</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => applyBulk("priority", value)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="Novo prazo"
            value={bulkDate}
            onChange={(event) => setBulkDate(event.target.value)}
            className="h-9 w-40"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!bulkDate || bulk.isPending}
            onClick={() => applyBulk("due_date", bulkDate)}
          >
            <CalendarClock /> Aplicar prazo
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulk.isPending}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 /> Excluir
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            aria-label="Limpar seleção"
            onClick={() => setSelected(new Set())}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {isLoading ? null : list.length ? renderTasks(list) : <Empty>Nenhuma tarefa aqui.</Empty>}
      </div>
      {notDone.length > 0 && (
        <section className="mt-8 rounded-2xl border border-orange-500/20 bg-orange-500/[0.03] p-4">
          <div className="mb-3">
            <h2 className="font-display text-lg font-semibold">Não Feitas</h2>
            <p className="text-sm text-muted-foreground">
              Tarefas encerradas sem conclusão, preservadas para revisão e planejamento.
            </p>
          </div>
          <div className="space-y-2">{renderTasks(notDone)}</div>
        </section>
      )}
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} />
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover {selected.size} tarefa(s) para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              As tarefas selecionadas e suas subtarefas poderão ser restauradas durante 30 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulk.isPending}
              onClick={() => applyBulk("delete")}
            >
              <Trash2 /> Mover para a lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(deletingList)}
        onOpenChange={(isOpen) => !isOpen && setDeletingList(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista “{deletingList?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A lista será excluída, mas suas tarefas serão preservadas e ficarão disponíveis em
              “Todas as listas”. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteList.isPending}
              onClick={() => {
                if (!deletingList) return;
                deleteList.mutate(deletingList.id);
                if (selectedList === deletingList.id) setSelectedList("all");
                setDeletingList(null);
              }}
            >
              <Trash2 /> Excluir lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova lista</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveList.mutate(
                { name: listName },
                {
                  onSuccess: () => {
                    setListName("");
                    setListOpen(false);
                  },
                },
              );
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                autoFocus
                required
                maxLength={60}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setListOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar lista</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
