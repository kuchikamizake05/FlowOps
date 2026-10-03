import AppShell from "@/components/app-shell";
import { demoSnapshot, demoUser } from "@/lib/demo/dashboard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell user={demoUser} demoBadge={demoSnapshot.badge}>
      {children}
    </AppShell>
  );
}
