import Link from "next/link";

import UrgentOrders from "@/components/dashboard/urgent-orders";
import { EmptyState, ErrorState, ForbiddenState, QueueSkeleton } from "@/components/states";
import { demoSnapshot, urgentOrders } from "@/lib/demo/dashboard";
import { requireSessionUser } from "@/lib/session";

export const metadata = { title: "Antrean Exception" };

const previews = [
  { key: "normal", label: "Normal" },
  { key: "loading", label: "Memuat" },
  { key: "empty", label: "Kosong" },
  { key: "error", label: "Gagal" },
  { key: "forbidden", label: "Akses ditolak" },
] as const;


export default async function QueuePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  await requireSessionUser();
  const { state } = await searchParams;
  const active = previews.find((p) => p.key === state)?.key ?? "normal";

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-space-lg">
      <div className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface sm:font-headline-xl sm:text-headline-xl">
            Antrean Exception
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Daftar pesanan berkendala beserta prioritas, tenggat, dan penanggung jawabnya.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg bg-surface-container px-3 py-2 font-label-md text-label-md text-secondary md:self-auto">
          <span className="size-2 rounded-full bg-primary-container" aria-hidden />
          {demoSnapshot.badge}
        </span>
      </div>

      <nav aria-label="Pratinjau keadaan (demo)" className="flex flex-wrap items-center gap-2">
        <span className="font-label-md text-label-md text-secondary">Pratinjau keadaan (demo):</span>
        {previews.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "normal" ? "/antrean" : `/antrean?state=${key}`}
            aria-current={key === active ? "page" : undefined}
            className={`rounded-full px-3 py-1 font-label-md text-label-md transition-colors ${
              key === active
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-secondary hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {active === "loading" && <QueueSkeleton />}
      {active === "empty" && <EmptyState />}
      {active === "error" && <ErrorState />}
      {active === "forbidden" && <ForbiddenState />}
      {active === "normal" && <UrgentOrders orders={urgentOrders} total={urgentOrders.length} variant="queue" />}
    </div>
  );
}
