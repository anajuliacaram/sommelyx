<!--
AI_TOOLS_MAP — Sommelyx AI audit map

Scope: frontend trigger -> Supabase Edge Function -> AI/API call -> response parsing -> UI rendering.
Audit date: 2026-05-20

Edge Functions

1. scan-wine-label
- Path: supabase/functions/scan-wine-label/index.ts
- Feature: Escanear Rotulo; also used by image import in Importar Documento.
- Model/API: OpenAI Responses API, default model gpt-4o-mini, optional SCAN_WINE_LABEL_MODEL.
- Endpoint: https://api.openai.com/v1/responses via supabase/functions/_shared/openai.ts.
- Input: { imageBase64, mimeType, fileName, clientRequestId? }.
- Returns: wine extraction fields: name, producer, vintage, style, country, region, grape, estimated_price, purchase_price, food_pairing, tasting_notes, cellar_location, drink_from, drink_until, ocr_text, ocr_confidence, confidence, plus Portuguese aliases nome/produtor/safra/pais/regiao/uva/estilo/teor_alcoolico/notas.
- Env vars: OPENAI_API_KEY required; SCAN_WINE_LABEL_MODEL optional; SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; SCAN_WINE_LABEL_DEBUG optional.

2. parse-csv-wines
- Path: supabase/functions/parse-csv-wines/index.ts
- Feature: Importar Documento; CSV/TSV/text/spreadsheet-normalized text/PDF extracted text enrichment.
- Model/API: OpenAI Responses API, gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: { csvContent, fileName?, fileType?, parseMode?, textBlocks?, ocrUsed?, clientRequestId? }.
- Returns: { wines, vinhos, total_encontrados, avisos, column_mapping, notes, metadata }.
- Env vars: OPENAI_API_KEY via shared OpenAI helper; SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

3. parse-pdf-ocr
- Path: supabase/functions/parse-pdf-ocr/index.ts
- Feature: Importar Documento and Analisar Carta PDF text extraction.
- Model/API: No external AI call; extracts text from PDF bytes server-side.
- Endpoint: none external.
- Input: { pdfBase64 | base64Pdf, fileName?, mimeType: "application/pdf", clientRequestId? }.
- Returns: { text, extractedText, ocrUsed: false, pageCount, textLength } or structured error.
- Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

4. extract-image-text
- Path: supabase/functions/extract-image-text/index.ts
- Feature: OCR for Analisar Carta image uploads and image-based document import.
- Model/API: OpenAI Responses API, default OPENAI_MODEL or gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: { imageBase64, mimeType, fileName?, clientRequestId? }.
- Returns: { success: true, text, extractedText, requestId } or structured error.
- Env vars: OPENAI_API_KEY, OPENAI_MODEL optional; SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

5. analyze-wine-list
- Path: supabase/functions/analyze-wine-list/index.ts
- Feature: Analisar Carta; also menu-for-wine analysis inside Harmonizar.
- Model/API: OpenAI Responses API, gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: { extractedText, mimeType?, fileName?, userProfile?, normalizedOcr?, mode?, wineName?, clientRequestId? }.
- Returns wine-list mode: { wines, topPick, bestValue, fallback?, fallbackReason? }. Wine items include name, producer, grape, country, region, vintage, price, category, confidence, descricao_carta/description, harmonizacao_sugerida, destaque, perfil, comparativeLabels, pairings.
- Returns menu-for-wine mode: { wineProfile, dishes, summary } normalized for pairing UI.
- Env vars: OPENAI_API_KEY via shared helper; SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

6. wine-pairings
- Path: supabase/functions/wine-pairings/index.ts
- Feature: Harmonizar wine -> food and food -> wine.
- Model/API: OpenAI Responses API, gpt-4o-mini when deterministic local pairing cannot answer.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: { mode, wineName, wineStyle, wineGrape, wineRegion, wineProducer, wineVintage, wineCountry, dish, userWines, intent, clientRequestId? }.
- Returns wine-to-food: { wineProfile, pairings, pairingLogic }. Returns food-to-wine/cellar: { dishProfile, suggestions }. Deterministic fallback may return source/note.
- Env vars: OPENAI_API_KEY via shared helper; SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

7. estimate-wine-price
- Path: supabase/functions/estimate-wine-price/index.ts
- Feature: Estimativa de Preco in AddWine and import enrichment.
- Model/API: OpenAI Responses API, OPENAI_MODEL or gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: { name, producer?, vintage?, style?, country?, region?, grape?, clientRequestId? }.
- Returns canonical: { preco_estimado_brl, faixa_min, faixa_max, confianca, fonte_referencia }; backward-compatible: { estimated_price, confidence, reasoning }.
- Env vars: OPENAI_API_KEY required; OPENAI_MODEL optional; SUPABASE_URL, SUPABASE_ANON_KEY.

8. taste-compatibility
- Path: supabase/functions/taste-compatibility/index.ts
- Feature: ancillary taste/profile compatibility analysis.
- Model/API: OpenAI Responses API, gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: user taste/cellar payload.
- Returns compatibility analysis object used by sommelier helpers.
- Env vars: OPENAI_API_KEY via shared helper; SUPABASE_URL, SUPABASE_ANON_KEY.

9. wine-insight
- Path: supabase/functions/wine-insight/index.ts
- Feature: ancillary wine insight/details.
- Model/API: OpenAI Responses API, gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: wine details.
- Returns technical wine insight JSON.
- Env vars: OPENAI_API_KEY via shared helper; SUPABASE_URL, SUPABASE_ANON_KEY.

10. wishlist-wine-assistant
- Path: supabase/functions/wishlist-wine-assistant/index.ts
- Feature: wishlist assistant, optional label/image assisted capture.
- Model/API: OpenAI Responses API, gpt-4o-mini.
- Endpoint: https://api.openai.com/v1/responses via _shared/openai.ts.
- Input: { query?, imageBase64?, mimeType?, fileName?, cellar? }.
- Returns wishlist wine suggestion payload.
- Env vars: OPENAI_API_KEY; SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

11. wine-image-resolver
- Path: supabase/functions/wine-image-resolver/index.ts
- Feature: background label image resolver after wine creation.
- Model/API: not an LLM. Uses Google CSE if configured and DuckDuckGo/html fallbacks.
- Endpoint: Google Custom Search API and public web/image URLs.
- Input: { wineId, force?, failedUrl? }.
- Returns: { ok, image_url, source }.
- Env vars: GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID optional; SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

12. debug-events
- Path: supabase/functions/debug-events/index.ts
- Feature: debug log retrieval.
- Model/API: none.
- Input: query params and auth/debug secret.
- Returns debug event rows.
- Env vars: WRAPPED_DEBUG, DEBUG_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

13. auth-email-hook
- Path: supabase/functions/auth-email-hook/index.ts
- Feature: custom auth emails.
- Model/API: none; Lovable email endpoint.
- Input: Supabase auth email hook payload.
- Returns email send status.
- Env vars: LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

14. process-email-queue
- Path: supabase/functions/process-email-queue/index.ts
- Feature: queued email processor.
- Model/API: none; Lovable email endpoint.
- Input: internal secret protected request.
- Returns processing summary.
- Env vars: PROCESS_EMAIL_QUEUE_SECRET, LOVABLE_API_KEY, LOVABLE_SEND_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

Frontend Call Sites

Escanear Rotulo
- Trigger/UI: src/components/ScanWineLabelDialog.tsx.
- Edge call: invokeEdgeFunction("scan-wine-label", { imageBase64, mimeType, fileName }).
- Loading/error/success: step state scanning/error/preview, errorMsg/supportCode, retry path.
- Result render: ScanWineLabelDialog preview; AddWineDialog.handleScanComplete maps result into form fields and keeps modal open.

Importar Documento
- Trigger/UI: src/components/ImportCsvDialog.tsx.
- Edge calls: parse-csv-wines for structured text/enrichment; parse-pdf-ocr through src/lib/ai-attachments.ts for PDFs; extract-image-text for image OCR; scan-wine-label for single label image mode; estimate-wine-price for row enrichment.
- Loading/error/success: step/analyzing/preview, analysisStage, parseErrors, aiNotes, row review/edit table before save.
- Result render: ImportCsvDialog review table and duplicate/confidence issue UI.

Harmonizar
- Trigger/UI: src/components/DishToWineDialog.tsx plus pairing shared cards.
- Edge calls: src/lib/sommelier-ai.ts generateWinePairing -> invokeEdgeFunction("wine-pairings"); analyzeMenuForWine -> invokeEdgeFunction("analyze-wine-list", mode "menu-for-wine").
- Loading/error/success: modal step machine, isLoading/error states, specific messages for carta/menu/pairing.
- Result render: DishToWineDialog cards for pairings/suggestions and menu analysis.

Analisar Carta
- Trigger/UI: src/components/WineListScannerDialog.tsx and DishToWineDialog external carta mode.
- Edge calls: prepareAiAnalysisAttachment in src/lib/ai-attachments.ts -> parse-pdf-ocr or extract-image-text; src/lib/sommelier-ai.ts analyzeWineList -> analyze-wine-list.
- Loading/error/success: scanner step states, attachment preparation messages, EdgeFunctionError handling.
- Result render: WineListScannerDialog premium card list with badges, perfil/harmonizacao_sugerida, price, and actions Salvar/Wishlist/Harmonizar/Ver/Consumo.

Estimativa de Preco
- Trigger/UI: src/components/AddWineDialog.tsx debounced field watcher; src/components/ImportCsvDialog.tsx row enrichment.
- Edge call: invokeEdgeFunction("estimate-wine-price", wine identity fields).
- Loading/error/success: estimating state in AddWineDialog; enrichment catches per row in ImportCsvDialog.
- Result render: AddWineDialog value field with "estimado pela IA" and low-confidence range; ImportCsvDialog fills purchase/current value where missing.

Environment Wiring
- Frontend uses src/lib/edge-invoke.ts, which sends Authorization Bearer session token, Content-Type, and X-Client-Request-Id on every function call.
- Required AI secret currently standardized on OPENAI_API_KEY. OPENAI_MODEL is optional globally; SCAN_WINE_LABEL_MODEL is optional for label scan.
- No active Gemini endpoint was found in the current codebase. GEMINI_API_KEY/GOOGLE_AI_KEY are not currently read by the audited functions.
-->

# AI Tools Map

This file intentionally starts with the full audit map as an HTML comment block so it can be consumed by tools without affecting rendered documentation.
