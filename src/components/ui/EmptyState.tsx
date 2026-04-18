import { PremiumEmptyState } from "@/components/ui/premium-empty-state";

/**
 * EmptyState — alias canônico para PremiumEmptyState.
 *
 * Use SEMPRE este componente em estados vazios. Nunca renderize uma tela em branco.
 *
 * Padrão de mensagens:
 *  - title: o que está vazio (ex: "Sua adega está vazia")
 *  - description: motivo + benefício (ex: "Adicione seu primeiro vinho para começar a organizar sua coleção e receber recomendações personalizadas.")
 *  - primaryAction: SEMPRE forneça uma ação clara (ex: "Adicionar vinho")
 */
export const EmptyState = PremiumEmptyState;
