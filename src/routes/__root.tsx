import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { SignInScreen } from "@/components/nobar/sign-in-screen";
import { AppShell } from "@/components/nobar/app-shell";
import { Toaster } from "@/components/ui/sonner";

function RootLayout() {
  const { signedIn } = useAuth();

  return (
    <>
      {signedIn ? (
        <AppShell>
          <Outlet />
        </AppShell>
      ) : (
        <SignInScreen />
      )}
      <Toaster />
    </>
  );
}

export const Route = createRootRoute({ component: RootLayout });
