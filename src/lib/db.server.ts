import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

type Params = Array<string | number | null>;
type Row = Record<string, unknown>;

const databaseUrl = process.env["DATABASE_URL"];
const isPostgres = Boolean(databaseUrl);
let initialized: Promise<void> | undefined;
let sqlite: DatabaseSync | undefined;
let pg: ReturnType<typeof postgres> | undefined;

function sqliteDb() {
  if (!sqlite) {
    const path = resolve(process.env["SQLITE_PATH"] || "data/ritmo.sqlite");
    mkdirSync(dirname(path), { recursive: true });
    sqlite = new DatabaseSync(path);
    sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  }
  return sqlite;
}

function pgDb() {
  if (!pg) {
    const sslRequired =
      process.env["DATABASE_SSL"] === "require" || databaseUrl?.includes("sslmode=require");
    pg = postgres(databaseUrl!, sslRequired ? { ssl: "require" } : {});
  }
  return pg;
}

function pgTemplate(sql: string, params: Params) {
  let index = 0;
  const statement = sql.replace(/\?/g, () => `$${++index}`);
  if (index !== params.length) throw new Error("Quantidade de parâmetros inválida");
  return pgDb().unsafe(statement, params);
}

export async function all<T extends Row = Row>(sql: string, params: Params = []): Promise<T[]> {
  await initDb();
  if (isPostgres) return (await pgTemplate(sql, params)) as unknown as T[];
  return sqliteDb()
    .prepare(sql)
    .all(...params) as unknown as T[];
}

export async function one<T extends Row = Row>(
  sql: string,
  params: Params = [],
): Promise<T | undefined> {
  return (await all<T>(sql, params))[0];
}

export async function run(sql: string, params: Params = []) {
  await initDb();
  if (isPostgres) return pgTemplate(sql, params);
  return sqliteDb()
    .prepare(sql)
    .run(...params);
}

export async function initDb() {
  if (initialized) return initialized;
  initialized = (async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS task_lists (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#a3e635', created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, list_id TEXT REFERENCES task_lists(id) ON DELETE SET NULL, parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, due_date TEXT, due_time TEXT, priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'pending', recurrence TEXT NOT NULL DEFAULT 'none', recurrence_interval INTEGER NOT NULL DEFAULT 1, completed_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, frequency TEXT NOT NULL DEFAULT 'daily', days_of_week TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]', color TEXT NOT NULL DEFAULT 'lime', created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS habit_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE, log_date TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(habit_id, log_date))`,
      `CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, target_value REAL NOT NULL DEFAULT 100, current_value REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT '%', deadline TEXT, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS goal_steps (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE, title TEXT NOT NULL, target_value REAL NOT NULL DEFAULT 1, current_value REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT '%', completed_at TEXT, created_at TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_goal_steps_goal ON goal_steps(goal_id)`,
    ];
    if (isPostgres) {
      for (const statement of statements) await pgDb().unsafe(statement);
      await pgDb().unsafe("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TEXT");
      await pgDb().unsafe(
        "ALTER TABLE goal_steps ADD COLUMN IF NOT EXISTS target_value REAL NOT NULL DEFAULT 1",
      );
      await pgDb().unsafe(
        "ALTER TABLE goal_steps ADD COLUMN IF NOT EXISTS current_value REAL NOT NULL DEFAULT 0",
      );
      await pgDb().unsafe(
        "ALTER TABLE goal_steps ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT '%'",
      );
      await pgDb().unsafe(
        "UPDATE goal_steps SET current_value=target_value WHERE completed_at IS NOT NULL AND current_value=0",
      );
    } else {
      for (const statement of statements) sqliteDb().exec(statement);
      const columns = sqliteDb().prepare("PRAGMA table_info(tasks)").all() as Array<{
        name: string;
      }>;
      if (!columns.some((column) => column.name === "deleted_at"))
        sqliteDb().exec("ALTER TABLE tasks ADD COLUMN deleted_at TEXT");
      const goalStepColumns = sqliteDb().prepare("PRAGMA table_info(goal_steps)").all() as Array<{
        name: string;
      }>;
      if (!goalStepColumns.some((column) => column.name === "target_value"))
        sqliteDb().exec("ALTER TABLE goal_steps ADD COLUMN target_value REAL NOT NULL DEFAULT 1");
      if (!goalStepColumns.some((column) => column.name === "current_value"))
        sqliteDb().exec("ALTER TABLE goal_steps ADD COLUMN current_value REAL NOT NULL DEFAULT 0");
      if (!goalStepColumns.some((column) => column.name === "unit"))
        sqliteDb().exec("ALTER TABLE goal_steps ADD COLUMN unit TEXT NOT NULL DEFAULT '%'");
      sqliteDb().exec(
        "UPDATE goal_steps SET current_value=target_value WHERE completed_at IS NOT NULL AND current_value=0",
      );
    }
  })();
  return initialized;
}

export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
