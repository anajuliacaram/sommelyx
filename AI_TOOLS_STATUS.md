# AI Tools Status

Audit date: 2026-05-20

| Feature | Status | Notes |
|---|---:|---|
| Escanear Rotulo | ❌ Fixed in this pass | Shared JSON extraction now strips markdown fences. Label scan response now includes Portuguese aliases and alcohol field while preserving existing frontend fields. Requires `OPENAI_API_KEY`. |
| Importar Documento | ❌ Fixed in this pass | Import result now returns both existing `wines` and requested aliases `vinhos`, `total_encontrados`, `avisos`. CSV/XLSX parsing remains frontend/direct where possible; AI is used for enrichment/unstructured text. |
| Harmonizar | ✅ Working | `wine-pairings` already had auth, CORS, structured errors, deterministic fallbacks, timeout/retry behavior, cache, and result normalization. No visual changes made. Requires `OPENAI_API_KEY` only when deterministic path cannot answer. |
| Analisar Carta | ❌ Fixed in this pass | Result pipeline now accepts and renders `destaque`, `perfil`, `harmonizacao_sugerida`, Portuguese field aliases, and price/vintage aliases. PDF is text-extracted before analysis; image OCR uses `extract-image-text`. |
| Estimativa de Preco | ❌ Fixed in this pass | Edge function now returns requested schema (`preco_estimado_brl`, `faixa_min`, `faixa_max`, `confianca`, `fonte_referencia`) plus backward-compatible fields (`estimated_price`, `confidence`, `reasoning`). AddWine shows low-confidence range. |

## Manual Actions Required

- 🔧 Set `OPENAI_API_KEY` in Supabase Edge Function secrets for all AI functions.
- Optional: set `OPENAI_MODEL=gpt-4o-mini` if you want to force the same model globally.
- Optional: set `SCAN_WINE_LABEL_MODEL=gpt-4o-mini` if label scan should ignore `OPENAI_MODEL`.
- Optional for image resolver only: set `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID`.

## Verification Limits

Local build/type validation can verify wiring and TypeScript. Live end-to-end AI quality still requires valid Supabase auth and production/staging Edge Function secrets.
