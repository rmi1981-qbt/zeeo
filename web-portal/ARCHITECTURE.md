# Architecture Documentation

## Overview

SaFE is a web application built with a **Serverless** architecture, relying heavily on **Supabase** for backend services (Auth, Database, Realtime, Storage).

## Technology Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS.
- **Backend**: Supabase (PostgreSQL managed service).
- **Authentication**: Supabase Auth (JWT based).
- **Maps**: React Leaflet / Google Maps Platform.

## Separation of Concerns

### 1. Database (PostgreSQL)

*Located in Supabase Dashboard SQL Editor & Migrations*
The "Source of Truth".

- **Tables**: `profiles`, `condominiums`, `condominium_members` (Managed via SQL Migrations).
- **Security**: Row Level Security (RLS) acts as the **API Gateway**. We do not write traditional API endpoints for CRUD. Instead, we define policies (e.g., "Users can only read their own profile") directly on the database tables.
- **Business Logic**: Triggers and Postgres Functions handle data integrity and automated tasks (e.g., creating a profile when a user signs up).

### 2. Backend / API

*Located in `src/lib/supabase.ts` (Client) & Edge Functions (Optional)*

- **Direct Client**: The React frontend talks directly to the database via `@supabase/supabase-js`. This is secure because of RLS.
- **Edge Functions**: (Future) For complex logic that cannot be done in SQL (e.g., sending emails, processing payments, complex algorithms), we use Supabase Edge Functions (Deno/Node.js).

### 3. Frontend (Web Portal)

*Located in `web-portal/src`*
The User Interface.

- **`src/contexts`**: Global state management (Auth, Selected Condo).
- **`src/pages`**: View components (Dashboard, Login, Settings).
- **`src/components`**: Reusable UI blocks (Buttons, Inputs).
- **`src/lib`**: Configuration and helper functions (Supabase client init).

## How it works (Example)

**Scenario**: Listing Condominiums

1. **Frontend** (`CondoSelection.tsx`) calls `supabase.from('condominiums').select('*')`.
2. **Supabase** validates the JWT token of the logged-in user.
3. **Postgres** checks the RLS Policy:
    - If user is `Platform Admin`: `true` (Return all).
    - If user is `Resident`: `id IN (select condominium_id from memberships where user_id = auth.uid())` (Return only theirs).
4. **Data** is returned to Frontend.

## Developer Guidelines

- **Always comment your code**.
- **Do not bypass RLS**. All security logic belongs in the database policies, not just the frontend conditions.
- **Keep components small**. Segregate logic (hooks) from UI (JSX).
