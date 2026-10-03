/**
 * Data dummy untuk dashboard. Backend belum punya endpoint ringkasan maupun
 * antrean, jadi semua angka di sini hanya demo dan harus tampil berlabel demo.
 */

export const demoSnapshot = {
  dateLabel: "Hari ini, 24 Sep 2026",
  statusAt: "14.42 WIB",
  badge: "Data demo · 24 September 2026, 14.42 WIB",
};

export const demoUser = {
  name: "Owner Demo",
  role: "Owner",
  email: "owner@flowops.local",
};

export type MetricTone = "default" | "critical" | "attention" | "done";

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  tone: MetricTone;
  tag?: string;
  footer: string;
  /** Hanya metrik yang membuka antrean yang punya tautan. */
  linksToQueue: boolean;
  footerAside?: string;
}

export const metrics: DashboardMetric[] = [
  {
    id: "active",
    label: "Exception Aktif",
    value: 22,
    tone: "default",
    footer: "Total pesanan berkendala",
    linksToQueue: true,
  },
  {
    id: "critical",
    label: "Kritis",
    value: 8,
    tone: "critical",
    tag: "Perlu segera",
    footer: "Batas kirim < 1 jam / komplain",
    linksToQueue: true,
  },
  {
    id: "unassigned",
    label: "Belum Ditugaskan",
    value: 4,
    tone: "attention",
    tag: "Perlu PIC",
    footer: "Menunggu tugas Owner",
    linksToQueue: true,
  },
  {
    id: "done",
    label: "Diselesaikan",
    value: 23,
    tone: "done",
    tag: "Hari Ini",
    footer: "Ditangani tim operasional",
    footerAside: "Target harian tercapai",
    linksToQueue: false,
  },
];

export type DeadlineTone = "critical" | "warning" | "neutral";
export type DeadlineIcon = "alarm" | "clock" | "hourglass" | "sync";
export type HandlingStatus = "in_progress" | "not_started";

export interface UrgentOrder {
  id: string;
  issue: string;
  channel: string;
  priority: "critical" | "normal";
  deadline: { label: string; tone: DeadlineTone; icon: DeadlineIcon };
  assignee: { name: string; initials: string } | null;
  handling: HandlingStatus;
}

export const urgentOrders: UrgentOrder[] = [
  {
    id: "ORD-24091",
    issue: "Belum siap dikirim",
    channel: "Tokopedia",
    priority: "critical",
    deadline: { label: "Sisa 18 menit (Tenggat 15.00 WIB)", tone: "critical", icon: "alarm" },
    assignee: { name: "Rafif Raihan", initials: "RR" },
    handling: "in_progress",
  },
  {
    id: "ORD-24088",
    issue: "Pengajuan pembatalan pembeli",
    channel: "Shopee",
    priority: "normal",
    deadline: { label: "— (Perlu ditinjau)", tone: "neutral", icon: "hourglass" },
    assignee: null,
    handling: "not_started",
  },
  {
    id: "ORD-24071",
    issue: "Komplain: 1 dari 2 barang belum diterima",
    channel: "TikTok Shop",
    priority: "critical",
    deadline: { label: "Sisa 48 menit (Target internal 15.30 WIB)", tone: "warning", icon: "clock" },
    assignee: { name: "Hendra Kurnia", initials: "HK" },
    handling: "in_progress",
  },
  {
    id: "ORD-24065",
    issue: "Resi tidak bergerak > 24 jam",
    channel: "Lazada",
    priority: "normal",
    deadline: { label: "1 jam 18 menit lagi", tone: "neutral", icon: "clock" },
    assignee: { name: "Rafif Raihan", initials: "RR" },
    handling: "in_progress",
  },
  {
    id: "ORD-24059",
    issue: "Permintaan ubah alamat penerima",
    channel: "Tokopedia",
    priority: "normal",
    deadline: { label: "Menunggu konfirmasi pembeli", tone: "neutral", icon: "sync" },
    assignee: { name: "Hendra Kurnia", initials: "HK" },
    handling: "in_progress",
  },
];
