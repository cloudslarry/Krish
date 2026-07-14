"use client"

import { LoginForm } from "@/components/login-form"
import Link from "next/link"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh bg-[#030a06] text-white lg:grid-cols-2">
      {/* ── Left panel — branding ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <Image
          src="/hero-city.png"
          alt="Smart city"
          fill
          className="object-cover opacity-20"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-[#030a06]/70 to-[#030a06]" />
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
            <span className="text-base font-bold text-white">K</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Krish</span>
        </div>

        {/* Centre quote */}
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Smart Waste Management
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Clean cities,<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              greener future
            </span>
          </h2>
          <p className="max-w-sm text-slate-300 leading-relaxed">
            Report waste, dispatch workers, manage bins — all from a single
            intelligent dashboard.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { label: "Reports", val: "12K+" },
              { label: "Workers", val: "340+" },
              { label: "Credits", val: "2.4M" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-2xl font-bold text-emerald-400">{s.val}</div>
                <div className="mt-1 text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="relative text-xs text-slate-500">
          © 2026 Krish Smart Waste Management
        </p>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex flex-col items-center justify-center gap-8 p-6 md:p-10">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600">
            <span className="text-sm font-bold text-white">K</span>
          </div>
          <span className="text-lg font-bold">Krish</span>
        </div>

        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
