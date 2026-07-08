import { toast } from "sonner";

export function flash(message: string) {
  toast(message, { icon: "✓" });
}
