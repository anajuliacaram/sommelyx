# Sommelyx 2026 — Refoundation Critique

Why the current UI still reads as SaaS, not as a luxury wine object.

Evidence: fresh full-app screenshot audit captured today from the current working tree (`.playwright/screenshots/refoundation-critique/`, 38 captures: desktop + mobile, personal + commercial, all reachable modals), plus a computed-style inventory of every visible element (`audit-report.json` in the same folder).

Context: the working tree is **mid-migration** — home and the commercial overview already moved toward the new language (lighter cards, fewer kickers, 500-weight intent). The critique below describes what actually renders today.

---

## 0. The structural finding that explains everything else

1. **A legacy stylesheet force-bolds the entire app.** `src/styles/authenticated-system.css` applies `font-weight: 600 !important` to every `h1/h2/h3/h4` inside `.dashboard-scroll` (10+ selector blocks), and even rewrites any Tailwind `font-bold`/`font-black` class to 600. The new home code asks for `font-medium` (500) — the computed style audit shows it renders at **600**. The redesign is being silently re-styled by its own legacy layer; no visual refoundation can land until this layer is deleted.
2. **The same layer hard-codes em-based sizes with `!important`**, which is why the audit finds section titles at 23.2px (×56 occurrences), 18.4px, 16.5px — fractional sizes no one ever chose. The type scale that exists in the code is not the type scale on screen.
3. **Two design systems are shipping simultaneously.** Home and commercial overview render the new quiet language; cellar, consumption, alerts, stats, wishlist, settings, plans and every modal still render the previous system (uppercase kickers, KPI strips, glass shadows). Navigating from home to cellar is navigating between two different products.
4. **Two AI flows are currently unreachable.** `QuickActions` (Harmonizar, Analisar carta) is imported but never rendered; nothing in the app sets those dialogs open, and the command menu doesn't list them. The redesign deleted the toolbar without giving these flows a new home — subtraction without re-architecture.

## A. Typography — the system still shouts

5. **600 is still the most common weight on screen** (570 instances vs 291 of 500 and 290 of 400) — a direct consequence of finding #1. Everything titled is semi-bold; emphasis means nothing.
6. **Nine distinct weights render**: 400, 450, 470, 500, 520, 560, 580, 600 and now **700** (the new sidebar's `font-bold` 10px section labels). The 450–580 values are variable-font drift, not decisions.
7. **26 distinct font sizes** are live, including 23.2px, 18.4px, 16.5px, 13.5px, 12.8px, 11.5px, 10.5px, 9.5px. There is no scale — there are accidents of em math.
8. **Micro-text everywhere**: 13px is the second most common size (250 instances), and 12px (73), 11px (43), 10px (12), 9.5px (32), 9px and 8px all ship. Text under 11px is dashboard chrome by definition; no editorial reference sets 9px type.
9. **Uppercase tracked labels remain the default labeling device** on every un-migrated screen: consumption shows 37 uppercase elements, cellar 26, the add-consumption modal 34, inventory 17. `MEU CONSUMO`, `REGISTROS`, `ADEGA`, `AÇÕES INTELIGENTES`, `ORIGEM`, `VINHO`, `TINTO`, `BEBER AGORA`… The 12px/600/wide-tracking eyebrow is the single strongest "admin panel" tell in the product.
10. **The new sidebar reintroduces the same tell in a worse cut**: `NAVEGAÇÃO` / `SISTEMA` at 10px **bold** uppercase — smaller and heavier than the old one, on every screen.
11. **Two type voices collide without a rule.** Pages are Plus Jakarta Sans; modals open with a 42px Cormorant Garamond display title. The serif exists only inside modals, so the editorial voice reads as a costume, not a conviction — and the modal heading also renders twice more at 23.2px in system-font fallback (triplicated DOM title).

## B. Surfaces, cards, borders — container addiction

12. **The cellar paints 52 card-like containers to show 4 wines**; alerts paints 36 for 4 alerts. Furniture-to-content ratio near 10:1.
13. **13 distinct border radii** render today (8, 14, 16, 17, 18, 19, 20, 24, 26, 28, 32px + two pill values). 18px (×275) and 24px (×304) compete as "the" card radius.
14. **25 distinct box-shadow recipes** are live, most 2–3 layers deep. Home hero, wine cards, KPI tiles, banners and modals each carry a different elevation — five opinions where the spec allows one whisper.
15. **Most light cards on un-migrated screens carry a white inset top-highlight** (`rgba(255,255,255,.6) inset`) — glassmorphism gloss, the exact "fake luxury effect" the brief bans.
16. **Cards still nest inside cards**: mobile cellar's summary card holds four sub-tiles; the cellar filter card holds bordered pill-buttons; stats KPI tiles sit in a band inside the page card. Three to four surface layers; the spec allows two.
17. **The modal shell carries five stacked legacy class names** — `modal-container premium-modal-shell sx-ai-modal sx-action-modal sx-v2-modal-shell` — archaeological strata of four prior design systems, all still shipping. The fragmentation is literally written into the class attribute.

## C. Home — calmer now, but still a dashboard skeleton

18. **The layout is still content-stream-plus-widget-rail.** The right rail is a metrics card: Garrafas 15 / Rótulos 4 / Para beber 4 / Em guarda 0 / Patrimônio estimado R$ 21.590. Lowercase labels made it quieter, but it is still a KPI widget — numbers filling boxes, including a literal **zero** ("Em guarda 0") displayed for nothing.
19. **The same numbers appear on three screens**: the rail's bottle count and value repeat in the cellar header strip and again in stats. Duplicated information across surfaces is one of the brief's restart conditions.
20. **The featured bottle is not an object.** The hero shows the same placeholder arch with a "SOMME" watermark over a soft gradient — the one thing that should feel like a $500k cellar's bottle is a template graphic.
21. **"Próximas garrafas" and "Últimos consumos" are two stacked white boxes with identical anatomy** — list rows, hairline dividers, right-aligned glyph. Structure comes entirely from the boxes, not from spacing or typographic rhythm; remove the borders and the page has no architecture.
22. **Mobile home has a contrast bug on its primary action**: the "+ Adicionar vinho" label renders dark-on-dark-red (the global heading/contrast overrides fight the new button styles). The first button a mobile user sees is illegible.
23. **The word "Abrir" appears 38 times across the audit** — still the row-level CTA vocabulary of an ERP, now sometimes restyled as quiet text but present on nearly every list row in the app.

## D. Cellar — the heart of the product is an inventory screen

24. **The page opens with a KPI strip, not with wine**: `15 GARRAFAS / 4 RÓTULOS / 4 ABRIR / 0 GUARDA / R$ 21.590 VALOR` in uppercase-label tiles, plus a "4 / 4 vinhos" pager-style counter under the title. The collection is introduced as stock arithmetic.
25. **Ten-plus permanently visible filter controls** for a four-bottle collection: search field, sort dropdown, country dropdown, Grade/Lista toggle, style pills (Todos/Tinto/Branco/Espumante), status pills (Todos/Beber agora). Excel filtering rows — the literal anti-pattern the brief names — rendered before the user has expressed any intent.
26. **Every bottle is the same placeholder**: arch + "SOMME" watermark + decorative gradient. Nothing is collectible, photographic or specific; four wines look like four copies of one template.
27. **Each wine tile stacks 7–8 elements**: `NO AUGE` badge, thumbnail, name, producer, style chip, bottle-count chip, price, `Abrir` button. Price + CTA on every card makes the cellar read as a shop list, not a collection.
28. **`NO AUGE` is stamped in uppercase on all 8 cards** — a database status column rendered as a badge, eight times.

## E. Consumption — a diary formatted as a log table

29. **Four layers of labeling sit above three entries**: eyebrow `REGISTROS`, heading `Histórico`, counter `3 registros`, month headers `ABR 26 — 1 ABERTURA`. The scaffolding outweighs the content.
30. **Every row carries an edit-pencil button and a rating chip** — per-row admin actions, the signature of a CRUD grid. Recording a moment should not look like editing a record.
31. **The right rail duplicates the timeline's first entry verbatim**: the dark `ÚLTIMO CONSUMO` card repeats the same wine, note and rating sitting 200px to its left.
32. **A KPI dashboard is bolted onto the journal**: `TOTAL 3 / ESTE MÊS 0,3 / NOTA MÉDIA 4,6 / ESTILO RECORRENTE` plus a 12-month bar chart. "0,3 bottles this month" is a number telling no story — it exists because the box existed.
33. **A "Filtros" dropdown governs a three-item personal diary** — filtering apparatus before there is anything to filter.

## F. Wishlist & Alerts — operations, not aspiration or guidance

34. **Wishlist is operational furniture around one item**: explainer sentence, `+ Novo item` button, permanent search input — for a single wish — then a vast empty area. Nothing invites desire: no imagery, no story, no aspiration.
35. **The one wish is chip-encrusted**: vintage chip, region chip, priority chip `ALTA`, target-price chip. A dream formatted as a ticket with priority labels.
36. **Alerts opens with two saturated full-width alarm banners** (dark red `Beber agora`, dark green `Analisar com Sommelyx`). Red banners with count chips are monitoring-tool urgency — precisely the "visual alarmism" the brief asks to remove.
37. **The red banner carries four unexplained count chips** (`4 / 2 / 1 / 1`) — CI-pipeline badge math no collector thinks in.
38. **Every alert row repeats `Janela ideal: 2024–2030`** (8 times on one screen) plus uppercase `BEBER AGORA`, an `Analisar` button, a dismiss × and an arrow → — four affordances per row, all mechanical.
39. **"Beber agora: 4" is now shown on three screens** (home rail, cellar badges, alerts) — the third duplication of one fact.

## G. Stats — literally named a dashboard

40. **The page calls itself `Relatórios & analytics`**, subtitle "Inteligência sobre a evolução da sua coleção". The name concedes the argument; the layout honors it: four icon+uppercase-label KPI tiles, a 3-bar chart, progress bars, a histogram, a `#1–#4` ranked list. Charts of three data points are decoration, not insight.
41. **A KPI tile truncates its own caption** (`R$ 21.590 atualiz...`) — the furniture doesn't fit the furniture.
42. **Mobile stats color-codes tiles with pink/green gradients** that mean nothing (pink = bottles? green = rating?) — decorative accent use against the 95/5 rule.

## H. Modals — five generations of shells, form semantics

43. **Add wine is a generic options menu**: icon tile + serif title + hairline + three bordered list-buttons ("Escanear rótulo / Importar arquivo / Adicionar manualmente"). Nothing about it feels like premium onboarding; it is structurally identical to a settings dialog.
44. **Each small dialog stacks three bordered surface layers** (glass shell → icon-tile + divider header → bordered option cards), each with its own radius, border and inset highlight — "no double surfaces" violated inside a 360px box.
45. **Add consumption is a form with uppercase scaffolding**: `ORIGEM` and `VINHO` micro-labels (34 uppercase elements in this one modal), a segmented control, and a full-width red uppercase CTA `REGISTRAR CONSUMO`. Recording a moment renders as completing a database row.
46. **On mobile the serif modal title collides with the close button** ("Adicionar vinho" clips against the ×) — the display face was dropped in without owning its layout.
47. **The modal backdrop is a heavy blur veil** that erases the app entirely; with the floating glass panel it reads as a system permission prompt, not a moment inside the product.

## I. Global chrome & color — the SaaS shell underneath

48. **The shell renders two search affordances simultaneously** — a centered "Pesquisar…" pill and the right-side command input — in the same topbar, plus a floating chat bubble overlapping content on mobile. Duplicate chrome in the frame itself.
49. **The command menu is structurally Raycast but visually alarmed**: its input carries a hard red border ring (alarm color on a search field), uppercase maroon section headers, and — after the migration — only three quick actions, with Harmonizar and Analisar carta missing (see #4).
50. **The wine-red accent is used operationally, constantly**: primary buttons, active pills, count badges, banner backgrounds, the `BUSINESS` pill, focus rings. Measured across screens the accent covers far more than 5% — and dark green competes as a second saturated voice (alerts banner, mobile Menu pill, hero treatments). Two loud colors, neither reserved for meaning.
51. **The commercial area still speaks BI**: KPI header row (`RÓTULOS / GARRAFAS / PATRIMÔNIO / REPOSIÇÃO`), dual data tables ("Estoque" / "Reposição"), per-row `Editar` links, a six-control filter toolbar on Estoque — while Vendas shows **three zero-value KPI tiles above an empty state** (`R$ 0 / 0 / 0`). Showing three zeros in boxes before the user has done anything is the purest "designed by engineers" moment in the app.

---

## The shape of the problem

Five reflexes generate all 51 observations:

- **Labeling reflex** — eyebrow + heading + counter + chip on every block (#9, #24, #29, #45).
- **Container reflex** — every datum gets a box; every box gets border + shadow + inset gloss (#12–#17).
- **KPI reflex** — every screen opens with number tiles, even when the number is 0 or 0,3 (#18, #24, #32, #40, #51).
- **Row-action reflex** — every list row carries buttons/chips/pencils (#23, #27, #30, #38).
- **Accent reflex** — wine-red as the default fill for anything interactive (#36, #49, #50).

And one enabling condition: **the `!important` legacy stylesheet (#1–#2) re-applies these reflexes even to redesigned screens.** The rebuild must start by deleting that layer and the four dead design systems in the modal shell — then typography (400/500/600, one scale), spacing (8-base), and one card family replace the rest.
