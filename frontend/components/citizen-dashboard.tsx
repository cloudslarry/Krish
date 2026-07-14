"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { backendUrl } from "@/lib/backend"

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthUser = {
  _id?: string
  id?: string
  name?: string
  email?: string
  role?: string
}

type Complaint = {
  id: string
  userId: string
  name: string
  contact: string
  location: string
  description: string
  complaintType?: string
  image?: string
  imagePath?: string
  imageName?: string
  status: "Pending" | "Under Review" | "Approved" | "Rejected" | "Resolved" | "Complete"
  creditsAwarded: number
  submittedAt: string
}

type Reward = {
  id: string
  name: string
  cost: number
  stock: number
  emoji: string
}

type FormState = {
  name: string
  contact: string
  location: string
  description: string
  imageFile: File | null
  imageName: string
  imagePreview: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_AUTH_KEY = "citizenAuth"
const STORAGE_DASHBOARD_KEY = "citizenDashboardState"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const wasteGuide = [
  { title: "Wet Waste 🍃", color: "emerald", items: ["Food scraps", "Vegetable peels", "Tea grounds", "Flowers", "Garden waste"] },
  { title: "Dry Waste ♻️", color: "blue", items: ["Paper", "Cardboard", "Plastic bottles", "Glass bottles", "Metal cans"] },
  { title: "E-Waste ⚡", color: "amber", items: ["Phones", "Laptops", "Chargers", "Batteries", "CFL bulbs"] },
]

const cleanupEvent = {
  title: "Neighborhood Cleanup Drive",
  date: "July 20, 2026",
  time: "07:30 AM",
  location: "Green Park Community Center",
  week: "4th Saturday",
}

const rewardCatalog: Reward[] = [
  { id: "boat-headphones", name: "Boat Headphones", cost: 450, stock: 6, emoji: "🎧" },
  { id: "speaker", name: "Bluetooth Speaker", cost: 650, stock: 4, emoji: "🔊" },
  { id: "earbuds", name: "Wireless Earbuds", cost: 550, stock: 8, emoji: "🎵" },
  { id: "power-bank", name: "Power Bank", cost: 700, stock: 3, emoji: "🔋" },
  { id: "smart-watch", name: "Smart Watch", cost: 850, stock: 2, emoji: "⌚" },
]

const initialForm: FormState = {
  name: "", contact: "", location: "", description: "",
  imageFile: null, imageName: "", imagePreview: "",
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  "Under Review": "bg-blue-500/15 text-blue-300 border-blue-500/25",
  Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Rejected: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  Resolved: "bg-teal-500/15 text-teal-300 border-teal-500/25",
  Complete: "bg-purple-500/15 text-purple-300 border-purple-500/25",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CitizenDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [credits, setCredits] = useState(0)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "submit" | "history" | "rewards" | "guide">("overview")
  const [isFetchingComplaints, setIsFetchingComplaints] = useState(false)
  const [redemptions, setRedemptions] = useState<{ id: string; name: string; credits: number }[]>([])

  // ── Auth hydration ──
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_AUTH_KEY)
    if (!stored) { setIsHydrated(true); return }
    const parsed = JSON.parse(stored) as { user?: AuthUser }
    const authUser = parsed.user ?? null
    if (!authUser) { setIsHydrated(true); return }
    const role = authUser.role?.toLowerCase()
    if (role === "admin") { window.location.replace("/admin"); return }
    if (role === "worker") { window.location.replace("/worker"); return }
    setUser(authUser)
    // Restore cached dashboard
    const dash = window.localStorage.getItem(STORAGE_DASHBOARD_KEY)
    if (dash) {
      const d = JSON.parse(dash) as { credits?: number; complaints?: Complaint[]; redemptions?: { id: string; name: string; credits: number }[] }
      setCredits(d.credits ?? 0)
      setComplaints(d.complaints ?? [])
      setRedemptions(d.redemptions ?? [])
    }
    setIsHydrated(true)
  }, [])

  // ── Fetch fresh data from API ──
  useEffect(() => {
    if (!isHydrated || !user) return
    const token = getToken()
    if (!token) return
    fetchComplaints(token)
    fetchDashboard(token)
  }, [isHydrated, user])

  // ── Persist dashboard state ──
  useEffect(() => {
    if (!isHydrated) return
    window.localStorage.setItem(STORAGE_DASHBOARD_KEY, JSON.stringify({ credits, complaints, redemptions }))
  }, [isHydrated, credits, complaints, redemptions])

  const getToken = () => {
    const stored = window.localStorage.getItem(STORAGE_AUTH_KEY)
    if (!stored) return null
    return (JSON.parse(stored) as { accessToken?: string }).accessToken ?? null
  }

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/citizen/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const credits = data?.data?.credits ?? data?.credits
      if (typeof credits === "number") setCredits(credits)
    } catch { /* ignore */ }
  }

  const fetchComplaints = async (token: string) => {
    setIsFetchingComplaints(true)
    try {
      const res = await fetch(`${backendUrl}/api/citizen/complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const payload = await res.json()
      const list: Complaint[] = (payload?.data ?? payload ?? []).map((c: Record<string, unknown>) => ({
        id: (c._id ?? c.id ?? "") as string,
        userId: (c.userId ?? "") as string,
        name: (c.name ?? "") as string,
        contact: (c.contact ?? "") as string,
        location: (c.location ?? "") as string,
        description: (c.description ?? "") as string,
        complaintType: (c.complaintType ?? "General") as string,
        image: c.imagePath ? `${backendUrl}${c.imagePath}` : "",
        imagePath: (c.imagePath ?? "") as string,
        imageName: (c.imageName ?? "") as string,
        status: (c.status ?? "Pending") as Complaint["status"],
        creditsAwarded: (c.creditsAwarded ?? 0) as number,
        submittedAt: (c.submittedAt ?? new Date().toISOString()) as string,
      }))
      setComplaints(list)
    } catch { /* ignore */ } finally {
      setIsFetchingComplaints(false)
    }
  }

  // ── Derived ──
  const userId = useMemo(() => {
    const raw = user?._id ?? user?.id ?? ""
    return raw ? `CIT${raw.slice(-4).toUpperCase()}` : "CIT001"
  }, [user])

  const weeklyCount = useMemo(() =>
    complaints.filter((c) => Date.now() - new Date(c.submittedAt).getTime() < WEEK_MS).length,
    [complaints]
  )

  // ── Handlers ──
  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_AUTH_KEY)
    window.localStorage.removeItem(STORAGE_DASHBOARD_KEY)
    router.push("/login")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setFormErrors((p) => ({ ...p, image: "Only JPG, JPEG, PNG allowed." }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((p) => ({ ...p, image: "Max 5 MB." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      setForm((p) => ({ ...p, imageFile: file, imageName: file.name, imagePreview: reader.result as string }))
    reader.readAsDataURL(file)
    setFormErrors((p) => ({ ...p, image: "" }))
  }

  const handleSubmitComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setNotice(null)
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = "Name is required."
    if (!form.contact.trim()) errors.contact = "Contact is required."
    if (!form.location.trim()) errors.location = "Location is required."
    if (!form.description.trim()) errors.description = "Description is required."
    if (!form.imageFile) errors.image = "Please upload an image."
    if (weeklyCount >= 1) errors.description = "Only 1 complaint per week allowed."
    if (Object.keys(errors).length) { setFormErrors(errors); return }

    setIsSubmitting(true)
    try {
      const token = getToken()
      if (!token) throw new Error("Please sign in to submit a complaint.")

      const fd = new FormData()
      fd.append("name", form.name.trim())
      fd.append("contact", form.contact.trim())
      fd.append("location", form.location.trim())
      fd.append("description", form.description.trim())
      fd.append("complaintType", "General")
      fd.append("image", form.imageFile!)

      const res = await fetch(`${backendUrl}/api/complaints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.message ?? "Failed to submit.")

      const c = payload?.data ?? payload
      const newComplaint: Complaint = {
        id: c._id ?? c.id ?? `local-${Date.now()}`,
        userId: c.userId ?? user?._id ?? user?.id ?? "",
        name: c.name ?? form.name,
        contact: c.contact ?? form.contact,
        location: c.location ?? form.location,
        description: c.description ?? form.description,
        complaintType: c.complaintType ?? "General",
        image: c.imagePath ? `${backendUrl}${c.imagePath}` : form.imagePreview,
        imagePath: c.imagePath ?? "",
        imageName: c.imageName ?? form.imageName,
        status: c.status ?? "Pending",
        creditsAwarded: c.creditsAwarded ?? 0,
        submittedAt: c.submittedAt ?? new Date().toISOString(),
      }

      setComplaints((p) => [newComplaint, ...p])
      setCredits((p) => p + 100)
      setForm(initialForm)
      setFormErrors({})
      setNotice({ text: "Complaint submitted! +100 Green Credits added.", type: "success" })
      setActiveTab("history")
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Submission failed.", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRedeem = (reward: Reward) => {
    if (credits < reward.cost) {
      setNotice({ text: `Need ${reward.cost} credits to redeem ${reward.name}.`, type: "error" })
      return
    }
    setCredits((p) => p - reward.cost)
    setRedemptions((p) => [{ id: `r-${Date.now()}`, name: reward.name, credits: reward.cost }, ...p])
    setNotice({ text: `${reward.name} redeemed! Processing your delivery.`, type: "success" })
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030a06] text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Loading dashboard…
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030a06] px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <div className="mb-4 text-4xl">🔒</div>
          <h2 className="text-xl font-bold">Sign in required</h2>
          <p className="mt-2 text-sm text-slate-400">You need to log in to access the citizen dashboard.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white"
            >
              Go to login
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Create account
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  const tabs = [
    { key: "overview", label: "Overview", icon: "🏠" },
    { key: "submit", label: "Report", icon: "📸" },
    { key: "history", label: "History", icon: "📋" },
    { key: "rewards", label: "Rewards", icon: "🎁" },
    { key: "guide", label: "Guide", icon: "♻️" },
  ] as const

  return (
    <main className="min-h-screen bg-[#030a06] text-white">
      {/* ── Header ── */}
      <header className="border-b border-white/5 bg-[#030a06]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600">
              <span className="text-sm font-bold">K</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Krish</div>
              <div className="text-xs text-slate-500">Citizen Portal · {userId}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
              <span className="text-sm font-bold text-emerald-400">{credits}</span>
              <span className="text-xs text-emerald-300">credits</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Notice ── */}
      {notice && (
        <div className={`border-b px-6 py-3 text-sm text-center ${
          notice.type === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : "border-rose-500/20 bg-rose-500/10 text-rose-300"
        }`}>
          {notice.text}
          <button onClick={() => setNotice(null)} className="ml-4 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome bar */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Welcome back, {user.name?.split(" ")[0] ?? "Citizen"} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {complaints.length} complaints submitted · {credits} Green Credits
            </p>
          </div>
          <button
            onClick={() => { setActiveTab("submit") }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 sm:mt-0"
          >
            + Submit complaint
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-white/5 bg-white/3 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Credits card */}
            <div className="col-span-full rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/40 to-teal-900/20 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-400">Green Credits</p>
                  <p className="mt-2 text-6xl font-bold text-emerald-300">{credits}</p>
                  <p className="mt-2 text-sm text-slate-400">Earn 100 per complaint · Redeem for rewards</p>
                </div>
                <div className="text-7xl opacity-20">🌱</div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Total complaints", val: complaints.length },
                  { label: "This week", val: weeklyCount },
                  { label: "Resolved", val: complaints.filter((c) => c.status === "Resolved" || c.status === "Complete").length },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="text-2xl font-bold">{s.val}</div>
                    <div className="mt-1 text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent complaints */}
            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/3 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Recent complaints</h3>
                <button onClick={() => setActiveTab("history")} className="text-xs text-emerald-400 hover:underline">
                  View all →
                </button>
              </div>
              {complaints.slice(0, 3).length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No complaints yet.{" "}
                  <button onClick={() => setActiveTab("submit")} className="text-emerald-400 hover:underline">
                    Submit one →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.description}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{c.location}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{new Date(c.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[c.status] ?? "bg-white/5 text-white"}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next cleanup event */}
            <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-900/30 to-emerald-900/20 p-6">
              <h3 className="mb-4 font-semibold">🗓️ Next Cleanup Drive</h3>
              <p className="text-sm font-medium text-teal-300">{cleanupEvent.title}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">📅 <span>{cleanupEvent.date}</span></div>
                <div className="flex items-center gap-2">⏰ <span>{cleanupEvent.time}</span></div>
                <div className="flex items-center gap-2">📍 <span>{cleanupEvent.location}</span></div>
              </div>
              <div className="mt-4 rounded-xl bg-teal-500/10 px-4 py-3 text-xs text-teal-200">
                Attend to earn bonus credits!
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ SUBMIT ═══ */}
        {activeTab === "submit" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-white/10 bg-white/3 p-8">
              <h2 className="mb-1 text-xl font-bold">Submit a complaint</h2>
              <p className="mb-6 text-sm text-slate-400">
                One complaint per week · Only JPG/PNG up to 5 MB · Earns 100 credits
              </p>

              {weeklyCount >= 1 && (
                <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  ⚠️ You&apos;ve already submitted a complaint this week. Come back next week.
                </div>
              )}

              <form onSubmit={handleSubmitComplaint} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { id: "name", label: "Full name", placeholder: "Alex Morgan", type: "text" },
                    { id: "contact", label: "Phone or email", placeholder: "alex@example.com", type: "text" },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor={f.id}>{f.label}</label>
                      <input
                        id={f.id} type={f.type} placeholder={f.placeholder}
                        value={form[f.id as keyof FormState] as string}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, [f.id]: e.target.value }))
                          setFormErrors((p) => ({ ...p, [f.id]: "" }))
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {formErrors[f.id] && <p className="mt-1 text-xs text-rose-400">{formErrors[f.id]}</p>}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="location">Location</label>
                  <input
                    id="location" type="text" placeholder="North Avenue, Block 2"
                    value={form.location}
                    onChange={(e) => { setForm((p) => ({ ...p, location: e.target.value })); setFormErrors((p) => ({ ...p, location: "" })) }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formErrors.location && <p className="mt-1 text-xs text-rose-400">{formErrors.location}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="description">Complaint description</label>
                  <textarea
                    id="description" rows={4} placeholder="Describe the waste issue clearly…"
                    value={form.description}
                    onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setFormErrors((p) => ({ ...p, description: "" })) }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none resize-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formErrors.description && <p className="mt-1 text-xs text-rose-400">{formErrors.description}</p>}
                </div>

                {/* File upload */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Photo evidence</label>
                  <div
                    className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors ${
                      form.imagePreview ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imagePreview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
                    ) : (
                      <>
                        <div className="text-4xl">📸</div>
                        <p className="text-sm text-slate-400">Click to upload · JPG, PNG up to 5 MB</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file" accept=".jpg,.jpeg,.png,image/png,image/jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  {form.imageName && <p className="mt-1.5 text-xs text-slate-400">Selected: {form.imageName}</p>}
                  {formErrors.image && <p className="mt-1 text-xs text-rose-400">{formErrors.image}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || weeklyCount >= 1}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting…" : "Submit complaint (+100 credits)"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ HISTORY ═══ */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Complaint history</h2>
              <button
                onClick={() => { const t = getToken(); if (t) fetchComplaints(t) }}
                disabled={isFetchingComplaints}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                {isFetchingComplaints ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 py-20 text-center">
                <div className="text-5xl">📭</div>
                <p className="text-slate-400">No complaints yet.</p>
                <button onClick={() => setActiveTab("submit")} className="rounded-xl bg-emerald-500/20 px-5 py-2 text-sm text-emerald-300 hover:bg-emerald-500/30">
                  Submit your first complaint →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-white/5 bg-white/3 p-5 transition hover:border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? ""}`}>
                            {c.status}
                          </span>
                          {c.complaintType && (
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">{c.complaintType}</span>
                          )}
                        </div>
                        <p className="mt-2 font-medium">{c.description}</p>
                        <p className="mt-1 text-sm text-slate-400">📍 {c.location}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(c.submittedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
                      </div>
                      {c.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="complaint" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                      )}
                    </div>
                    {c.creditsAwarded > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                        +{c.creditsAwarded} credits awarded
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ REWARDS ═══ */}
        {activeTab === "rewards" && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-6 py-4">
                <p className="text-xs text-emerald-400 uppercase tracking-wider">Your balance</p>
                <p className="text-3xl font-bold text-emerald-300">{credits} <span className="text-sm font-normal">credits</span></p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewardCatalog.map((r) => {
                const canRedeem = credits >= r.cost && r.stock > 0
                return (
                  <div
                    key={r.id}
                    className={`rounded-3xl border p-6 transition ${canRedeem ? "border-white/10 bg-white/3 hover:border-emerald-500/25" : "border-white/5 bg-white/2 opacity-70"}`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">
                        {r.emoji}
                      </div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{r.stock} in stock</span>
                    </div>
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{r.cost} credits</p>
                    {credits < r.cost && (
                      <p className="mt-1 text-xs text-amber-400">Need {r.cost - credits} more credits</p>
                    )}
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canRedeem}
                      className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                        canRedeem
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:brightness-110"
                          : "bg-white/5 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {r.stock < 1 ? "Out of stock" : credits < r.cost ? "Insufficient credits" : "Redeem →"}
                    </button>
                  </div>
                )
              })}
            </div>

            {redemptions.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold">Redemption history</h3>
                <div className="space-y-2">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 px-4 py-3 text-sm">
                      <span>{r.name}</span>
                      <span className="text-slate-400">{r.credits} credits · Processing</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ GUIDE ═══ */}
        {activeTab === "guide" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Waste sorting guide</h2>
              <p className="mt-1 text-sm text-slate-400">Learn how to separate and dispose of waste correctly.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {wasteGuide.map((g) => (
                <div key={g.title} className={`rounded-3xl border border-${g.color}-500/20 bg-${g.color}-500/5 p-6`}>
                  <h3 className={`mb-3 font-bold text-${g.color}-300`}>{g.title}</h3>
                  <ul className="space-y-2">
                    {g.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className={`h-1.5 w-1.5 rounded-full bg-${g.color}-400`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8">
              <h3 className="mb-4 text-lg font-bold text-emerald-300">Did you know?</h3>
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                {[
                  { fact: "1 ton of recycled paper saves 17 trees", icon: "🌳" },
                  { fact: "Glass can be recycled infinitely without losing quality", icon: "♾️" },
                  { fact: "Composting food waste reduces methane emissions by 50%", icon: "🌍" },
                ].map((f) => (
                  <div key={f.fact} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="mb-2 text-2xl">{f.icon}</div>
                    <p className="text-slate-300">{f.fact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
