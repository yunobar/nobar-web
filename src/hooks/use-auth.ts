import { useMutation } from "@tanstack/react-query";
import { login, logout, register } from "@/lib/api";
import { clearCsrfToken } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({ mutationFn: login, onSuccess: () => signIn() });
}

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearCsrfToken();
      queryClient.clear();
      signOut();
    },
  });
}
