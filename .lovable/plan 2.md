

# Sommelyx UX Refactor — Best-in-Class SaaS Workflows

## Scope Analysis

This is a comprehensive UX refactor touching database schema, routing, new pages/components, and dashboard redesign. The current app has: auth flow, profile selection, placeholder pages, and two dashboard variants (personal/commercial). No wine data tables exist yet.

Given the scale, I recommend splitting into **3 phases** implemented across multiple messages. This plan covers **Phase 1** (the foundation) which is the largest and most critical.

---

## Phase 1: Database + Onboarding + Dashboard Redesign

### 1. Database Migration — Wine Tables

Create the `wines` table to power real dashboard data and the bottle management flow:

```sql
CREATE TABLE public.wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  producer TEXT,
  country TEXT,
  region TEXT,
  grape TEXT,
  vintage INT,
  style TEXT, -- 'tinto', 'branco', 'rosé', 'espumante', 'sobremesa'
  purchase_price NUMERIC(10,2),
  current_value NUMERIC(10,2),
  quantity INT NOT NULL DEFAULT 1,
  rating NUMERIC(3,1),
  drink_from INT, -- year
  drink_until INT, -- year
  cellar_location TEXT,
  food_pairing TEXT,
  tasting_notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wines" ON public.wines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wines" ON public.wines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wines" ON public.wines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wines" ON public.wines FOR DELETE USING (auth.uid() = user_id);
```

Create the `wine_events` table for bottle flow (opens, sales, exits):

```sql
CREATE TABLE public.wine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'open', 'sale', 'exit', 'add'
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wine_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.wine_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.wine_events FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. Onboarding — Redesign SelectProfile

Replace the current `SelectProfile.tsx` with a **2-step onboarding flow**:

**Step 1 — Welcome + Profile Choice**
- Short headline: "Como você vai usar o Sommelyx?"
- Two large cards side by side (keep existing pattern but with user-centered copy):
  - **Adega Pessoal**: "Organize sua coleção, saiba o que beber e quando."
  - **Operação Comercial**: "Controle estoque, registre vendas, sem planilhas."
- Progress dots at bottom (1 of 2)

**Step 2 — Quick Setup (optional)**
- "Quer importar vinhos?" with skip option
- Or just a confirmation: "Pronto! Sua adega está configurada."
- CTA: "Ir para o Dashboard"
- Progress dots (2 of 2)

The flow stays in the same page component with internal step state. No long forms.

### 3. Dashboard Redesign — PersonalDashboard

Restructure the hierarchy:

```text
┌─────────────────────────────────────────────┐
│ Olá, {name}                                 │
│ Resumo da sua adega                         │
├──────────┬──────────┬──────────┬─────────────┤
│ Garrafas │ Valor    │ Beber    │ Adicionados │
│ 0        │ R$ 0     │ Agora: 0 │ Recente: 0  │
├──────────┴──────────┴──────────┴─────────────┤
│ Ações rápidas                                │
│ [+ Adicionar Vinho] [🍷 Registrar Abertura]  │
│ [📋 Ver Adega]                               │
├──────────────────────────────────────────────┤
│ Beber agora (wines in drink window)          │
│ or Empty state                               │
└──────────────────────────────────────────────┘
```

Key changes:
- Metrics use **user-centered labels**: "Beber Agora" not "Vinhos no Auge", "Últimas Entradas" not "Últimas Adições"
- **Quick Actions row** with 2-3 primary buttons below metrics
- **"Beber Agora" section** showing wines in their drink window (or empty state)
- Empty state CTA: "Adicionar seu primeiro vinho"

### 4. Dashboard Redesign — CommercialDashboard

Similar restructure:

```text
┌──────────────────────────────────────────────┐
│ Olá, {name}                                  │
│ Visão geral do seu negócio                   │
├──────────┬──────────┬───────────┬─────────────┤
│ Faturamento│ Estoque │ Baixo     │ Vendas      │
│ R$ 0      │ 0       │ Estoque: 0│ Hoje: 0     │
├──────────┴──────────┴───────────┴─────────────┤
│ Ações rápidas                                 │
│ [+ Cadastrar Produto] [📉 Registrar Venda]   │
│ [📦 Checar Estoque]                           │
├──────────────────────────────────────────────┤
│ Alertas de estoque baixo                      │
│ or Empty state                                │
└──────────────────────────────────────────────┘
```

### 5. Sidebar — User-Centered Labels

Update `AppSidebar.tsx` menu items:

**Personal menu:**
- Dashboard → Início
- Minha Adega → Meus Vinhos
- Wishlist → Quero Comprar
- Estatísticas → Números

**Commercial menu:**
- Dashboard → Início
- Estoque → Meus Produtos
- Vendas → Registrar Venda
- Cadastros → Cadastros (keep)
- Relatórios → Números

### 6. Add Wine Dialog

Create `src/components/AddWineDialog.tsx` — a Sheet/Dialog for adding wines:

- **Essential fields first** (visible): Nome, Produtor, Quantidade, Safra, Estilo (select)
- **Collapsible "Mais detalhes"** section: País, Região, Uva, Preço, Localização, Notas, Harmonização, Janela de consumo
- Success toast with micro animation: "1 garrafa adicionada!"
- Auto-updates dashboard metrics

### 7. Bottle Management Dialog

Create `src/components/ManageBottleDialog.tsx`:

- Triggered from wine list or dashboard quick action
- Tabs or segmented control: "Adicionar" | "Abrir" | "Registrar Saída"
- Each action updates quantity and creates a `wine_events` record
- Strong success feedback with updated stock count shown inline

### 8. Routes Update

Add new route for wine detail (Phase 2 will build the full page):

```tsx
<Route path="cellar" element={<CellarPage />} />
<Route path="wines/:id" element={<WineDetailPage />} /> // Phase 2
```

Replace `Placeholder` for cellar/inventory with a real `CellarPage` that shows a wine list with:
- Search bar at top
- Sort dropdown (default: drink window priority)
- Filter chips (style, country, price range)
- Wine cards in a responsive grid

---

## Files to Create
1. `src/components/AddWineDialog.tsx` — Add wine sheet with essential/advanced fields
2. `src/components/ManageBottleDialog.tsx` — Unified bottle actions (add/open/exit)
3. `src/pages/dashboard/CellarPage.tsx` — Wine list with search/filter/sort
4. `src/components/QuickActions.tsx` — Reusable quick action buttons row

## Files to Modify
1. `src/pages/SelectProfile.tsx` — 2-step onboarding with progress indicator
2. `src/pages/dashboard/PersonalDashboard.tsx` — New hierarchy, quick actions, drink-now section
3. `src/pages/dashboard/CommercialDashboard.tsx` — New hierarchy, quick actions, low-stock alerts
4. `src/components/AppSidebar.tsx` — User-centered menu labels
5. `src/App.tsx` — New routes for cellar page

## Database Changes
1. Create `wines` table with RLS
2. Create `wine_events` table with RLS

---

## Phase 2 (future message)
- Wine Detail Page (decision-first layout with collapsible sections)
- Global Search with saved filters
- Settings page with backup/notification controls

## Phase 3 (future message)
- Page transitions with AnimatePresence
- Wine import flow
- Advanced filtering and smart defaults

