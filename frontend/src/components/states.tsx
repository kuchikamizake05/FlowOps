import { Inbox, Lock, SearchX, WifiOff, type LucideIcon } from "lucide-react";

interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "neutral" | "critical";
  role?: "alert" | "status";
  children?: React.ReactNode;
}

/** Kerangka bersama untuk keadaan kosong, gagal, akses ditolak, dan tidak ditemukan. */
export function StatePanel({ icon: Icon, title, description, tone = "neutral", role, children }: StatePanelProps) {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-space-md rounded-xl bg-surface-container-lowest px-space-lg py-12 text-center shadow-sm"
    >
      <span
        className={`flex size-14 items-center justify-center rounded-full ${
          tone === "critical" ? "bg-error-container text-error" : "bg-secondary-container text-primary"
        }`}
      >
        <Icon className="size-7" aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        <p className="font-body-md text-body-md text-secondary">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function EmptyState() {
  return (
    <StatePanel
      icon={Inbox}
      title="Tidak ada exception"
      description="Belum ada pesanan yang berkendala. Pesanan baru yang bermasalah akan muncul di sini."
    />
  );
}

export function ErrorState({ action }: { action?: React.ReactNode }) {
  return (
    <StatePanel
      icon={WifiOff}
      tone="critical"
      role="alert"
      title="Gagal memuat data"
      description="Server FlowOps tidak dapat dihubungi atau membalas dengan kesalahan. Periksa koneksi lalu coba lagi."
    >
      {action}
    </StatePanel>
  );
}

export function ForbiddenState() {
  return (
    <StatePanel
      icon={Lock}
      tone="critical"
      role="alert"
      title="Akses ditolak"
      description="Anda tidak memiliki izin untuk melihat data ini. Hubungi owner bila Anda merasa seharusnya memiliki akses."
    />
  );
}

export function NotFoundState({ action }: { action?: React.ReactNode }) {
  return (
    <StatePanel
      icon={SearchX}
      title="Data tidak ditemukan"
      description="Halaman atau data yang Anda cari tidak ada, atau sudah dipindahkan."
    >
      {action}
    </StatePanel>
  );
}

const bar = "rounded bg-surface-container motion-safe:animate-pulse";

/** Kerangka tabel saat data dimuat. */
export function QueueSkeleton() {
  return (
    <div role="status" aria-busy="true" className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      <span className="sr-only">Memuat data…</span>
      <div className="flex flex-col gap-3 p-space-lg">
        <div className={`h-6 w-56 ${bar}`} />
        <div className={`h-4 w-80 max-w-full ${bar}`} />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-space-md border-t border-surface-container px-space-lg py-4">
          <div className={`h-6 w-1.5 ${bar}`} />
          <div className={`h-4 w-24 ${bar}`} />
          <div className={`h-4 flex-1 ${bar}`} />
          <div className={`hidden h-6 w-40 rounded-full sm:block ${bar}`} />
        </div>
      ))}
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex h-32 flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div className={`h-4 w-28 ${bar}`} />
          <div className={`h-8 w-16 ${bar}`} />
        </div>
      ))}
    </div>
  );
}
