import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Flame, Repeat, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ritmo — organize tarefas, hábitos e metas" },
      { name: "description", content: "Tarefas com recorrência, hábitos com sequência e metas com progresso. Tudo no seu ritmo." },
      { property: "og:title", content: "Ritmo — tarefas, hábitos e metas" },
      { property: "og:description", content: "Tarefas com recorrência, hábitos com sequência e metas com progresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Repeat, title: "Recorrência", text: "Diária, semanal, mensal ou anual — a próxima ocorrência aparece sozinha." },
  { icon: Flame, title: "Hábitos", text: "Marque o dia e acompanhe sua sequência sem quebrar a corrente." },
  { icon: Target, title: "Metas", text: "Defina um alvo, registre avanços e veja o progresso crescer." },
  { icon: CalendarDays, title: "Calendário", text: "Veja o mês inteiro, com atrasos e entregas destacados." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-bold">ritmo<span className="text-primary">.</span></span>
        <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-28">
        <p className="mb-5 inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">Gestão pessoal, sem ruído</p>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
          Seu dia no <span className="text-primary">ritmo</span> certo.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Tarefas, hábitos e metas em um só painel. Saiba o que está em andamento, o que atrasou e o que já foi feito.
        </p>
        <Button asChild size="lg" className="mt-10 shadow-glow"><Link to="/auth">Começar grátis</Link></Button>
        <div className="mt-24 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
