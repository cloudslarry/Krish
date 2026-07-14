"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { backendUrl } from "@/lib/backend"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [role, setRole] = useState("citizen")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirm-password") ?? "")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password,
          role,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to create account")
      }

      setSuccess("Account created! Redirecting to login…")
      setTimeout(() => router.push("/login"), 1200)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Signup failed",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"

  return (
    <form className={`flex flex-col gap-4 ${className ?? ""}`} onSubmit={handleSubmit} {...props}>
      {/* Header */}
      <div className="mb-1 text-center">
        <h1 className="text-2xl font-bold text-white">Create account</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Join Krish and start earning Green Credits
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="name">Full name</label>
        <input id="name" name="name" type="text" placeholder="Alex Morgan" required className={inputClass} />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required className={inputClass} />
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="role">Account type</label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0d1f14] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="citizen">🏙️ Citizen — report waste & earn rewards</option>
          <option value="worker">🚛 Worker — manage collection tasks</option>
          <option value="admin">⚙️ Admin — oversee platform</option>
        </select>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="8+ characters" required className={inputClass} />
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300" htmlFor="confirm-password">Confirm password</label>
        <input id="confirm-password" name="confirm-password" type="password" required className={inputClass} />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Sign in →
        </Link>
      </p>
    </form>
  )
}
