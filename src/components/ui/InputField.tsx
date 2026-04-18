import * as React from "react";
import { Input } from "@/components/ui/input";

export type InputFieldProps = React.ComponentProps<"input">;

/**
 * InputField — alias canônico para Input.
 * Use este componente em todos os formulários novos.
 */
export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>((props, ref) => (
  <Input ref={ref} {...props} />
));
InputField.displayName = "InputField";
