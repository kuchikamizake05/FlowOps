import { CalendarDays, Info } from "lucide-react";

import MetricCard from "@/components/dashboard/metric-card";
import UrgentOrders from "@/components/dashboard/urgent-orders";
import { demoSnapshot, metrics, urgentOrders } from "@/lib/demo/dashboard";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const activeExceptions = metrics.find((m) => m.id === "active")?.value ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-space-lg">
      <div className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden />
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-on-surface">
              Dashboard
            </h1>
          </div>
          <p className="font-body-md text-body-md text-secondary">
            Ringkasan pesanan yang perlu perhatian dan progres penanganan tim.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm self-start md:self-auto">
          <span className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 font-label-lg text-label-lg text-on-surface shadow-sm">
            <CalendarDays className="size-4.5 text-secondary" aria-hidden />
            <span className="font-numeric-table">{demoSnapshot.dateLabel}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 font-label-md text-label-md text-secondary">
            <span className="size-2 rounded-full bg-primary-container" aria-hidden />
            {demoSnapshot.badge}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-1 rounded-lg bg-secondary-container/40 px-space-md py-2.5 text-on-secondary-container sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 font-label-md text-label-md">
          <Info className="size-4.5 shrink-0 text-primary" aria-hidden />
          <span>
            Hierarki Metrik: <strong>Kritis</strong> dan <strong>Belum Ditugaskan</strong> termasuk
            dalam <strong>Exception Aktif</strong>.
          </span>
        </p>
        <span className="font-label-sm text-label-sm text-secondary">
          Status per {demoSnapshot.statusAt}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <UrgentOrders orders={urgentOrders} total={activeExceptions} />
    </div>
  );
}
