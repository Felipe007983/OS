# Deploy — Vercel + Supabase

Guia passo a passo para subir o **Ofício OS** com:
- **Frontend** → Vercel
- **Backend** → Vercel
- **Banco** → Supabase (PostgreSQL)

---

## Parte 1 — Configurar o Supabase (faça isso primeiro)

### 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Escolha um nome (ex: `oficio-os`)
4. Defina uma **senha forte** para o banco — **anote essa senha**
5. Escolha a região mais próxima (ex: `South America (São Paulo)`)
6. Clique em **Create new project** e aguarde ~2 minutos

### 2. Copiar as URLs de conexão

1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **Database**
3. Role até **Connection string** e selecione **URI**

Você vai precisar de **duas** URLs:

#### URL 1 — `DATABASE_URL` (pooler, para a API na Vercel)

- Modo: **Transaction**
- Porta: **6543**
- Marque **Use connection pooling**
- Copie a URL. Ela deve ficar assim:

```
postgresql://postgres.[PROJECT_REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### URL 2 — `DIRECT_URL` (conexão direta, para criar as tabelas)

- Modo: **Session** ou **Direct connection**
- Porta: **5432**
- Copie a URL. Exemplo:

```
postgresql://postgres.[PROJECT_REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

> **Importante:** substitua `[SENHA]` pela senha que você definiu ao criar o projeto.

### 3. Criar as tabelas no banco (no seu computador)

Abra o terminal na pasta `server` do projeto:

```bash
cd server
```

Crie o arquivo `.env` (copie do `.env.example`):

```bash
copy .env.example .env
```

Edite o `.env` e cole suas URLs do Supabase:

```env
DATABASE_URL="postgresql://postgres.xxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

JWT_SECRET="uma-chave-secreta-longa-e-aleatoria-aqui"
JWT_EXPIRES_IN="7d"
APP_BASE_URL="http://localhost:5173"
```

Depois rode:

```bash
npm install
npx prisma db push
npm run prisma:seed
```

Se tudo der certo, você verá no terminal:
- `🌱 Iniciando seed do banco de dados...`
- `👤 Admin criado: admin@oficio.com`

### 4. Confirmar no Supabase

1. No painel do Supabase, vá em **Table Editor**
2. Você deve ver as tabelas: `companies`, `users`, `service_orders`, etc.
3. Na tabela `users`, deve existir o admin `admin@oficio.com`

---

## Parte 2 — Deploy do Backend na Vercel

### 1. Subir o código no GitHub

Se ainda não fez commit/push:

```bash
git add .
git commit -m "Preparar deploy Vercel + Supabase"
git push
```

### 2. Criar projeto na Vercel (API)

1. Acesse [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Importe o repositório do GitHub
3. Configure:
   - **Project Name:** `oficio-os-api` (ou o nome que preferir)
   - **Root Directory:** `server` ← **muito importante**
   - **Framework Preset:** Other
4. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL do pooler (porta 6543) do Supabase |
| `DIRECT_URL` | URL direta (porta 5432) do Supabase |
| `JWT_SECRET` | Mesma chave que usou no `.env` local |
| `JWT_EXPIRES_IN` | `7d` |
| `APP_BASE_URL` | Deixe em branco por agora (atualiza depois) |
| `NODE_ENV` | `production` |

5. Clique em **Deploy**
6. Quando terminar, copie a URL do projeto (ex: `https://oficio-os-api.vercel.app`)
7. Teste no navegador: `https://oficio-os-api.vercel.app/api/health`
   - Deve retornar: `{"status":"online",...}`

---

## Parte 3 — Deploy do Frontend na Vercel

### 1. Criar segundo projeto na Vercel

1. **Add New** → **Project** (mesmo repositório GitHub)
2. Configure:
   - **Project Name:** `oficio-os` (ou o nome que preferir)
   - **Root Directory:** `client` ← **muito importante**
   - **Framework Preset:** Vite (detecta automaticamente)
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://oficio-os-api.vercel.app/api` (URL do backend + `/api`) |

4. Clique em **Deploy**
5. Copie a URL do frontend (ex: `https://oficio-os.vercel.app`)

### 2. Atualizar `APP_BASE_URL` no backend

Volte no projeto **backend** na Vercel:
1. **Settings** → **Environment Variables**
2. Edite `APP_BASE_URL` para a URL do frontend:
   ```
   https://oficio-os.vercel.app
   ```
3. Vá em **Deployments** → clique nos **...** do último deploy → **Redeploy**

Isso garante que os links de WhatsApp/assinatura apontem para o domínio correto.

---

## Parte 4 — Testar em produção

1. Acesse a URL do frontend
2. Faça login:
   - **Admin:** `admin@oficio.com` / `admin123`
   - **Costureira:** `maria@costura.com` / `costura123`
3. Crie uma OS e teste o fluxo completo

---

## Resumo das URLs

| Serviço | Onde | Exemplo |
|---|---|---|
| Frontend | Vercel (pasta `client`) | `https://oficio-os.vercel.app` |
| Backend | Vercel (pasta `server`) | `https://oficio-os-api.vercel.app` |
| Banco | Supabase | Painel em supabase.com |
| Health check | Backend + `/api/health` | `https://oficio-os-api.vercel.app/api/health` |

---

## Problemas comuns

### Erro de conexão com o banco na Vercel
- Confirme que `DATABASE_URL` usa a porta **6543** com `?pgbouncer=true`
- Confirme que `DIRECT_URL` usa a porta **5432**

### Login não funciona em produção
- Rode o seed: `npm run prisma:seed` (com `.env` apontando para o Supabase)
- Confirme que `VITE_API_URL` no frontend termina com `/api`

### Links de WhatsApp/assinatura errados
- Atualize `APP_BASE_URL` no backend com a URL real do frontend
- Faça redeploy do backend

### Tabelas não existem
- Rode localmente: `cd server && npx prisma db push`

---

## Desenvolvimento local (com Supabase)

```bash
# Terminal 1 — API
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

O frontend local usa proxy (`/api` → `localhost:3001`) automaticamente.
Para testar com Supabase localmente, configure o `.env` na pasta `server`.
