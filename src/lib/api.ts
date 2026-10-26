import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { nextDueDate, type Recurrence } from "@/lib/planner";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  created_at: string;
};
export type TaskList = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};
export type Task = {
  id: string;
  user_id: string;
  list_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  status: string;
  recurrence: string;
  recurrence_interval: number;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
};
export type Habit = {
  id: string;
  user_id: string;
  title: string;
  frequency: string;
  days_of_week: number[];
  color: string;
  created_at: string;
};
export type HabitLog = {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  created_at: string;
};
export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  created_at: string;
  steps: GoalStep[];
};
export type GoalStep = {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  completed_at: string | null;
  created_at: string;
};

const requestSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});
const emailSchema = z.string().trim().toLowerCase().email();
const sessionCookie = "ritmo_session";
const sessionIdleMs = 30 * 60 * 1000;
const persistentSessionSeconds = 30 * 24 * 60 * 60;
const colors = ["#a3e635", "#38bdf8", "#f59e0b"];
type Payload = Partial<
  Record<
    | "id"
    | "email"
    | "password"
    | "name"
    | "list_id"
    | "parent_id"
    | "title"
    | "description"
    | "due_date"
    | "due_time"
    | "priority"
    | "status"
    | "recurrence"
    | "recurrence_interval"
    | "color"
    | "frequency"
    | "days_of_week"
    | "habit_id"
    | "log_date"
    | "target_value"
    | "current_value"
    | "completed"
    | "unit"
    | "deadline"
    | "ids"
    | "operation"
    | "value"
    | "remember"
    | "subtasks"
    | "steps"
    | "delta",
    unknown
  >
>;

function hashPassword(password: string, salt = crypto.randomUUID()) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function validPassword(password: string, encoded: string) {
  const [salt, digest] = encoded.split(":");
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function currentUser() {
  const { one, run, now } = await import("@/lib/db.server");
  const token = getCookie(sessionCookie);
  if (!token) return undefined;
  const user = await one<User>(
    `SELECT u.id, u.email, u.name, u.role, u.created_at FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?`,
    [token, now()],
  );
  if (!user) {
    await run("DELETE FROM sessions WHERE id = ?", [token]);
    deleteCookie(sessionCookie, { path: "/" });
  } else {
    await run("UPDATE sessions SET expires_at = ? WHERE id = ?", [
      new Date(Date.now() + sessionIdleMs).toISOString(),
      token,
    ]);
  }
  return user;
}

async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");
  if (admin && user.role !== "admin") throw new Error("Acesso restrito ao administrador.");
  return user;
}

const text = (value: unknown, max = 500) => z.string().trim().min(1).max(max).parse(value);
const optionalText = (value: unknown, max = 2000) =>
  value ? z.string().trim().max(max).parse(value) : null;
const subtasksSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(80).optional(),
      title: z.string().trim().min(1).max(500),
    }),
  )
  .max(50);
const goalStepsSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(80).optional(),
      title: z.string().trim().min(1).max(300),
      target_value: z.coerce.number().positive(),
      current_value: z.coerce.number().min(0),
      unit: z.string().trim().min(1).max(20),
    }),
  )
  .max(50);

function parseSubtasks(value: unknown) {
  const result = subtasksSchema.optional().safeParse(value);
  if (!result.success)
    throw new Error(
      "Revise as subtarefas: cada nome pode ter até 500 caracteres e são permitidas até 50 subtarefas.",
    );
  return result.data;
}

export const appApi = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const { all, one, run, now, uid } = await import("@/lib/db.server");
    const p = (data.payload ?? {}) as Payload;

    if (data.action === "session") return { user: await currentUser() };
    if (data.action === "register") {
      const email = emailSchema.parse(p.email);
      const password = z.string().min(6).max(128).parse(p.password);
      const name = text(p.name || email.split("@")[0], 80);
      if (await one("SELECT id FROM users WHERE email = ?", [email]))
        throw new Error("Este e-mail já está cadastrado.");
      const id = uid();
      const count = await one<{ total: number }>("SELECT COUNT(*) AS total FROM users");
      await run(
        "INSERT INTO users (id,email,password_hash,name,role,created_at) VALUES (?,?,?,?,?,?)",
        [
          id,
          email,
          hashPassword(password),
          name,
          Number(count?.total ?? 0) === 0 ? "admin" : "user",
          now(),
        ],
      );
      for (const [index, listName] of ["Pessoal", "Rotina", "Trabalho"].entries())
        await run("INSERT INTO task_lists (id,user_id,name,color,created_at) VALUES (?,?,?,?,?)", [
          uid(),
          id,
          listName,
          colors[index]!,
          now(),
        ]);
      const token = uid();
      await run("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)", [
        token,
        id,
        new Date(Date.now() + sessionIdleMs).toISOString(),
      ]);
      setCookie(sessionCookie, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env["NODE_ENV"] === "production",
      });
      return { user: await currentUser() };
    }
    if (data.action === "login") {
      const email = emailSchema.parse(p.email);
      const password = z.string().min(1).max(128).parse(p.password);
      const record = await one<User & { password_hash: string }>(
        "SELECT * FROM users WHERE email = ?",
        [email],
      );
      if (!record || !validPassword(password, record.password_hash))
        throw new Error("E-mail ou senha inválidos.");
      const remember = z.boolean().parse(p.remember ?? false);
      const token = uid();
      await run("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)", [
        token,
        record.id,
        new Date(Date.now() + sessionIdleMs).toISOString(),
      ]);
      setCookie(sessionCookie, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env["NODE_ENV"] === "production",
        ...(remember ? { maxAge: persistentSessionSeconds } : {}),
      });
      return { user: await currentUser() };
    }
    if (data.action === "logout") {
      const token = getCookie(sessionCookie);
      if (token) await run("DELETE FROM sessions WHERE id = ?", [token]);
      deleteCookie(sessionCookie, { path: "/" });
      return { ok: true };
    }
    if (data.action === "session.touch") return { user: await requireUser() };

    const user = await requireUser(data.action.startsWith("admin."));
    const createNextOccurrence = async (task: Task, dueDate: string) => {
      const nextId = uid();
      const createdAt = now();
      await run(
        "INSERT INTO tasks (id,user_id,list_id,parent_id,title,description,due_date,due_time,priority,status,recurrence,recurrence_interval,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          nextId,
          user.id,
          task.list_id,
          null,
          task.title,
          task.description,
          dueDate,
          task.due_time,
          task.priority,
          "pending",
          task.recurrence,
          task.recurrence_interval,
          null,
          createdAt,
        ],
      );
      const subtasks = await all<Task>(
        "SELECT * FROM tasks WHERE parent_id=? AND user_id=? AND deleted_at IS NULL ORDER BY created_at",
        [task.id, user.id],
      );
      for (const subtask of subtasks)
        await run(
          "INSERT INTO tasks (id,user_id,list_id,parent_id,title,description,due_date,due_time,priority,status,recurrence,recurrence_interval,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            uid(),
            user.id,
            task.list_id,
            nextId,
            subtask.title,
            null,
            dueDate,
            task.due_time,
            task.priority,
            "pending",
            "none",
            1,
            null,
            createdAt,
          ],
        );
      return nextId;
    };
    if (data.action === "dashboard") {
      const trashCutoff = new Date(Date.now() - 30 * 864e5).toISOString();
      await run(
        "DELETE FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at < ?",
        [user.id, trashCutoff],
      );
      const [tasks, trash, habits, goals, goalSteps, lists] = await Promise.all([
        all<Task>(
          "SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY due_date, created_at",
          [user.id],
        ),
        all<Task>(
          "SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
          [user.id],
        ),
        all<Habit & { days_of_week: string }>(
          "SELECT * FROM habits WHERE user_id = ? ORDER BY created_at",
          [user.id],
        ),
        all<Goal>("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at", [user.id]),
        all<GoalStep>("SELECT * FROM goal_steps WHERE user_id = ? ORDER BY created_at", [user.id]),
        all<TaskList>("SELECT * FROM task_lists WHERE user_id = ? ORDER BY created_at", [user.id]),
      ]);
      const logs = await all<HabitLog>("SELECT * FROM habit_logs WHERE user_id = ?", [user.id]);
      return {
        user,
        tasks,
        trash,
        habits: habits.map((h) => ({
          ...h,
          days_of_week: JSON.parse(String(h.days_of_week)) as number[],
        })),
        goals: goals.map((goal) => ({
          ...goal,
          steps: goalSteps.filter((step) => step.goal_id === goal.id),
        })),
        lists,
        logs,
      };
    }
    if (data.action === "task.save") {
      const id = p.id ? text(p.id, 80) : uid();
      const parentId = p.parent_id ? text(p.parent_id, 80) : null;
      const subtasks = parentId ? undefined : parseSubtasks(p.subtasks);
      if (parentId) {
        if (parentId === id) throw new Error("Uma tarefa não pode ser subtarefa dela mesma.");
        const parent = await one<Task>(
          "SELECT * FROM tasks WHERE id=? AND user_id=? AND deleted_at IS NULL",
          [parentId, user.id],
        );
        if (!parent) throw new Error("Tarefa principal não encontrada.");
        if (parent.parent_id)
          throw new Error("Subtarefas só podem ser vinculadas a uma tarefa principal.");
        if (p.id) {
          await run("UPDATE tasks SET title=? WHERE id=? AND parent_id=? AND user_id=?", [
            text(p.title, 500),
            id,
            parentId,
            user.id,
          ]);
          return { ok: true, id };
        }
        await run(
          "INSERT INTO tasks (id,user_id,list_id,parent_id,title,description,due_date,due_time,priority,status,recurrence,recurrence_interval,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            id,
            user.id,
            parent.list_id,
            parentId,
            text(p.title, 500),
            null,
            parent.due_date,
            parent.due_time,
            parent.priority,
            "pending",
            "none",
            1,
            null,
            now(),
          ],
        );
        return { ok: true, id };
      }
      const values = [
        p.list_id ? text(p.list_id, 80) : null,
        parentId,
        text(p.title, 200),
        optionalText(p.description),
        p.due_date ? text(p.due_date, 10) : null,
        p.due_time ? text(p.due_time, 5) : null,
        text(p.priority || "medium", 20),
        text(p.status || "pending", 20),
        text(p.recurrence || "none", 20),
        Math.max(1, Number(p.recurrence_interval) || 1),
      ];
      if (p.id)
        await run(
          "UPDATE tasks SET list_id=?,parent_id=?,title=?,description=?,due_date=?,due_time=?,priority=?,status=?,recurrence=?,recurrence_interval=? WHERE id=? AND user_id=?",
          [...values, id, user.id],
        );
      else
        await run(
          "INSERT INTO tasks (id,user_id,list_id,parent_id,title,description,due_date,due_time,priority,status,recurrence,recurrence_interval,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [id, user.id, ...values, p.status === "done" ? now() : null, now()],
        );
      if (subtasks) {
        const existing = await all<{ id: string }>(
          "SELECT id FROM tasks WHERE parent_id=? AND user_id=? AND deleted_at IS NULL",
          [id, user.id],
        );
        const existingIds = new Set(existing.map((item) => item.id));
        const keptIds = new Set<string>();
        for (const subtask of subtasks) {
          if (subtask.id && existingIds.has(subtask.id)) {
            keptIds.add(subtask.id);
            await run("UPDATE tasks SET title=? WHERE id=? AND parent_id=? AND user_id=?", [
              subtask.title,
              subtask.id,
              id,
              user.id,
            ]);
          } else {
            await run(
              "INSERT INTO tasks (id,user_id,list_id,parent_id,title,description,due_date,due_time,priority,status,recurrence,recurrence_interval,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
              [
                uid(),
                user.id,
                values[0] ?? null,
                id,
                subtask.title,
                null,
                values[4] ?? null,
                values[5] ?? null,
                values[6] ?? "medium",
                "pending",
                "none",
                1,
                null,
                now(),
              ],
            );
          }
        }
        const removedIds = [...existingIds].filter((subtaskId) => !keptIds.has(subtaskId));
        if (removedIds.length) {
          const placeholders = removedIds.map(() => "?").join(",");
          await run(
            `UPDATE tasks SET deleted_at=? WHERE user_id=? AND parent_id=? AND id IN (${placeholders})`,
            [now(), user.id, id, ...removedIds],
          );
        }
      }
      return { ok: true, id };
    }
    if (data.action === "task.status") {
      const id = text(p.id, 80);
      const status = z.enum(["pending", "in_progress", "done", "not_done"]).parse(p.status);
      const task = await one<Task>(
        "SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        [id, user.id],
      );
      if (!task) throw new Error("Tarefa não encontrada.");
      await run("UPDATE tasks SET status=?,completed_at=? WHERE id=? AND user_id=?", [
        status,
        status === "done" ? now() : null,
        id,
        user.id,
      ]);
      if (
        status === "done" &&
        task.status !== "done" &&
        task.due_date &&
        task.recurrence !== "none"
      ) {
        const due = nextDueDate(
          task.due_date,
          task.recurrence as Recurrence,
          task.recurrence_interval,
        );
        if (due) await createNextOccurrence(task, due);
      }
      return { ok: true };
    }
    if (data.action === "task.delete") {
      const id = text(p.id, 80);
      const deletedAt = now();
      await run(
        "UPDATE tasks SET deleted_at=? WHERE user_id=? AND deleted_at IS NULL AND (id=? OR parent_id=?)",
        [deletedAt, user.id, id, id],
      );
      return { ok: true };
    }
    if (data.action === "task.restore") {
      const id = text(p.id, 80);
      await run(
        "UPDATE tasks SET deleted_at=NULL WHERE user_id=? AND deleted_at IS NOT NULL AND (id=? OR parent_id=?)",
        [user.id, id, id],
      );
      return { ok: true };
    }
    if (data.action === "trash.empty") {
      await run("DELETE FROM tasks WHERE user_id=? AND deleted_at IS NOT NULL", [user.id]);
      return { ok: true };
    }
    if (data.action === "task.bulk") {
      const ids = z.array(z.string().min(1).max(80)).min(1).max(200).parse(p.ids);
      const operation = z.enum(["due_date", "status", "priority", "delete"]).parse(p.operation);
      const placeholders = ids.map(() => "?").join(",");
      const owned = await all<Task>(
        `SELECT * FROM tasks WHERE user_id=? AND deleted_at IS NULL AND id IN (${placeholders})`,
        [user.id, ...ids],
      );
      const safeIds = owned.map((row) => row.id);
      if (!safeIds.length) throw new Error("Nenhuma tarefa válida foi selecionada.");
      if (operation === "delete") {
        const deletedAt = now();
        for (const id of safeIds)
          await run(
            "UPDATE tasks SET deleted_at=? WHERE user_id=? AND deleted_at IS NULL AND (id=? OR parent_id=?)",
            [deletedAt, user.id, id, id],
          );
      } else {
        const selected = safeIds.map(() => "?").join(",");
        if (operation === "due_date") {
          const value = p.value
            ? z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .parse(p.value)
            : null;
          await run(`UPDATE tasks SET due_date=? WHERE user_id=? AND id IN (${selected})`, [
            value,
            user.id,
            ...safeIds,
          ]);
        } else if (operation === "priority") {
          const value = z.enum(["low", "medium", "high"]).parse(p.value);
          await run(`UPDATE tasks SET priority=? WHERE user_id=? AND id IN (${selected})`, [
            value,
            user.id,
            ...safeIds,
          ]);
        } else {
          const value = z.enum(["pending", "in_progress", "done", "not_done"]).parse(p.value);
          await run(
            `UPDATE tasks SET status=?,completed_at=? WHERE user_id=? AND id IN (${selected})`,
            [value, value === "done" ? now() : null, user.id, ...safeIds],
          );
          if (value === "done") {
            for (const task of owned) {
              if (task.status === "done" || !task.due_date || task.recurrence === "none") continue;
              const due = nextDueDate(
                task.due_date,
                task.recurrence as Recurrence,
                task.recurrence_interval,
              );
              if (due) await createNextOccurrence(task, due);
            }
          }
        }
      }
      return { ok: true };
    }
    if (data.action === "list.save") {
      const name = text(p.name, 60);
      const color = text(p.color || "#a3e635", 20);
      if (p.id)
        await run("UPDATE task_lists SET name=?,color=? WHERE id=? AND user_id=?", [
          name,
          color,
          text(p.id, 80),
          user.id,
        ]);
      else
        await run("INSERT INTO task_lists (id,user_id,name,color,created_at) VALUES (?,?,?,?,?)", [
          uid(),
          user.id,
          name,
          color,
          now(),
        ]);
      return { ok: true };
    }
    if (data.action === "list.delete") {
      await run("DELETE FROM task_lists WHERE id=? AND user_id=?", [text(p.id, 80), user.id]);
      return { ok: true };
    }
    if (data.action === "habit.save") {
      const values = [
        text(p.title, 120),
        text(p.frequency || "daily", 20),
        JSON.stringify(z.array(z.number().int().min(0).max(6)).parse(p.days_of_week)),
        text(p.color || "lime", 20),
      ];
      if (p.id)
        await run(
          "UPDATE habits SET title=?,frequency=?,days_of_week=?,color=? WHERE id=? AND user_id=?",
          [...values, text(p.id, 80), user.id],
        );
      else
        await run(
          "INSERT INTO habits (id,user_id,title,frequency,days_of_week,color,created_at) VALUES (?,?,?,?,?,?,?)",
          [uid(), user.id, ...values, now()],
        );
      return { ok: true };
    }
    if (data.action === "habit.delete") {
      await run("DELETE FROM habits WHERE id=? AND user_id=?", [text(p.id, 80), user.id]);
      return { ok: true };
    }
    if (data.action === "habit.toggle") {
      const habitId = text(p.habit_id, 80);
      const date = text(p.log_date, 10);
      const existing = await one(
        "SELECT id FROM habit_logs WHERE habit_id=? AND log_date=? AND user_id=?",
        [habitId, date, user.id],
      );
      if (existing)
        await run("DELETE FROM habit_logs WHERE habit_id=? AND log_date=? AND user_id=?", [
          habitId,
          date,
          user.id,
        ]);
      else
        await run(
          "INSERT INTO habit_logs (id,user_id,habit_id,log_date,created_at) VALUES (?,?,?,?,?)",
          [uid(), user.id, habitId, date, now()],
        );
      return { ok: true };
    }
    if (data.action === "goal.save") {
      const goalId = p.id ? text(p.id, 80) : uid();
      const steps = goalStepsSchema.optional().parse(p.steps);
      const values = [
        text(p.title, 160),
        optionalText(p.description),
        Number(p.target_value) || 1,
        Number(p.current_value) || 0,
        text(p.unit || "%", 20),
        p.deadline ? text(p.deadline, 10) : null,
      ];
      if (p.id)
        await run(
          "UPDATE goals SET title=?,description=?,target_value=?,current_value=?,unit=?,deadline=? WHERE id=? AND user_id=?",
          [...values, goalId, user.id],
        );
      else
        await run(
          "INSERT INTO goals (id,user_id,title,description,target_value,current_value,unit,deadline,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
          [goalId, user.id, ...values, now()],
        );
      if (steps) {
        const existing = await all<GoalStep>(
          "SELECT * FROM goal_steps WHERE goal_id=? AND user_id=?",
          [goalId, user.id],
        );
        const existingIds = new Set(existing.map((step) => step.id));
        const keptIds = new Set<string>();
        for (const step of steps) {
          if (step.id && existingIds.has(step.id)) {
            keptIds.add(step.id);
            await run(
              "UPDATE goal_steps SET title=?,target_value=?,current_value=?,unit=?,completed_at=? WHERE id=? AND goal_id=? AND user_id=?",
              [
                step.title,
                step.target_value,
                Math.min(step.current_value, step.target_value),
                step.unit,
                step.current_value >= step.target_value ? now() : null,
                step.id,
                goalId,
                user.id,
              ],
            );
          } else {
            await run(
              "INSERT INTO goal_steps (id,user_id,goal_id,title,target_value,current_value,unit,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
              [
                uid(),
                user.id,
                goalId,
                step.title,
                step.target_value,
                Math.min(step.current_value, step.target_value),
                step.unit,
                step.current_value >= step.target_value ? now() : null,
                now(),
              ],
            );
          }
        }
        const removed = [...existingIds].filter((id) => !keptIds.has(id));
        for (const id of removed)
          await run("DELETE FROM goal_steps WHERE id=? AND goal_id=? AND user_id=?", [
            id,
            goalId,
            user.id,
          ]);
      }
      return { ok: true, id: goalId };
    }
    if (data.action === "goal.progress") {
      const goalId = text(p.id, 80);
      const delta = z.union([z.literal(-1), z.literal(1)]).parse(p.delta);
      await run(
        "UPDATE goals SET current_value=CASE WHEN current_value + ? < 0 THEN 0 WHEN current_value + ? > target_value THEN target_value ELSE current_value + ? END WHERE id=? AND user_id=?",
        [delta, delta, delta, goalId, user.id],
      );
      return { ok: true };
    }
    if (data.action === "goal.target.progress") {
      const targetId = text(p.id, 80);
      const delta = z.union([z.literal(-1), z.literal(1)]).parse(p.delta);
      await run(
        "UPDATE goal_steps SET current_value=CASE WHEN current_value + ? < 0 THEN 0 WHEN current_value + ? > target_value THEN target_value ELSE current_value + ? END, completed_at=CASE WHEN current_value + ? >= target_value THEN ? ELSE NULL END WHERE id=? AND user_id=? AND goal_id IN (SELECT id FROM goals WHERE user_id=?)",
        [delta, delta, delta, delta, now(), targetId, user.id, user.id],
      );
      return { ok: true };
    }
    if (data.action === "goal.step.status") {
      const stepId = text(p.id, 80);
      const completed = z.boolean().parse(p.completed);
      await run(
        "UPDATE goal_steps SET completed_at=? WHERE id=? AND user_id=? AND goal_id IN (SELECT id FROM goals WHERE user_id=?)",
        [completed ? now() : null, stepId, user.id, user.id],
      );
      return { ok: true };
    }
    if (data.action === "goal.delete") {
      await run("DELETE FROM goals WHERE id=? AND user_id=?", [text(p.id, 80), user.id]);
      return { ok: true };
    }
    if (data.action === "admin.users")
      return {
        users: await all<User & { task_count: number }>(
          "SELECT u.id,u.email,u.name,u.role,u.created_at,COUNT(t.id) AS task_count FROM users u LEFT JOIN tasks t ON t.user_id=u.id AND t.parent_id IS NULL AND t.deleted_at IS NULL GROUP BY u.id,u.email,u.name,u.role,u.created_at ORDER BY u.created_at",
        ),
      };
    if (data.action === "admin.password") {
      await run("UPDATE users SET password_hash=? WHERE id=?", [
        hashPassword(z.string().min(6).max(128).parse(p.password)),
        text(p.id, 80),
      ]);
      return { ok: true };
    }
    if (data.action === "admin.delete") {
      if (text(p.id, 80) === user.id) throw new Error("Você não pode excluir a própria conta.");
      await run("DELETE FROM users WHERE id=?", [text(p.id, 80)]);
      return { ok: true };
    }
    throw new Error("Operação inválida.");
  });

export async function api<T>(action: string, payload?: Record<string, unknown>) {
  return appApi({ data: payload ? { action, payload } : { action } }) as Promise<T>;
}
