"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileUp,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TriangleAlert,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** false = halamannya belum dibangun, jadi tidak dapat diklik. */
  ready: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/antrean", label: "Antrean Exception", icon: TriangleAlert, ready: true },
  { href: "/impor", label: "Impor CSV", icon: FileUp, ready: false },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, ready: false },
];

const navItemBase =
  "relative flex items-center justify-between rounded-lg px-space-sm py-2 font-label-lg text-label-lg transition-colors";
const navItemActive =
  "bg-secondary-container font-semibold text-on-surface before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-r before:bg-primary-container before:content-['']";
const navItemIdle = "text-secondary hover:bg-surface-container-low hover:text-on-surface";
const navItemDisabled = "cursor-not-allowed text-secondary/60";

interface AppShellProps {
  user: { name: string; role: string; email: string };
  demoBadge: string;
  children: React.ReactNode;
}

export default function AppShell({ user, demoBadge, children }: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-surface">
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#102238]/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      <aside
        aria-label="Menu utama"
        className={`fixed top-0 left-0 z-50 flex h-full w-56 flex-col justify-between bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col">
          <div className="flex h-16 items-center justify-between px-space-md">
            <div className="flex items-center gap-space-sm">
              <Image src="/images/logo-mark.svg" alt="" width={32} height={32} />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm leading-tight text-on-surface">
                  FlowOps
                </span>
                <span className="font-label-sm text-label-sm leading-none text-secondary">
                  Operasional Seller
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Tutup menu"
              className="rounded p-1 text-secondary hover:text-on-surface lg:hidden"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <p className="px-space-md py-space-sm font-label-sm text-label-sm tracking-wider text-secondary uppercase">
            <span className="px-2">Menu Utama</span>
          </p>

          <nav className="flex flex-col gap-1 px-2">
            {navItems.map(({ href, label, icon: Icon, ready }) => {
              const content = (
                <>
                  <span className="flex items-center gap-space-sm">
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </span>
                  {!ready && (
                    <span className="rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                      Segera
                    </span>
                  )}
                </>
              );

              if (!ready) {
                return (
                  <span key={href} aria-disabled="true" className={`${navItemBase} ${navItemDisabled}`}>
                    {content}
                  </span>
                );
              }

              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setDrawerOpen(false)}
                  className={`${navItemBase} ${active ? navItemActive : navItemIdle}`}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-space-sm">
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
            <Headset className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Pusat Bantuan</span>
              <span className="font-label-sm text-label-sm text-secondary">SLA Respon &lt; 15 mnt</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="fixed top-0 right-0 left-0 z-30 flex h-16 items-center justify-between bg-surface-container-lowest/95 px-space-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md lg:left-56 lg:px-space-xl">
          <div className="flex items-center gap-space-md">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu"
              aria-expanded={drawerOpen}
              className="rounded p-1 text-secondary hover:text-on-surface lg:hidden"
            >
              <Menu className="size-6" aria-hidden />
            </button>
            <span className="hidden items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-label-md text-label-md text-secondary md:inline-flex">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {demoBadge}
            </span>
          </div>

          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="hidden flex-col text-right sm:flex">
                <span className="font-label-lg text-label-lg leading-tight text-on-surface">
                  {user.name}
                </span>
                <span className="font-label-sm text-label-sm leading-none text-secondary">
                  {user.role}
                </span>
              </div>
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary"
                title={user.email}
              >
                <User className="size-4.5 text-on-primary" aria-hidden />
              </div>
            </div>
            {/* Keluar sungguhan (memanggil POST /api/auth/logout) dibuat di langkah sesi. */}
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-label-md text-label-md text-error transition-colors hover:bg-error-container hover:text-on-error-container"
            >
              <LogOut className="size-4" aria-hidden />
              Keluar
            </Link>
          </div>
        </header>

        <main className="px-margin-mobile pt-24 pb-space-xl sm:px-margin">{children}</main>
      </div>
    </div>
  );
}
