import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CircleX,
  Flame,
  ListTodo,
  LogOut,
  Settings,
  Sun,
  Target,
  Trash2,
} from "lucide-react";
import { api, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { user } = await api<{ user?: User }>("session");
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AppLayout,
});

const nav = [
  { to: "/hoje", label: "Hoje", icon: Sun },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/nao-feitas", label: "Não Feita", icon: CircleX },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/habitos", label: "Hábitos", icon: Flame },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/analises", label: "Análises", icon: BarChart3 },
  { to: "/lixeira", label: "Lixeira", icon: Trash2 },
] as const;

function AppLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await api("logout");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <span className="px-2 py-3 font-display text-xl font-bold">
          ritmo<span className="text-primary">.</span>
        </span>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-foreground font-medium [&>svg]:text-primary",
              }}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              to="/usuarios"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-foreground font-medium [&>svg]:text-primary",
              }}
            >
              <Settings className="size-4" />
              Configurações
            </Link>
          )}
        </nav>
        <div className="border-t pt-3">
          <p className="truncate px-2 text-sm font-medium">{user.name}</p>
          <p className="truncate px-2 text-xs text-muted-foreground">{user.email}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
            <LogOut /> Sair
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
          <Outlet />
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-start gap-1 overflow-x-auto border-t bg-sidebar px-1 py-2 md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 whitespace-nowrap px-1 text-[11px] leading-none text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
        {user.role === "admin" && (
          <Link
            to="/usuarios"
            className="flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 whitespace-nowrap px-1 text-[11px] leading-none text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Settings className="size-5" />
            Configurações
          </Link>
        )}
      </nav>
    </div>
  );
}
