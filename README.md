# Ritmo Pessoal

Aplicação de produtividade para tarefas, subtarefas, listas, hábitos, metas e análises. Inclui autenticação própria, gestão administrativa de usuários, calendário mensal/semanal/diário e instalação como PWA.

## Desenvolvimento local (SQLite)

Requisitos: Node.js 22.5 ou superior (o projeto usa o módulo SQLite nativo do Node).

```sh
npm install
npm run dev
```

Sem `DATABASE_URL`, o banco é criado automaticamente em `data/ritmo.sqlite`. O primeiro usuário cadastrado recebe o perfil de administrador e as listas **Pessoal**, **Rotina** e **Trabalho**.

## Produção (PostgreSQL)

Defina as variáveis abaixo e gere o build:

```sh
DATABASE_URL=postgresql://usuario:senha@servidor:5432/ritmo
NODE_ENV=production
npm run build
node .output/server/index.mjs
```

As tabelas e índices são inicializados automaticamente. Em produção, use uma conexão PostgreSQL com TLS e mantenha `DATABASE_URL` somente no servidor.

## Validação

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## PWA

O service worker é registrado no build de produção. Em navegadores compatíveis, use “Instalar aplicativo” depois de servir a aplicação via HTTPS (localhost também é aceito para desenvolvimento).

Este projeto permanece compatível com o fluxo do [Lovable](https://lovable.dev); evite reescrever o histórico Git publicado.
