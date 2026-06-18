## Fase 3 — Reimaginação Editorial

Os 3 mockups acima são a **direção mestre travada**. Eles não são "uma página" — são a **gramática visual** que vai ser aplicada em todo o produto. Antes de aprovar, olhe atentamente: é desse mundo que estamos falando.

---

### O que muda na alma do produto

| Hoje | Fase 3 |
|---|---|
| Cards retangulares | Objetos flutuantes com luz própria |
| KPIs em containers | Tipografia editorial gigante + metadados ínfimos |
| Vinho como dado | Vinho como protagonista visual |
| Bordeaux como tinta de UI | Bordeaux como joia (acento raro) |
| Verde escuro como fundo neutro | Verde profundo + vinheta quente + grão de filme = atmosfera de adega |
| Dourado como detalhe | Champagne gold como única cor de ação |
| Alertas vermelho/verde | Recomendações editoriais (estilo Apple TV) |

---

### Pilares visuais (não-negociáveis)

**1. Garrafa-objeto.** Toda garrafa renderizada com luz quente única vinda do canto superior direito, sombra de contato suave, base sobre linha ivory fina (prateleira de vitrine). Nunca em retângulo cinza. Nunca como ícone. 5 arquétipos por tipo de vinho (Tinto/Branco/Rosé/Espumante/Sobremesa) — asset já gerado.

**2. Tipografia editorial.** Libre Baskerville em escalas dramáticas (display 48-72px) para nome do vinho. Metadados em uppercase tracked-out 10-11px ivory 60% (`BORDEAUX · 2015 · GRAND CRU`). Notas do sommelier em itálico serif. Zero negrito SaaS, zero badges coloridos.

**3. Atmosfera.** Fundo `#1A2420` + vinheta radial quente + grão de filme sutil (SVG noise overlay 3% opacidade). Cada surface respira luz, não é uma cor chapada.

**4. Champagne gold como única ação.** `#C8A96A` em outline pill (não fill) para CTAs primários. Bordeaux `#7B1E2B` reservado para momentos preciosos — destaque do dia, sommelier signature. Nada mais vermelho.

**5. Densidade radical reduzida.** Onde hoje cabem 6 cards, vai caber 1 objeto + 3 thumbnails. Espaço negativo é parte do luxo.

**6. Motion deliberado.** Fade-in 600ms `[0.16, 1, 0.3, 1]`, scale 0.98→1 em entrada de garrafa, parallax sutil em scroll do hero. Sem bounce, sem spring exagerado.

---

### Aplicação por superfície

**Home (`DashboardIndex` / `PersonalDashboard` / `CommercialDashboard`)**
Hero garrafa-protagonista do "vinho do momento" (próximo da janela ideal, ou recém-adicionado). Tipografia gigante à direita. Faixa inferior horizontal "próximos da janela ideal" com 3 thumbnails. KPIs comerciais migram para uma segunda dobra editorial, não cards — números em display serif com label tipográfico embaixo.

**Adega (`PersonalCellarPage` / `CommercialCellarPage`)**
Vira **prateleira**. Linhas horizontais de garrafas com baseline ivory hairline. Cada garrafa com spotlight próprio. Metadados em coluna sob a garrafa (ano grande, região pequena). Filtros migram para drawer lateral discreto. Ações (Adicionar, Importar) viram FAB champagne gold ou ação no header serif. Funcionalidade 100% preservada.

**Consumo (`ConsumptionPage`) — "Diário"**
Vira **wine journal** cronológico. Cada entrada = momento editorial: garrafa miniatura à esquerda, data em tipografia serif, nota em itálico, contexto ("Jantar em casa · Quarta-feira"). Sem barras de progresso, sem gráficos no topo. Analytics descem para uma aba secundária "Análise" preservada.

**Wishlist (`WishlistPage`) — "Dream Cellar"**
Apresentação de aspiração: grid 2-col de garrafas em vitrine escura, cada uma com nome editorial, faixa de preço em ouro, e "por que está aqui" em itálico. Sem checkbox, sem ícone de lixeira visível — ações em hover/long-press elegantes.

**Alertas (`AlertsPage`) — "Sommelier"**
Replica direta do mockup 3. Cabeçalho "Recomendado para esta semana" em itálico serif. Hero recomendação principal com garrafa + raciocínio do sommelier ("Atinge a janela ideal nos próximos 60 dias…"). Lista secundária em 2 cards minimalistas. **Zero banners vermelhos/verdes.** Alertas comerciais (low stock) preservados mas reescritos em linguagem consultiva: *"Apenas 2 garrafas restantes na adega"* em vez de *"⚠ ESTOQUE BAIXO"*.

**Relatórios (`ReportsPage` / `StatsPage`) — "Sua coleção em narrativa"**
Vira ensaio editorial. Seções com headline serif: *"Você bebe principalmente Bordeaux"*, *"Sua adega favorece safras 2015-2018"*, *"Uma evolução em direção a brancos da Borgonha"*. Charts existentes preservados mas redesenhados — linhas finas, cores ivory/gold/bordeaux, sem grid pesado, sem tooltip box.

**Modais (`ModalBase`, `AddWineDialog`, etc.)**
Vira *Apple Wallet sheet*: corner radius 24px, blur 40px, background `#1A2420/95` + gradiente quente sutil no topo, sombra dramática. Headers de modal em serif display. Forms preservados, mas inputs com underline (não box), labels em uppercase tracked-out.

---

### O que NÃO faço nesta fase

- Não removo nenhuma funcionalidade. Tudo permanece acessível.
- Não toco em business logic, queries, hooks, edge functions.
- Não mexo em onboarding, auth, settings, billing (já consistentes).
- Não refatoro arquitetura por refatorar.

---

### Detalhes técnicos

```text
Novos tokens (src/styles/tokens.css)
├── --editorial-bg-vignette: radial-gradient(ellipse at 70% 20%, rgba(200,169,106,.08), transparent 60%)
├── --editorial-grain: url('data:image/svg+xml,...') (noise SVG)
├── --editorial-spotlight: drop-shadow + radial highlight para garrafas
└── --editorial-baseline: hairline 1px champagne gold 30% para "prateleira"

Novos componentes (src/components/editorial/)
├── BottleObject.tsx          — Garrafa com spotlight, sombra, baseline. Fallback para os 5 arquétipos.
├── EditorialHero.tsx         — Hero garrafa + tipografia (usado em Home + Alertas + ficha)
├── CellarShelf.tsx           — Linha horizontal de garrafas com baseline e luz
├── JournalEntry.tsx          — Item do diário de consumo
├── SommelierRecommendation.tsx — Card recomendação estilo concierge
├── EditorialMetric.tsx       — Número display serif + label uppercase (substitui KPI card)
└── EditorialModal.tsx        — Sheet com blur + gradiente + sombra dramática

Asset
└── src/assets/bottles/       — 5 PNGs (tinto, branco, rosé, espumante, sobremesa)
                                 já gerados com transparência, usados como fallback universal

Motion
└── Curva única: cubic-bezier(0.16, 1, 0.3, 1), durações 400-700ms
    Variants: bottleEnter, fadeUp, parallaxSlow
```

---

### Sequência de implementação (após aprovação)

1. Tokens editoriais + asset das 5 garrafas + `BottleObject` (base)
2. `EditorialHero` + `EditorialMetric` + `SommelierRecommendation` (primitivos)
3. **Home** reimaginada (validação visual ao vivo)
4. **Alertas** → sommelier digital
5. **Adega** → prateleira
6. **Consumo** → diário
7. **Wishlist** → dream cellar
8. **Relatórios** → narrativa
9. `EditorialModal` aplicado nos modais críticos

Cada passo passa pela sua revisão visual antes do próximo.

---

### Critério de sucesso

Quando você abrir a Home pós-implementação, sua primeira reação não deve ser *"esse é o meu app"* — deve ser *"isso é outro produto"*. Se ainda parecer reconhecível como o dashboard de antes, eu falhei.

**Aprovar este plano = aprovar a direção mestre dos 3 mockups acima.** Posso começar pelo passo 1.