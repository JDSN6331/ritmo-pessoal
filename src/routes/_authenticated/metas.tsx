import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  useChangeGoalProgress,
  useChangeGoalTargetProgress,
  useDeleteGoal,
  useGoals,
  useSaveGoal,
  type Goal,
  type GoalStepDraft,
} from "@/lib/data";
import { goalOverallProgress, goalProgress } from "@/lib/planner";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MetricType = Goal["metric_type"];

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Ritmo" },
      { name: "description", content: "Acompanhe o progresso das suas metas." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals = [] } = useGoals();
  const del = useDeleteGoal();
  const changeProgress = useChangeGoalProgress();
  const changeTargetProgress = useChangeGoalTargetProgress();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const bump = (g: Goal, delta: -1 | 1) => changeProgress.mutate({ id: g.id, delta });

  return (
    <>
      <PageHeader
        title="Metas"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Nova meta
          </Button>
        }
      />
      {goals.length === 0 && <Empty>Defina uma meta e acompanhe seu avanço.</Empty>}
      <div className="columns-1 gap-4 md:columns-2">
        {goals.map((g) => {
          const current = Number(g.current_value);
          const total = Number(g.target_value);
          const booleanMetric = g.metric_type === "boolean";
          const p = goalOverallProgress(current, total, g.metric_type, g.steps);
          const completed = booleanMetric ? current >= 1 : p === 100;
          const left = g.deadline
            ? differenceInCalendarDays(parseISO(g.deadline), new Date())
            : null;
          return (
            <div
              key={g.id}
              className={cn(
                "mb-4 inline-block w-full break-inside-avoid rounded-2xl border bg-card p-5 align-top",
                completed && "border-primary/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-semibold">
                    {completed && <Trophy className="size-4 text-primary" />}
                    {g.title}
                  </h3>
                  {g.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                  )}
                </div>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar meta"
                    onClick={() => {
                      setEditing(g);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir meta"
                    onClick={() => del.mutate(g.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {booleanMetric ? "Status" : "Atual / total"}
                  </p>
                  {booleanMetric ? (
                    <p className="mt-0.5 flex items-center gap-2 font-display text-xl font-bold">
                      {current >= 1 ? (
                        <CheckCircle2 className="size-5 text-primary" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                      <span className={current >= 1 ? "text-primary" : "text-muted-foreground"}>
                        {current >= 1 ? "Feito" : "Não feito"}
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="mt-0.5 font-display text-2xl font-bold">
                        <span className="text-primary">{current}</span>
                        <span className="text-muted-foreground"> / {total}</span>
                      </p>
                      {g.unit && g.unit !== "%" && (
                        <p className="text-xs text-muted-foreground">Unidade: {g.unit}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Percentual</p>
                  <p className="mt-0.5 font-display text-2xl font-bold text-primary">{p}%</p>
                </div>
              </div>
              <Progress value={p} className="mt-3 h-2" />
              {g.steps.length > 0 && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Target className="size-4" /> Alvos da meta
                  </p>
                  {g.steps.map((step) => {
                    const targetCurrent = Number(step.current_value);
                    const booleanTarget = step.metric_type === "boolean";
                    const targetProgress = booleanTarget
                      ? targetCurrent >= 1
                        ? 100
                        : 0
                      : goalProgress(targetCurrent, Number(step.target_value));
                    return (
                      <div key={step.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm [overflow-wrap:anywhere]">
                              {step.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {booleanTarget
                                ? targetCurrent >= 1
                                  ? "Feito"
                                  : "Não feito"
                                : `${targetCurrent} / ${Number(step.target_value)}`}
                              <span className="ml-2 text-primary">{targetProgress}%</span>
                            </p>
                            {!booleanTarget && step.unit && step.unit !== "%" && (
                              <p className="text-xs text-muted-foreground">Unidade: {step.unit}</p>
                            )}
                          </div>
                          {booleanTarget ? (
                            <Button
                              size="sm"
                              variant={targetCurrent >= 1 ? "secondary" : "default"}
                              onClick={() =>
                                changeTargetProgress.mutate({
                                  id: step.id,
                                  delta: targetCurrent >= 1 ? -1 : 1,
                                })
                              }
                            >
                              {targetCurrent >= 1 ? <RotateCcw /> : <CheckCircle2 />}
                              {targetCurrent >= 1 ? "Desfazer" : "Marcar feito"}
                            </Button>
                          ) : (
                            <div className="flex shrink-0 gap-1">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="size-8"
                                aria-label={`Diminuir ${step.title}`}
                                onClick={() =>
                                  changeTargetProgress.mutate({ id: step.id, delta: -1 })
                                }
                              >
                                <Minus />
                              </Button>
                              <Button
                                size="icon"
                                className="size-8"
                                aria-label={`Aumentar ${step.title}`}
                                onClick={() =>
                                  changeTargetProgress.mutate({ id: step.id, delta: 1 })
                                }
                              >
                                <Plus />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Progress value={targetProgress} className="mt-2 h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs",
                    left !== null && left < 0 && !completed
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {g.deadline
                    ? left! < 0 && !completed
                      ? `Prazo vencido em ${format(parseISO(g.deadline), "d MMM", { locale: ptBR })}`
                      : `Prazo: ${format(parseISO(g.deadline), "d MMM yyyy", { locale: ptBR })}`
                    : "Sem prazo"}
                </span>
                {booleanMetric ? (
                  <Button
                    size="sm"
                    variant={current >= 1 ? "secondary" : "default"}
                    onClick={() => bump(g, current >= 1 ? -1 : 1)}
                  >
                    {current >= 1 ? <RotateCcw /> : <CheckCircle2 />}
                    {current >= 1 ? "Desfazer" : "Marcar feito"}
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      aria-label="Diminuir progresso em 1"
                      onClick={() => bump(g, -1)}
                    >
                      <Minus />
                    </Button>
                    <Button
                      size="icon"
                      aria-label="Aumentar progresso em 1"
                      onClick={() => bump(g, 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <GoalDialog open={open} onOpenChange={setOpen} goal={editing} />
    </>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: Goal | null;
}) {
  const save = useSaveGoal();
  const [f, setF] = useState<{
    title: string;
    description: string;
    target_value: string;
    current_value: string;
    unit: string;
    metric_type: MetricType;
    deadline: string;
    steps: GoalStepDraft[];
  }>({
    title: "",
    description: "",
    target_value: "100",
    current_value: "0",
    unit: "",
    metric_type: "numeric",
    deadline: "",
    steps: [],
  });
  useEffect(() => {
    if (open)
      setF({
        title: goal?.title ?? "",
        description: goal?.description ?? "",
        target_value: String(goal?.target_value ?? 100),
        current_value: String(goal?.current_value ?? 0),
        unit: goal?.unit ?? "",
        metric_type: goal?.metric_type ?? "numeric",
        deadline: goal?.deadline ?? "",
        steps:
          goal?.steps.map((step) => ({
            id: step.id,
            title: step.title,
            target_value: Number(step.target_value),
            current_value: Number(step.current_value),
            unit: step.unit,
            metric_type: step.metric_type ?? "numeric",
          })) ?? [],
      });
  }, [open, goal]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        ...(goal ? { id: goal.id } : {}),
        title: f.title.trim(),
        description: f.description || null,
        target_value: Number(f.target_value) || 1,
        current_value: Number(f.current_value) || 0,
        unit: f.unit,
        metric_type: f.metric_type,
        deadline: f.deadline || null,
        steps: f.steps
          .filter((step) => step.title.trim())
          .map((step) => ({ ...step, title: step.title.trim() })),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-t">Meta</Label>
            <Input
              id="g-t"
              autoFocus
              required
              placeholder="Ex.: Ler 24 livros"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-d">Descrição</Label>
            <Textarea
              id="g-d"
              rows={2}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de métrica</Label>
            <Select
              value={f.metric_type}
              onValueChange={(value) => {
                const metricType = value as MetricType;
                setF({
                  ...f,
                  metric_type: metricType,
                  ...(metricType === "boolean"
                    ? { target_value: "1", current_value: "0", unit: "" }
                    : {}),
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Valor numérico</SelectItem>
                <SelectItem value="boolean">Feito ou não feito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.metric_type === "numeric" ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-c">Atual</Label>
                <Input
                  id="g-c"
                  type="number"
                  min={0}
                  step="any"
                  value={f.current_value}
                  onChange={(e) => setF({ ...f, current_value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-a">Total</Label>
                <Input
                  id="g-a"
                  type="number"
                  min={1}
                  step="any"
                  value={f.target_value}
                  onChange={(e) => setF({ ...f, target_value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-u">Unidade (opcional)</Label>
                <Input
                  id="g-u"
                  placeholder="Ex.: livros"
                  value={f.unit}
                  onChange={(e) => setF({ ...f, unit: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Situação atual</Label>
              <Select
                value={Number(f.current_value) >= 1 ? "done" : "pending"}
                onValueChange={(value) =>
                  setF({ ...f, current_value: value === "done" ? "1" : "0" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Não feito</SelectItem>
                  <SelectItem value="done">Feito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="g-dl">Prazo</Label>
            <Input
              id="g-dl"
              type="date"
              value={f.deadline}
              onChange={(e) => setF({ ...f, deadline: e.target.value })}
            />
          </div>
          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Alvos da meta</Label>
                <p className="text-xs text-muted-foreground">
                  Opcional. Cada alvo possui sua própria métrica de atingimento.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setF({
                    ...f,
                    steps: [
                      ...f.steps,
                      {
                        title: "",
                        current_value: 0,
                        target_value: 1,
                        unit: "",
                        metric_type: "numeric",
                      },
                    ],
                  })
                }
              >
                <Plus /> Adicionar
              </Button>
            </div>
            {f.steps.length > 0 && (
              <div className="mt-3 space-y-2">
                {f.steps.map((step, index) => (
                  <div key={step.id ?? `new-${index}`} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Alvo {index + 1}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Excluir alvo ${index + 1}`}
                        onClick={() =>
                          setF({
                            ...f,
                            steps: f.steps.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Input
                      aria-label={`Nome do alvo ${index + 1}`}
                      maxLength={300}
                      placeholder="Ex.: Ler livros de finanças"
                      value={step.title}
                      onChange={(event) =>
                        setF({
                          ...f,
                          steps: f.steps.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <div className="mt-2 space-y-1">
                      <Label>Tipo de métrica</Label>
                      <Select
                        value={step.metric_type}
                        onValueChange={(value) =>
                          setF({
                            ...f,
                            steps: f.steps.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    metric_type: value as MetricType,
                                    ...(value === "boolean"
                                      ? { current_value: 0, target_value: 1, unit: "" }
                                      : {}),
                                  }
                                : item,
                            ),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="numeric">Valor numérico</SelectItem>
                          <SelectItem value="boolean">Feito ou não feito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {step.metric_type === "numeric" ? (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`target-current-${index}`}>Atual</Label>
                          <Input
                            id={`target-current-${index}`}
                            type="number"
                            min={0}
                            step="any"
                            value={step.current_value}
                            onChange={(event) =>
                              setF({
                                ...f,
                                steps: f.steps.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, current_value: Number(event.target.value) }
                                    : item,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`target-total-${index}`}>Total</Label>
                          <Input
                            id={`target-total-${index}`}
                            type="number"
                            min={1}
                            step="any"
                            required
                            value={step.target_value}
                            onChange={(event) =>
                              setF({
                                ...f,
                                steps: f.steps.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, target_value: Number(event.target.value) }
                                    : item,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`target-unit-${index}`}>Unidade (opcional)</Label>
                          <Input
                            id={`target-unit-${index}`}
                            placeholder="Ex.: livros"
                            value={step.unit}
                            onChange={(event) =>
                              setF({
                                ...f,
                                steps: f.steps.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, unit: event.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1">
                        <Label>Situação atual</Label>
                        <Select
                          value={step.current_value >= 1 ? "done" : "pending"}
                          onValueChange={(value) =>
                            setF({
                              ...f,
                              steps: f.steps.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, current_value: value === "done" ? 1 : 0 }
                                  : item,
                              ),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Não feito</SelectItem>
                            <SelectItem value="done">Feito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
