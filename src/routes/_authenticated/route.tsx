import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleX,
  Flame,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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

const inactivityLimitMs = 30 * 60 * 1000;
const sessionRefreshMs = 5 * 60 * 1000;

function AppLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem("ritmo_sidebar") !== "collapsed",
  );
  const lastActivity = useRef(Date.now());
  const lastSessionRefresh = useRef(Date.now());

  const signOut = useCallback(
    async (inactive = false) => {
      setSigningOut(true);
      try {
        await qc.cancelQueries();
        qc.clear();
        await api("logout");
        await navigate({ to: "/auth", replace: true });
        if (inactive) toast.info("Sessão encerrada após 30 minutos de inatividade.");
      } finally {
        setSigningOut(false);
      }
    },
    [navigate, qc],
  );

  useEffect(() => {
    let loggingOut = false;

    const registerActivity = () => {
      const currentTime = Date.now();
      if (currentTime - lastActivity.current >= inactivityLimitMs) {
        if (!loggingOut) {
          loggingOut = true;
          void signOut(true);
        }
        return;
      }
      lastActivity.current = currentTime;
      if (currentTime - lastSessionRefresh.current < sessionRefreshMs) return;
      lastSessionRefresh.current = currentTime;
      void api("session.touch").catch(() => {
        if (loggingOut) return;
        loggingOut = true;
        void signOut();
      });
    };

    const verifyInactivity = () => {
      if (loggingOut || Date.now() - lastActivity.current < inactivityLimitMs) return;
      loggingOut = true;
      void signOut(true);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }));
    window.addEventListener("focus", registerActivity);
    const interval = window.setInterval(verifyInactivity, 30_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, registerActivity));
      window.removeEventListener("focus", registerActivity);
      window.clearInterval(interval);
    };
  }, [signOut]);

  const toggleSidebar = () => {
    setSidebarExpanded((expanded) => {
      const next = !expanded;
      localStorage.setItem("ritmo_sidebar", next ? "expanded" : "collapsed");
      return next;
    });
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width,padding] duration-200 md:flex ${sidebarExpanded ? "w-60 p-4" : "w-16 p-2"}`}
      >
        <div
          className={`flex items-center py-3 ${sidebarExpanded ? "justify-between px-2" : "flex-col gap-3"}`}
        >
          <span className="font-display text-xl font-bold" aria-label="Ritmo">
            {sidebarExpanded ? "ritmo" : "r"}
            <span className="text-primary">.</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={toggleSidebar}
            aria-label={sidebarExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
            title={sidebarExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
          >
            {sidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center rounded-lg py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${sidebarExpanded ? "gap-3 px-3" : "justify-center px-2"}`}
              title={!sidebarExpanded ? n.label : undefined}
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-foreground font-medium [&>svg]:text-primary",
              }}
            >
              <n.icon className="size-4" />
              {sidebarExpanded && n.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              to="/usuarios"
              className={`flex items-center rounded-lg py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent ${sidebarExpanded ? "gap-3 px-3" : "justify-center px-2"}`}
              title={!sidebarExpanded ? "Configurações" : undefined}
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-foreground font-medium [&>svg]:text-primary",
              }}
            >
              <Settings className="size-4" />
              {sidebarExpanded && "Configurações"}
            </Link>
          )}
        </nav>
        <div className="border-t pt-3">
          {sidebarExpanded && (
            <>
              <p className="truncate px-2 text-sm font-medium">{user.name}</p>
              <p className="truncate px-2 text-xs text-muted-foreground">{user.email}</p>
            </>
          )}
          <Button
            variant="ghost"
            size={sidebarExpanded ? "sm" : "icon"}
            className={`mt-2 ${sidebarExpanded ? "w-full justify-start" : "w-full"}`}
            onClick={() => void signOut()}
            title={!sidebarExpanded ? "Sair" : undefined}
            aria-label="Sair da conta"
          >
            <LogOut /> {sidebarExpanded && "Sair"}
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <span className="font-display text-lg font-bold">
            ritmo<span className="text-primary">.</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={signingOut}
            onClick={() => void signOut()}
            aria-label="Sair da conta"
          >
            <LogOut /> {signingOut ? "Saindo..." : "Sair"}
          </Button>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8">
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
