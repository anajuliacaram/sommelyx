import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      offset={16}
      mobileOffset="calc(env(safe-area-inset-bottom) + 16px)"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-[#E6DED2] group-[.toaster]:bg-[rgba(255,255,255,0.96)] group-[.toaster]:text-[#1B1A18] group-[.toaster]:backdrop-blur-xl group-[.toaster]:shadow-[0_18px_50px_-32px_rgba(15,15,20,0.45),0_2px_8px_rgba(15,15,20,0.08)]",
          title: "group-[.toast]:text-[13px] group-[.toast]:font-semibold group-[.toast]:leading-tight group-[.toast]:tracking-[-0.01em] group-[.toast]:text-[#1B1A18]",
          description: "group-[.toast]:text-[12.5px] group-[.toast]:leading-[1.45] group-[.toast]:text-[#60574D]",
          actionButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-wine group-[.toast]:px-3 group-[.toast]:text-sm group-[.toast]:text-wine-foreground group-[.toast]:shadow-[0_10px_22px_-16px_hsl(var(--wine)/0.28)] hover:group-[.toast]:bg-wine/92",
          cancelButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-muted/60 group-[.toast]:px-3 group-[.toast]:text-sm group-[.toast]:text-foreground/80 hover:group-[.toast]:bg-muted/75",
          success:
            "group-[.toast]:border-[#D5E4D2] group-[.toast]:bg-[#F4FAF2] group-[.toast]:text-[#214128]",
          error:
            "group-[.toast]:border-[#E7B5BD] group-[.toast]:bg-[#FFF7F8] group-[.toast]:text-[#5A1822]",
          warning:
            "group-[.toast]:border-[#E9D9B0] group-[.toast]:bg-[#FFF9EF] group-[.toast]:text-[#664B12]",
          loading:
            "group-[.toast]:border-[#D9D4CB] group-[.toast]:bg-[#FAF8F5] group-[.toast]:text-[#4F463F]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
