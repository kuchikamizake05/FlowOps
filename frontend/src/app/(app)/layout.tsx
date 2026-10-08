import AppShell from "@/components/app-shell";
import { demoSnapshot } from "@/lib/demo/dashboard";
import { requireSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser();

  return (
    <AppShell user={user} demoBadge={demoSnapshot.badge}>
      {children}
    </AppShell>
  );
}
