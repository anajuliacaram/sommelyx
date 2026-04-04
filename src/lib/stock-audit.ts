export type StockAuditReason =
  | "Venda"
  | "Consumo interno"
  | "Quebra / avaria"
  | "Perda / extravio"
  | "Ajuste de inventário"
  | "Transferência"
  | "Entrada manual"
  | "Correção de cadastro"
  | "Ruptura identificada"
  | "Outro";

export const STOCK_AUDIT_REASONS: StockAuditReason[] = [
  "Venda",
  "Consumo interno",
  "Quebra / avaria",
  "Perda / extravio",
  "Ajuste de inventário",
  "Transferência",
  "Entrada manual",
  "Correção de cadastro",
  "Ruptura identificada",
  "Outro",
];

export function normalizeAuditName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeAuditText(value: string) {
  return value.trim();
}

