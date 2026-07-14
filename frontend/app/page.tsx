"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

type HealthStatus = "checking" | "connected" | "offline"

export default function Home() {
  const [status, setStatus] = useState<HealthStatus>("checking")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"}/api/health`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setStatus(d?.data?.status === "ok" ? "connected" : "offline"))
      .catch(() => setStatus("offline"))
  }, [])

  return (
    <main className="min-h-screen bg-[#030a06] text-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#030a06]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
              <span className="text-sm font-bold text-white">K</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Krish</span>
            <span className="hidden text-sm text-slate-400 sm:block">Smart Waste Management</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live status pill */}
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-700 ${
              status === "connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : status === "offline"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                : "border-slate-500/30 bg-slate-500/10 text-slate-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                status === "connected" ? "bg-emerald-400 animate-pulse" :
                status === "offline" ? "bg-rose-400" : "bg-slate-400 animate-pulse"
              }`} />
              {status === "checking" ? "Connecting…" : status === "connected" ? "System Online" : "Offline"}
            </div>

            <Link
              href="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/hero-city.png"
            alt="Smart city background"
            fill
            className="object-cover opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030a06]/60 via-[#030a06]/40 to-[#030a06]" />
        </div>

        {/* Animated glows */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

        <div className={`relative mx-auto max-w-5xl px-6 text-center transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            India&apos;s smartest waste management platform
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-white">Clean cities,</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
              greener future
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
            Krish connects citizens, sanitation workers, and administrators
            in a single platform. Report waste, earn Green Credits, and keep
            your community spotless.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-emerald-500/50"
            >
              Start reporting →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-white backdrop-blur transition-all hover:bg-white/10"
            >
              Sign in to dashboard
            </Link>
          </div>

          {/* Mini stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { label: "Complaints Resolved", value: "12,400+" },
              { label: "Active Workers", value: "340+" },
              { label: "Green Credits Awarded", value: "2.4M+" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur">
                <div className="text-2xl font-bold text-emerald-400 sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-slate-400 sm:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-400">Platform</p>
            <h2 className="text-3xl font-bold sm:text-4xl">One platform, three roles</h2>
            <p className="mt-4 text-slate-400">Everything your city needs in one integrated system.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                emoji: "🏙️",
                role: "Citizen",
                color: "from-emerald-500/20 to-teal-500/10",
                border: "border-emerald-500/20",
                link: "/signup",
                cta: "Join as citizen",
                features: [
                  "Submit waste complaints with photos",
                  "Track complaint status in real time",
                  "Earn Green Credits per report",
                  "Redeem credits for eco rewards",
                  "Waste sorting education guide",
                ],
              },
              {
                emoji: "🚛",
                role: "Worker",
                color: "from-blue-500/20 to-indigo-500/10",
                border: "border-blue-500/20",
                link: "/login",
                cta: "Worker login",
                features: [
                  "View assigned complaint tasks",
                  "Accept and update task status",
                  "Track collections by area",
                  "Receive real-time notifications",
                  "Access training resources",
                ],
              },
              {
                emoji: "⚙️",
                role: "Admin",
                color: "from-violet-500/20 to-purple-500/10",
                border: "border-violet-500/20",
                link: "/login",
                cta: "Admin login",
                features: [
                  "Full complaint management dashboard",
                  "Assign tasks to available workers",
                  "Monitor bin fill levels citywide",
                  "Manage citizen & worker accounts",
                  "Analytics and performance reports",
                ],
              },
            ].map((card) => (
              <div
                key={card.role}
                className={`group relative rounded-3xl border ${card.border} bg-gradient-to-br ${card.color} p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">
                  {card.emoji}
                </div>
                <h3 className="mb-4 text-xl font-bold">{card.role}</h3>
                <ul className="mb-8 space-y-2.5">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={card.link}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
                >
                  {card.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-400">Process</p>
            <h2 className="text-3xl font-bold sm:text-4xl">How Krish works</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-4">
            {[
              { step: "01", title: "Report", desc: "Citizen photographs waste and submits a geotagged complaint with one tap.", icon: "📸" },
              { step: "02", title: "Review", desc: "Admin validates the complaint and dispatches the nearest available worker.", icon: "🔍" },
              { step: "03", title: "Collect", desc: "Worker accepts the task, collects waste, and marks it complete.", icon: "🚛" },
              { step: "04", title: "Reward", desc: "Citizen receives 100 Green Credits redeemable for real eco-rewards.", icon: "🏆" },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < 3 && (
                  <div className="absolute left-full top-8 hidden h-px w-full -translate-y-1/2 border-t border-dashed border-white/10 sm:block" />
                )}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10">
                  {item.icon}
                </div>
                <div className="mb-1 text-xs font-bold tracking-widest text-emerald-500">{item.step}</div>
                <div className="mb-2 font-bold">{item.title}</div>
                <div className="text-sm text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/60 to-teal-900/40 p-12 text-center ring-1 ring-emerald-500/20">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.12),_transparent_70%)]" />
            <h2 className="relative mb-4 text-3xl font-bold sm:text-4xl">Ready to make your city cleaner?</h2>
            <p className="relative mb-8 text-slate-300">Join thousands of citizens already earning Green Credits on Krish.</p>
            <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105"
              >
                Create free account →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-base font-medium text-white transition-all hover:bg-white/10"
              >
                Already have account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600">
              <span className="text-xs font-bold text-white">K</span>
            </div>
            <span className="font-semibold">Krish</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Krish Smart Waste Management. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
