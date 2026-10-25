import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type User } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

type AdminUser = User & { task_count: number };
export const Route = createFileRoute("/_authenticated/usuarios")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "admin") throw redirect({ to: "/hoje" });
  },
  head: () => ({ meta: [{ title: "Configurações — Ritmo" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { user: current } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: AdminUser[] }>("admin.users"),
  });
  const action = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload: Record<string, unknown> }) =>
      api(action, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = (user: AdminUser) => {
    const password = prompt(`Nova senha para ${user.email} (mínimo 6 caracteres):`);
    if (password && password.length >= 6)
      action.mutate(
        { action: "admin.password", payload: { id: user.id, password } },
        { onSuccess: () => toast.success("Senha redefinida") },
      );
    else if (password) toast.error("A senha precisa ter ao menos 6 caracteres.");
  };
  const remove = (user: AdminUser) => {
    if (confirm(`Excluir definitivamente ${user.email} e todos os dados dessa conta?`))
      action.mutate(
        { action: "admin.delete", payload: { id: user.id } },
        { onSuccess: () => toast.success("Usuário excluído") },
      );
  };
  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Gestão de contas, redefinição de senha e exclusão segura."
      />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="hidden grid-cols-[1fr_130px_130px_100px] gap-4 border-b px-5 py-3 text-xs font-semibold uppercase text-muted-foreground sm:grid">
          <span>Usuário</span>
          <span>Perfil</span>
          <span>Tarefas</span>
          <span>Ações</span>
        </div>
        {data?.users.map((user) => (
          <div
            key={user.id}
            className="grid gap-3 border-b px-5 py-4 last:border-0 sm:grid-cols-[1fr_130px_130px_100px] sm:items-center"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <span className="w-fit rounded-full bg-muted px-2 py-1 text-xs">
              {user.role === "admin" ? "Administrador" : "Usuário"}
            </span>
            <span className="text-sm text-muted-foreground">{Number(user.task_count)} tarefas</span>
            <div className="flex">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Redefinir senha"
                onClick={() => reset(user)}
              >
                <KeyRound />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir usuário"
                disabled={user.id === current.id}
                onClick={() => remove(user)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
