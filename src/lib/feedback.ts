import { toast as sonnerToast } from "sonner";

/**
 * Helpers de feedback unificados.
 * Use SEMPRE estas funções em vez de toast.error("Erro").
 *
 * Tom: detalhado com motivo + sugestão de ação alternativa.
 */

interface FeedbackOptions {
  /** Descrição secundária (motivo técnico ou orientação). */
  description?: string;
  /** Duração em ms. Padrão: 4000 (sucesso) / 6000 (erro). */
  duration?: number;
}

/**
 * Sucesso — feedback leve e claro.
 * Ex: notifySuccess("Vinho adicionado à adega")
 */
export function notifySuccess(title: string, options: FeedbackOptions = {}) {
  return sonnerToast.success(title, {
    description: options.description,
    duration: options.duration ?? 4000,
  });
}

/**
 * Erro — sempre detalhado, com motivo e ação alternativa quando possível.
 *
 * Padrão: "Não conseguimos {ação}. {motivo}. {sugestão}."
 *
 * Ex:
 *   notifyError("Não conseguimos analisar o rótulo", {
 *     description: "Imagem com baixa resolução. Tente outra foto com melhor iluminação ou preencha manualmente.",
 *   })
 */
export function notifyError(title: string, options: FeedbackOptions = {}) {
  return sonnerToast.error(title, {
    description: options.description,
    duration: options.duration ?? 6000,
  });
}

/**
 * Info / processamento contínuo. Retorna id para dismiss manual.
 */
export function notifyInfo(title: string, options: FeedbackOptions = {}) {
  return sonnerToast(title, {
    description: options.description,
    duration: options.duration ?? 4000,
  });
}

/**
 * Loading com promise — exibe loading, sucesso ou erro automaticamente.
 *
 * Ex:
 *   notifyPromise(saveWine(), {
 *     loading: "Salvando vinho…",
 *     success: "Vinho salvo na adega",
 *     error: "Não conseguimos salvar. Verifique sua conexão e tente novamente.",
 *   })
 */
export function notifyPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string },
) {
  return sonnerToast.promise(promise, messages);
}

/**
 * Extrai mensagem técnica de um erro desconhecido (network/Supabase/etc).
 * Use para popular `description` em notifyError.
 */
export function getErrorReason(err: unknown, fallback = "Verifique sua conexão e tente novamente."): string {
  if (err instanceof Error) {
    const msg = err.message?.trim();
    if (msg && msg.length < 200) return msg;
  }
  if (typeof err === "string" && err.length < 200) return err;
  return fallback;
}
