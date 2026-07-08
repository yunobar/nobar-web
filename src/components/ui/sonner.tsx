import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/lib/theme-context";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-2 rounded-[11px] bg-primary text-primary-foreground px-[18px] py-3 text-[13.5px] font-medium shadow-[var(--shadow)]",
          icon: "text-current",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
