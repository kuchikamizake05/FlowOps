"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleAlert, Eye, EyeOff } from "lucide-react";

const inputClass =
  "h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 font-body-md text-body-md text-on-surface shadow-sm transition placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi!");
      return;
    }

    setError(null);
    console.log("Data yang dikirim: ", { email });

    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-error-container p-space-sm font-body-sm text-body-sm text-on-error-container"
        >
          <CircleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email-field" className="font-label-lg text-label-lg text-on-surface">
          Email
        </label>
        <input
          id="email-field"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="example@email.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password-field" className="font-label-lg text-label-lg text-on-surface">
          Kata sandi
        </label>
        <div className="relative flex items-center">
          <input
            id="password-field"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-11`}
            placeholder="••••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute right-2.5 flex rounded p-1 text-secondary transition hover:text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-secondary">
        <BadgeCheck className="size-4 shrink-0 text-tertiary" aria-hidden />
        Akses disesuaikan dengan peran Owner atau Operator.
      </p>

      <button
        type="submit"
        className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-primary font-label-lg text-label-lg text-on-primary shadow-sm transition duration-150 hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary-fixed"
      >
        Masuk
      </button>
    </form>
  );
}
