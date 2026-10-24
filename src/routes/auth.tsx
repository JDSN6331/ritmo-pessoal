import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Ritmo" },
      { name: "description", content: "Entre ou crie sua conta no Ritmo." },
      { property: "og:title", content: "Entrar — Ritmo" },
      { property: "og:description", content: "Entre ou crie sua conta no Ritmo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hoje", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/hoje", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha inválidos");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin + "/hoje" },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Confira seu e-mail para confirmar a conta.");
    }
    setLoading(false);
  };

  const oauth = async (provider: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-glow px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 block text-center font-display text-2xl font-bold">ritmo<span className="text-primary">.</span></Link>
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-semibold">{mode === "in" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
          <div className="mt-5 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continuar com Google</Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "in" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button className="font-medium text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
