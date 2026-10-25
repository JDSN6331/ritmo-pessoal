import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type User } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: AdminUser[] }>("admin.users"),
  });
  const action = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload: Record<string, unknown> }) =>
      api(action, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const closePasswordDialog = () => {
    setResetUser(null);
    setNewPassword("");
    setShowPassword(false);
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    action.mutate(
      { action: "admin.password", payload: { id: resetUser.id, password: newPassword } },
      {
        onSuccess: () => {
          toast.success("Senha redefinida");
          closePasswordDialog();
        },
      },
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
                onClick={() => {
                  setResetUser(user);
                  setNewPassword("");
                  setShowPassword(false);
                }}
              >
                <KeyRound />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir usuário"
                disabled={user.id === current.id}
                onClick={() => setDeleteUser(user)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(resetUser)}
        onOpenChange={(open) => {
          if (!open) closePasswordDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitPassword} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Redefinir senha</DialogTitle>
              <DialogDescription>
                Defina uma nova senha para <strong>{resetUser?.email}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="admin-new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePasswordDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={action.isPending}>
                {action.isPending ? "Salvando..." : "Redefinir senha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteUser)} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta <strong>{deleteUser?.email}</strong> e todos os dados associados serão
              excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={action.isPending}
              onClick={() => {
                if (!deleteUser) return;
                action.mutate(
                  { action: "admin.delete", payload: { id: deleteUser.id } },
                  {
                    onSuccess: () => {
                      toast.success("Usuário excluído");
                      setDeleteUser(null);
                    },
                  },
                );
              }}
            >
              Excluir usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
