import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  ChevronRight,
  Clock,
  Hourglass,
  RefreshCw,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type {
  DeadlineIcon,
  DeadlineTone,
  HandlingStatus,
  UrgentOrder,
} from "@/lib/demo/dashboard";

const deadlineIcons: Record<DeadlineIcon, LucideIcon> = {
  alarm: AlarmClock,
  clock: Clock,
  hourglass: Hourglass,
  sync: RefreshCw,
};

const deadlineStyles: Record<DeadlineTone, string> = {
  critical: "bg-error-container text-on-error-container font-semibold",
  warning: "bg-error-container/60 text-error font-semibold",
  neutral: "bg-surface-container text-secondary",
};

const handlingStyles: Record<HandlingStatus, { label: string; pill: string; dot: string }> = {
  in_progress: {
    label: "Sedang ditangani",
    pill: "bg-secondary-container text-on-surface",
    dot: "bg-primary",
  },
  not_started: {
    label: "Belum ditangani",
    pill: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-outline",
  },
};

export default function UrgentOrders({ orders, total }: { orders: UrgentOrder[]; total: number }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col justify-between gap-space-sm p-space-lg sm:flex-row sm:items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">Butuh Tindakan Segera</h2>
            <span className="rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm text-on-error-container">
              {orders.length} Prioritas
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-secondary">
            Pesanan dengan batas SLA terdekat atau memerlukan delegasi penanganan kilat.
          </p>
        </div>
        <Link
          href="/antrean"
          className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline"
        >
          Buka Antrean Lengkap
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-220 border-collapse text-left font-body-md text-body-md">
          <thead className="bg-surface-container-low font-label-md text-label-md tracking-wider text-secondary uppercase">
            <tr>
              <th scope="col" className="px-space-lg py-3.5 font-semibold">ID Pesanan</th>
              <th scope="col" className="px-space-md py-3.5 font-semibold">Masalah &amp; Kanal</th>
              <th scope="col" className="px-space-md py-3.5 font-semibold">Sisa Waktu / Tenggat</th>
              <th scope="col" className="px-space-md py-3.5 font-semibold">Penanggung Jawab</th>
              <th scope="col" className="px-space-md py-3.5 font-semibold">Status Penanganan</th>
              <th scope="col" className="px-space-lg py-3.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-on-surface">
            {orders.map((order) => {
              const DeadlineIcon = deadlineIcons[order.deadline.icon];
              const handling = handlingStyles[order.handling];
              return (
                <tr
                  key={order.id}
                  className={`transition-colors hover:bg-surface-container-low/70 ${
                    order.deadline.tone === "critical" ? "bg-error-container/10" : ""
                  }`}
                >
                  <td className="px-space-lg py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-6 w-1.5 rounded-full ${
                          order.priority === "critical" ? "bg-error" : "bg-outline-variant"
                        }`}
                        aria-hidden
                      />
                      <span className="font-numeric-table font-semibold">{order.id}</span>
                    </div>
                  </td>
                  <td className="px-space-md py-4">
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg">{order.issue}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-body-sm text-body-sm text-secondary">
                        <span className="size-2 rounded-full bg-primary-container" aria-hidden />
                        {order.channel}
                      </span>
                    </div>
                  </td>
                  <td className="px-space-md py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-numeric-table text-label-md ${deadlineStyles[order.deadline.tone]}`}
                    >
                      <DeadlineIcon className="size-3.5" aria-hidden />
                      {order.deadline.label}
                    </span>
                  </td>
                  <td className="px-space-md py-4 whitespace-nowrap">
                    {order.assignee ? (
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-surface-container-high font-label-sm text-label-sm">
                          {order.assignee.initials}
                        </span>
                        <span className="font-label-md text-label-md">{order.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-2.5 py-1 font-label-sm text-label-sm text-on-tertiary-fixed">
                        <UserPlus className="size-3.5" aria-hidden />
                        Belum ditugaskan
                      </span>
                    )}
                  </td>
                  <td className="px-space-md py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-md text-label-md ${handling.pill}`}
                    >
                      <span className={`size-1.5 rounded-full ${handling.dot}`} aria-hidden />
                      {handling.label}
                    </span>
                  </td>
                  <td className="px-space-lg py-4 text-right whitespace-nowrap">
                    <Link
                      href="/antrean"
                      className="inline-flex items-center gap-1 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-primary shadow-sm transition-all hover:bg-surface-container"
                    >
                      Lihat Detail
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center bg-surface-container-low/60 p-space-md">
        <Link
          href="/antrean"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2 font-label-lg text-label-lg text-on-primary shadow-sm transition-opacity hover:opacity-95"
        >
          Lihat Semua Exception ({total})
          <ArrowRight className="size-4.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
