"use client";

import { RotateCw } from "lucide-react";

import { ErrorState } from "@/components/states";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-space-lg">
      <ErrorState
        action={
          <button
            type="button"
            onClick={reset}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-lg text-label-lg text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <RotateCw className="size-4" aria-hidden />
            Coba lagi
          </button>
        }
      />
    </main>
  );
}
