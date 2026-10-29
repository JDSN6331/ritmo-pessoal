import { describe, expect, it } from "vitest";
import {
  goalProgress,
  goalOverallProgress,
  goalProgressWithSteps,
  groupTasks,
  habitStreak,
  isOverdue,
  mainTasks,
  moveItem,
  nextDueDate,
  orderSubtasks,
  subtaskProgress,
} from "@/lib/planner";

describe("recorrência", () => {
  it("diária a cada 2 dias", () =>
    expect(nextDueDate("2026-10-24", "daily", 2)).toBe("2026-10-26"));
  it("semanal", () => expect(nextDueDate("2026-10-24", "weekly")).toBe("2026-10-31"));
  it("mensal no fim do mês", () => expect(nextDueDate("2026-01-31", "monthly")).toBe("2026-02-28"));
  it("anual", () => expect(nextDueDate("2026-10-24", "yearly")).toBe("2027-10-24"));
  it("sem recorrência", () => expect(nextDueDate("2026-10-24", "none")).toBeNull());
});

describe("atraso", () => {
  it("data passada e não concluída é atrasada", () =>
    expect(isOverdue({ due_date: "2026-10-23", status: "pending" }, "2026-10-24")).toBe(true));
  it("concluída nunca é atrasada", () =>
    expect(isOverdue({ due_date: "2026-10-01", status: "done" }, "2026-10-24")).toBe(false));
  it("marcada como não feita deixa de ser tratada como atrasada", () =>
    expect(isOverdue({ due_date: "2026-10-01", status: "not_done" }, "2026-10-24")).toBe(false));
  it("vencendo hoje não é atrasada", () =>
    expect(isOverdue({ due_date: "2026-10-24", status: "in_progress" }, "2026-10-24")).toBe(false));
});

describe("hierarquia de tarefas", () => {
  const parent = { id: "parent", parent_id: null, title: "Principal" };
  const child = { id: "child", parent_id: "parent", title: "Subtarefa" };

  it("mantém uma subtarefa filtrada dentro da tarefa principal", () => {
    expect(groupTasks([parent, child], [child])).toEqual([{ task: parent, subtasks: [child] }]);
  });

  it("inclui as subtarefas quando a tarefa principal está visível", () => {
    expect(groupTasks([parent, child], [parent])).toEqual([{ task: parent, subtasks: [child] }]);
  });

  it("não inclui subtarefas nos indicadores de tarefas", () => {
    expect(mainTasks([parent, child])).toEqual([parent]);
  });

  it("calcula feitas, total e percentual das subtarefas", () => {
    expect(subtaskProgress([{ status: "done" }, { status: "pending" }])).toEqual({
      done: 1,
      total: 2,
      percentage: 50,
    });
  });

  it("ordena subtarefas pela posição salva", () => {
    const second = { id: "second", parent_id: "parent", title: "Segunda", position: 1 };
    const first = { id: "first", parent_id: "parent", title: "Primeira", position: 0 };
    expect(groupTasks([parent, second, first], [parent])[0]?.subtasks).toEqual([first, second]);
  });

  it("mantém subtarefas concluídas no final, respeitando a posição de cada grupo", () => {
    const subtasks = [
      { id: "done-2", status: "done", position: 3 },
      { id: "pending-2", status: "pending", position: 2 },
      { id: "done-1", status: "done", position: 1 },
      { id: "pending-1", status: "in_progress", position: 0 },
    ];

    expect(orderSubtasks(subtasks).map((subtask) => subtask.id)).toEqual([
      "pending-1",
      "pending-2",
      "done-1",
      "done-2",
    ]);
    expect(subtasks.map((subtask) => subtask.id)).toEqual([
      "done-2",
      "pending-2",
      "done-1",
      "pending-1",
    ]);
  });

  it("move um item sem alterar a lista original", () => {
    const items = ["A", "B", "C"];
    expect(moveItem(items, 2, 0)).toEqual(["C", "A", "B"]);
    expect(items).toEqual(["A", "B", "C"]);
  });
});

describe("sequência de hábitos", () => {
  const all = [0, 1, 2, 3, 4, 5, 6];
  const today = new Date(2026, 9, 24);
  it("conta dias seguidos e hoje pendente não quebra", () =>
    expect(habitStreak(all, new Set(["2026-10-23", "2026-10-22"]), today)).toBe(2));
  it("dia perdido quebra", () =>
    expect(habitStreak(all, new Set(["2026-10-24", "2026-10-22"]), today)).toBe(1));
});

it("progresso da meta limitado a 100%", () => {
  expect(goalProgress(30, 120)).toBe(25);
  expect(goalProgress(200, 100)).toBe(100);
});

it("usa as etapas quando a meta possui etapas cadastradas", () => {
  expect(
    goalProgressWithSteps(0, 100, [
      { completed_at: "2026-10-26T12:00:00.000Z" },
      { completed_at: null },
    ]),
  ).toBe(50);
});

describe("progresso agregado dos alvos", () => {
  const targets = [
    { current_value: 1, target_value: 1, metric_type: "boolean" as const },
    { current_value: 1, target_value: 1, metric_type: "boolean" as const },
    { current_value: 0, target_value: 1, metric_type: "boolean" as const },
  ];

  it("calcula os alvos sem concluir automaticamente a meta booleana", () => {
    expect(goalOverallProgress(0, 1, "boolean", targets)).toBe(67);
  });

  it("mantém o progresso próprio de uma meta numérica", () => {
    expect(goalOverallProgress(25, 100, "numeric", targets)).toBe(25);
  });
});
