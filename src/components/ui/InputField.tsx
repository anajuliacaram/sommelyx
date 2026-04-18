import { Input, type InputProps } from "@/components/ui/input";

/**
 * InputField — alias canônico para Input.
 * Use este componente em todos os formulários novos.
 * Não criar inputs nativos com classes inline.
 */
export function InputField(props: InputProps) {
  return <Input {...props} />;
}

export type { InputProps as InputFieldProps };
