import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Flame, ListTodo, LogOut, Sun, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const nav = [
  { to: "/hoje", label: "Hoje", icon: Sun },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/habitos", label: "Hábitos", icon: Flame },
  { to: "/metas", label: "Metas", icon: Target },
] as const;

function AppLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <span className="px-2 py-3 font-display text-xl font-bold">ritmo<span className="text-primary">.</span></span>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground font-medium [&>svg]:text-primary" }}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-3">
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
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-sidebar py-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 px-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
