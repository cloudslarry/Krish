"use client"

import { SignupForm } from "@/components/signup-form"
import Link from "next/link"
import Image from "next/image"

export default function SignupPage() {
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
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/60 via-[#030a06]/70 to-[#030a06]" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/15 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
            <span className="text-base font-bold text-white">K</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Krish</span>
        </div>

        {/* Benefit list */}
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300">
            🌱 Join the green revolution
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Start earning<br />
            <span className="bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
              Green Credits today
            </span>
          </h2>
          <ul className="space-y-3">
            {[
              "Submit waste reports with photos",
              "Track complaint resolution in real time",
              "Earn 100 credits per accepted complaint",
              "Redeem for headphones, speakers & more",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © 2026 Krish Smart Waste Management
        </p>
      </div>

      {/* ── Right panel — signup form ── */}
      <div className="flex flex-col items-center justify-center gap-8 p-6 md:p-10">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600">
            <span className="text-sm font-bold text-white">K</span>
          </div>
          <span className="text-lg font-bold">Krish</span>
        </div>

        <div className="w-full max-w-sm">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
