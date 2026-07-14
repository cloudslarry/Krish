"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { backendUrl } from "@/lib/backend"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to log in")
      }

      const authPayload = payload?.data ?? payload
      const user = authPayload?.user ?? null
      const role = String(user?.role ?? "").toLowerCase()

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "citizenAuth",
          JSON.stringify({
            user,
            accessToken: authPayload?.accessToken ?? null,
          }),
        )
      }

      if (role === "admin") router.push("/admin")
      else if (role === "worker") router.push("/worker")
      else router.push("/citizen")
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Login failed",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={`flex flex-col gap-5 ${className ?? ""}`} onSubmit={handleSubmit} {...props}>
      {/* Header */}
      <div className="mb-2 text-center">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Sign in to your Krish account
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      {/* Divider */}
      <div className="relative my-1 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-slate-500">New to Krish?</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
          Create one free →
        </Link>
      </p>
    </form>
  )
}
