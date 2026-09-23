# Ofício OS — Gestão de Costura e Terceirizados

Sistema completo para gestão de ordens de serviço com costureiras e facções terceirizadas.

## Funcionalidades

- **Multi-tenant** por empresa
- **Gestão de costureiras** com métricas de produção e pagamentos
- **Catálogo de produtos** com preços unitários
- **Ordens de Serviço** com máquina de estados completa
- **Aceite digital** via link público (WhatsApp) ou painel autenticado
- **Apontamento de produção** pela costureira
- **Entregas parciais** com conferência pelo administrador
- **Módulo financeiro** com baixa de pagamentos
- **Dashboard** com KPIs e gráficos
- **Auditoria** de todas as ações

## Tecnologias

- **Backend:** Node.js, Express, Prisma, PostgreSQL (Supabase), JWT
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts

## Como executar localmente

### 1. Configurar banco (Supabase)

Veja o guia completo em **[DEPLOY.md](./DEPLOY.md)**.

Resumo:
1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie `DATABASE_URL` e `DIRECT_URL`
3. Crie `server/.env` a partir de `server/.env.example`

### 2. Backend

```bash
cd server
npm install
npx prisma db push
npm run prisma:seed
npm run dev
```

API disponível em `http://localhost:3001`

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

App disponível em `http://localhost:5173`

## Deploy (Vercel + Supabase)

Instruções completas em **[DEPLOY.md](./DEPLOY.md)**.

## Credenciais de demonstração

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Administrador | admin@oficio.com | admin123 |
| Costureira | maria@costura.com | costura123 |

## Link de aceite de teste

Após o seed, a OS #000153 possui um token de aceite:
`http://localhost:5173/aceite/token-teste-aceite-153`
