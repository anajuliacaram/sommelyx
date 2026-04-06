import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-border/70 group-[.toaster]:bg-background/88 group-[.toaster]:text-foreground group-[.toaster]:backdrop-blur-xl group-[.toaster]:shadow-[0_18px_50px_-32px_rgba(15,15,20,0.55),0_2px_8px_rgba(15,15,20,0.08)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-wine group-[.toast]:text-wine-foreground group-[.toast]:shadow-[0_10px_22px_-16px_hsl(var(--wine)/0.28)] hover:group-[.toast]:bg-wine/92",
          cancelButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-muted/60 group-[.toast]:text-foreground/80 hover:group-[.toast]:bg-muted/75",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
