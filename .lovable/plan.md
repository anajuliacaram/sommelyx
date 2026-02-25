

# Refinamento de Legibilidade, Contraste e Hierarquia Visual

## Diagnóstico

O design atual sofre de contraste insuficiente entre camadas. Os valores CSS mostram:
- `--background: 340 20% 7%` (lightness 7%)
- `--card: 340 16% 10%` (lightness 10%) — apenas 3% de diferença
- `--muted-foreground: 340 6% 48%` — texto secundário com apenas 48% lightness sobre fundo 7%, resultando em baixa legibilidade
- `--border: 340 10% 15%` — bordas quase invisíveis
- Botões com gradient wine (32-42% lightness) ficam "afundados" no fundo escuro

## Alterações Planejadas

### 1. CSS Variables (`src/index.css`) — Sistema de Cores

Ajustar lightness para criar camadas distintas:

| Token | Atual | Novo | Motivo |
|-------|-------|------|--------|
| `--background` | 7% | 5% | Base mais escura para separar camadas |
| `--card` | 10% | 12% | Cards mais distintos do fundo |
| `--muted` | 13% | 16% | Superfícies secundárias mais visíveis |
| `--muted-foreground` | 48% | 58% | Texto secundário mais legível |
| `--secondary-foreground` | 78% | 82% | Texto auxiliar mais claro |
| `--foreground` | 90% | 93% | Headlines com mais contraste |
| `--border` | 15% | 18% | Bordas hairline mais perceptíveis |
| `--sidebar-foreground` | 75% | 78% | Sidebar mais legível |

Botões: ajustar `--primary` de 42% para 46% lightness para CTAs mais luminosos.

### 2. CSS Utilities (`src/index.css`) — Superfícies

- `.card-depth`: aumentar lightness do gradiente (de 12%→14% e 9%→11%), border opacity de 30→40%
- `.glass`: lightness de 11%/9% para 13%/11%
- `.surface-elevated`: lightness de 13%/10% para 15%/12%
- `.gradient-wine`: lightness de 32-42% para 35-46% (CTAs mais luminosos)
- Body `line-height`: de 1.6 para 1.7 para melhor legibilidade em dark

### 3. Landing Page (`src/pages/Landing.tsx`)

- Subtítulo: de `text-muted-foreground` para `text-secondary-foreground` com `leading-[1.8]`
- Parágrafo hero: adicionar `leading-[1.8]`
- Stats bar: `bg-card/20` → `bg-card/40` para mais presença
- Stat values: manter `text-foreground`, stat labels: `text-muted-foreground` (agora mais legível com novo valor)
- Feature cards: adicionar `p-7` (de `p-6`) e description `leading-[1.7]`
- Pricing description text: garantir contraste adequado
- Reduzir opacidade do overlay escuro da hero: `gradient-wine-deep` com center radial mais luminoso

### 4. Dashboards (`PersonalDashboard.tsx`, `CommercialDashboard.tsx`)

- Cards de métricas: `p-4` → `p-5`, valores com `text-xl` (de `text-lg`)
- Labels de métricas: `text-[10px]` → `text-[11px]` para legibilidade
- Subtítulos: de `text-muted-foreground` (novo valor mais claro)
- Gap entre cards: `gap-2.5` → `gap-3`
- Container máximo: `max-w-6xl` permanece

### 5. Sidebar & Dashboard Layout (`AppSidebar.tsx`, `DashboardLayout.tsx`)

- Sidebar email: `text-sidebar-foreground/40` → `text-sidebar-foreground/55`
- Menu items: `text-sidebar-foreground/60` → `text-sidebar-foreground/70`
- Header do dashboard: `bg-background/80` → `bg-card/60` para criar camada visual
- Content padding: manter responsivo atual

### 6. Botão (`button.tsx`)

- Default variant shadow: aumentar lightness do inner glow de 55% para 60%
- Garantir que `gradient-wine` atualizado (mais luminoso) se aplique automaticamente via classes utilitárias

## Arquivos Modificados

1. `src/index.css` — variáveis de cor, superfícies, tipografia base
2. `src/pages/Landing.tsx` — contraste de texto, espaçamento, hero overlay
3. `src/pages/dashboard/PersonalDashboard.tsx` — padding, tamanhos de texto
4. `src/pages/dashboard/CommercialDashboard.tsx` — mesmos ajustes
5. `src/components/AppSidebar.tsx` — opacidades de texto
6. `src/layouts/DashboardLayout.tsx` — header background
7. `src/components/ui/button.tsx` — shadow adjustments

## Resultado

Dark mode premium com camadas visuais claras, texto confortável de ler, e cards/botões com presença adequada — sem perder a atmosfera escura e sofisticada.

