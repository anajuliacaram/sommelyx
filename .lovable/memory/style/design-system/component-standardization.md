---
name: Component standardization
description: Aliases canônicos (PrimaryButton, SecondaryButton, InputField, CardBase, ModalBase) com radius 16px global. Classe utilitária .input-premium para inputs nativos. Proibido criar inputs/botões com classes inline duplicadas.
type: design
---
**Tokens fixos**:
- Radius global em primitivos interativos: 16px (`rounded-[16px]`)
- Button (todas variantes), Input, Select, Textarea, Card: 16px
- Hover lift: `translateY(-1px) scale(1.01)`
- Press: `scale(0.97)`
- Curve: `cubic-bezier(0.22, 1, 0.36, 1)` em 180–220ms

**Aliases canônicos** (`src/components/ui/`):
- `PrimaryButton.tsx` → `<Button variant="primary" />`
- `SecondaryButton.tsx` → `<Button variant="secondary" />`
- `InputField.tsx` → forwardRef sobre `<Input />`
- `CardBase.tsx` → reexporta `Card*` family
- `ModalBase.tsx` permanece, mas Dialog é o padrão preferencial

**Classe utilitária `.input-premium`** (definida em `index.css` @layer components):
- Usar quando precisar de `<input>`/`<select>` nativo (ex: campos com lógica especial)
- Substitui blocos como `w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]` + `style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }}`

**Proibido**:
- Criar `<input>` com classe `rounded-[14px]` + style inline duplicado
- Definir hover/focus de borda em cores HEX em componentes de página — sempre usar Input, InputField ou `.input-premium`
- Misturar variantes Button via classe (ex: alterar `rounded-*` no className)
