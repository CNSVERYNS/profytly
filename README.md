# Profytly — Landing Page

Waitlist landing page for Profytly (Shopify profit tracker). Next.js 14 (App Router) + Supabase.

## What it does

Collects early-access emails into a Supabase `waitlist` table. Built to validate demand before building the actual product.

## Setup (about 15 minutes)

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase table

In your Supabase project, go to the SQL Editor and run:

```sql
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'landing',
  created_at timestamptz default now()
);

-- Enable RLS (the API uses the service role key, which bypasses RLS,
-- so no public policies are needed — this keeps the table locked down).
alter table public.waitlist enable row level security;
```

### 3. Add environment variables

Copy `.env.example` to `.env.local` and fill in your values from
Supabase → Project Settings → API:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** key (secret, server-only)

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import the repo in Vercel.
3. Add the two environment variables in Vercel → Project Settings → Environment Variables.
4. Deploy.

## Checking signups

In Supabase → Table Editor → `waitlist`, you'll see every email as it comes in.
Export to CSV anytime to see how many people you've collected.

## The validation goal

Target: **50 emails.** If you hit it, demand is real — build the product.
If you don't, change the message or the problem before writing any product code.
