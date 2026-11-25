"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { adminLogin } from "@/lib/api";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLogin(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[#F6F7F9] px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="" width={36} height={36} />
          <span className="text-[20px] font-semibold tracking-[-0.03em] text-[#172033]">Clothify</span>
        </div>

        <section className="rounded-2xl border border-[#E5E8ED] bg-white px-6 py-8 sm:px-9 sm:py-10">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8993A2]">ADMINISTRATION</p>
            <h1 className="mt-2 text-[25px] font-semibold tracking-[-0.035em] text-[#172033]">
              Welcome back
            </h1>
            <p className="mt-2 text-[13px] leading-5 text-[#667085]">
              Sign in to manage Clothify operations.
            </p>
          </div>

          <form method="post" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-[13px] text-red-700">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="email" className="mb-2 block text-[13px] font-medium text-[#344054]">Email or phone</label>
              <input
                id="email"
                name="username"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email or phone number"
                required
                disabled={!ready}
                className="h-11 w-full rounded-lg border border-[#DDE1E7] bg-white px-3.5 text-sm text-[#172033] outline-none placeholder:text-[#A0A7B3] focus:border-[#98A2B3] focus:ring-0"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-[#344054]">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={!ready}
                  className="h-11 w-full rounded-lg border border-[#DDE1E7] bg-white py-2 pl-3.5 pr-11 text-sm text-[#172033] outline-none placeholder:text-[#A0A7B3] focus:border-[#98A2B3] focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-[#929AA7] hover:text-[#344054]"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !ready}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-[#071D59] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#102D72] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
        <p className="mt-6 text-center text-[12px] text-[#98A1AE]">
          Secure access for authorised Clothify staff
        </p>
      </div>
    </main>
  );
}
