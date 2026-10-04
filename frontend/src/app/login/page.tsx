import Image from "next/image";

import LoginForm from "@/components/login-form";

export const metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-surface-container-lowest lg:grid-cols-12">
      <section className="relative hidden flex-col justify-between overflow-hidden p-space-xl lg:col-span-6 lg:flex">
        <Image
          src="/images/screen.png"
          alt="Pengelola operasional toko daring sedang bekerja dengan tablet di gudang"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/20" />

        <div className="relative flex items-center gap-space-sm">
          <Image src="/images/logo-mark.svg" alt="" width={36} height={36} />
          <span className="font-headline-md text-headline-md text-white">FlowOps</span>
        </div>

        <div className="relative flex flex-col gap-space-sm pt-10 text-white">
          <h1 className="font-headline-lg text-headline-lg">
            Lihat prioritas. Bagi tugas. Pantau progres.
          </h1>
          <p className="max-w-md font-body-md text-body-md text-white/80">
            Ruang kerja operasional harian untuk sinkronisasi pesanan, koordinasi gudang, dan
            pemenuhan tepat waktu dalam satu alur yang jelas.
          </p>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center p-space-lg lg:col-span-6 lg:p-space-xl">
        <div className="flex w-full max-w-md flex-col gap-space-lg">
          <div className="flex items-center gap-space-sm lg:hidden">
            <Image src="/images/logo-mark.svg" alt="" width={32} height={32} />
            <span className="font-headline-md text-headline-md text-on-surface">FlowOps</span>
          </div>

          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Masuk ke FlowOps</h2>
            <p className="mt-1 font-body-md text-body-md text-secondary">
              Pantau pesanan dan tindak lanjut tim dari satu tempat.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
