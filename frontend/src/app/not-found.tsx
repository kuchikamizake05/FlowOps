import Link from "next/link";

import { NotFoundState } from "@/components/states";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-space-lg">
      <NotFoundState
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-lg text-label-lg text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            Kembali ke dashboard
          </Link>
        }
      />
    </main>
  );
}
