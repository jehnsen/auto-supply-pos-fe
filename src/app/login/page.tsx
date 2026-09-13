"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, CircleDot, ShieldCheck, Wrench } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button, Field, Input } from "@/components/ui";
import { ImmerSonsMark } from "@/components/ImmerSonsMark";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const [email, setEmail] = useState("owner@immersons.ph");
  const [password, setPassword] = useState("P@ssword8080");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#1a0505] p-4">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-red-500/20 blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-amber-400/15 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-md border border-white/10 bg-white/[0.03] shadow-2xl shadow-[#000]/40 backdrop-blur-xl md:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#c81e1e] via-[#a41515] to-[#6b0f0f] p-9 md:flex">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <ImmerSonsMark size={40} />
              <div className="leading-tight">
                <span className="block text-sm font-semibold tracking-tight text-white">ImmerSons AutoMoto</span>
                <span className="block text-[11px] text-red-100/70">Auto Care Services</span>
              </div>
            </div>

            <h2 className="mt-10 text-2xl font-semibold leading-snug tracking-tight text-white">
              Run the counter
              <br />
              and the bays, as one.
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-red-100/80">
              Parts over the counter, jobs in the bay, and every vehicle accounted for — on one screen.
            </p>
          </div>

          <ul className="relative mt-10 flex flex-col gap-4">
            {[
              { icon: CircleDot, label: "Tires, mags, batteries & parts in real time" },
              { icon: Wrench, label: "Repair jobs with full chain of custody" },
              { icon: ShieldCheck, label: "Secure, role-based access for your team" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-red-50/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-red-100 ring-1 ring-white/15">
                  <Icon size={15} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center bg-card p-8 sm:p-10">
          <div className="mb-6 flex flex-col items-center text-center md:hidden">
            <ImmerSonsMark size={44} className="mb-3" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-1 text-sm text-ink-secondary">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                autoFocus
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>
            )}

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={status === "loading"}>
              <LogIn size={15} />
              {status === "loading" ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-muted">
            Protected access · ImmerSons AutoMoto &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
