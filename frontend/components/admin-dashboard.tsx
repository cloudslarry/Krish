"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { backendUrl } from "@/lib/backend"

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthUser = { _id?: string; id?: string; name?: string; email?: string; role?: string }

type Complaint = {
  id: string
  citizenName: string
  complaintType: string
  description: string
  location: string
  status: "Pending" | "Assigned" | "In Progress" | "Resolved"
  createdAt: string
  imagePath?: string
  userId?: string
  name?: string
}

type Worker = {
  id: string
  name: string
  email: string
  status: "Active" | "Busy" | "Offline"
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Assigned: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "In Progress": "bg-violet-500/15 text-violet-300 border-violet-500/25",
  Resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
}

const STORAGE_AUTH_KEY = "citizenAuth"

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"complaints" | "workers" | "stats">("complaints")
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Assign modal
  const [assigningComplaint, setAssigningComplaint] = useState<Complaint | null>(null)
  const [selectedWorker, setSelectedWorker] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)

  // Update status modal
  const [updatingComplaint, setUpdatingComplaint] = useState<Complaint | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)

  // ── Auth ──
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_AUTH_KEY)
    if (!stored) { router.replace("/login"); return }
    const parsed = JSON.parse(stored) as { user?: AuthUser }
    const authUser = parsed.user ?? null
    if (!authUser || authUser.role?.toLowerCase() !== "admin") {
      router.replace("/login")
      return
    }
    setUser(authUser)
    setIsHydrated(true)
  }, [router])

  useEffect(() => {
    if (!isHydrated) return
    fetchAll()
  }, [isHydrated])

  const getToken = () => {
    const stored = window.localStorage.getItem(STORAGE_AUTH_KEY)
    return stored ? (JSON.parse(stored) as { accessToken?: string }).accessToken ?? null : null
  }

  const fetchAll = async () => {
    setIsFetching(true)
    const token = getToken()
    if (!token) { setIsFetching(false); return }
    await Promise.all([fetchComplaints(token), fetchWorkers(token)])
    setIsFetching(false)
  }

  const fetchComplaints = async (token: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/admin/complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const payload = await res.json()
      const list: Complaint[] = (payload?.data ?? payload ?? []).map((c: Record<string, unknown>) => ({
        id: (c._id ?? c.id ?? "") as string,
        citizenName: (c.name ?? c.citizenName ?? "Unknown") as string,
        complaintType: (c.complaintType ?? "General") as string,
        description: (c.description ?? "") as string,
        location: (c.location ?? "") as string,
        status: (c.status ?? "Pending") as Complaint["status"],
        createdAt: (c.submittedAt ?? c.createdAt ?? new Date().toISOString()) as string,
        imagePath: (c.imagePath ?? "") as string,
        userId: (c.userId ?? "") as string,
      }))
      setComplaints(list)
    } catch { /* ignore */ }
  }

  const fetchWorkers = async (token: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/workers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const payload = await res.json()
      const list: Worker[] = (payload?.data ?? payload ?? []).map((w: Record<string, unknown>) => ({
        id: (w._id ?? w.id ?? "") as string,
        name: (w.name ?? "Worker") as string,
        email: (w.email ?? "") as string,
        status: "Active" as const,
      }))
      setWorkers(list)
    } catch { /* ignore */ }
  }

  const handleUpdateStatus = async () => {
    if (!updatingComplaint || !newStatus) return
    setIsUpdating(true)
    try {
      const token = getToken()
      const res = await fetch(`${backendUrl}/api/admin/complaints/${updatingComplaint.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const p = await res.json()
        throw new Error(p?.message ?? "Update failed")
      }
      setComplaints((prev) =>
        prev.map((c) => c.id === updatingComplaint.id ? { ...c, status: newStatus as Complaint["status"] } : c)
      )
      setNotice({ text: `Status updated to ${newStatus}.`, type: "success" })
      setUpdatingComplaint(null)
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Update failed.", type: "error" })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssign = async () => {
    if (!assigningComplaint || !selectedWorker) return
    setIsAssigning(true)
    try {
      const token = getToken()
      const res = await fetch(`${backendUrl}/api/complaints/${assigningComplaint.id}/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: selectedWorker }),
      })
      if (!res.ok) {
        const p = await res.json()
        throw new Error(p?.message ?? "Assignment failed")
      }
      const workerName = workers.find((w) => w.id === selectedWorker)?.name ?? "Worker"
      setComplaints((prev) =>
        prev.map((c) => c.id === assigningComplaint.id ? { ...c, status: "Assigned" as const } : c)
      )
      setNotice({ text: `Assigned to ${workerName} successfully.`, type: "success" })
      setAssigningComplaint(null)
      setSelectedWorker("")
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Assignment failed.", type: "error" })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_AUTH_KEY)
    router.push("/login")
  }

  // ── Derived ──
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((c) => filterStatus === "all" || c.status === filterStatus)
      .filter((c) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          c.description.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.citizenName.toLowerCase().includes(q)
        )
      })
  }, [complaints, filterStatus, search])

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    assigned: complaints.filter((c) => c.status === "Assigned").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  }), [complaints])

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030a06] text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          Loading admin dashboard…
        </div>
      </main>
    )
  }

  const tabs = [
    { key: "complaints", label: "Complaints", icon: "📋", count: complaints.length },
    { key: "workers", label: "Workers", icon: "👷", count: workers.length },
    { key: "stats", label: "Analytics", icon: "📊", count: null },
  ] as const

  return (
    <main className="min-h-screen bg-[#030a06] text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030a06]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-purple-600">
              <span className="text-sm font-bold">A</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Krish Admin</div>
              <div className="text-xs text-slate-500">{user?.name ?? "Administrator"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAll}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              {isFetching ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Notice */}
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Stats row */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total", val: stats.total, color: "text-white" },
            { label: "Pending", val: stats.pending, color: "text-amber-400" },
            { label: "Assigned", val: stats.assigned, color: "text-blue-400" },
            { label: "Resolved", val: stats.resolved, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">{s.label} complaints</p>
              <p className={`mt-2 text-4xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/5 bg-white/3 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.icon} {t.label}
              {t.count !== null && (
                <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════ COMPLAINTS ═══ */}
        {activeTab === "complaints" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search complaints…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0d0a1f] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
              >
                <option value="all">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/5 py-20 text-center">
                <div className="text-5xl">📭</div>
                <p className="text-slate-400">{search || filterStatus !== "all" ? "No complaints match your filter." : "No complaints yet."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-white/5 bg-white/3 p-5 transition hover:border-white/10">
                    <div className="flex items-start gap-4">
                      {c.imagePath && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${backendUrl}${c.imagePath}`}
                          alt="complaint"
                          className="h-20 w-20 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? ""}`}>
                            {c.status}
                          </span>
                          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">{c.complaintType}</span>
                        </div>
                        <p className="mt-2 font-medium">{c.description}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                          <span>📍 {c.location}</span>
                          <span>👤 {c.citizenName}</span>
                          <span>🗓️ {new Date(c.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => { setUpdatingComplaint(c); setNewStatus(c.status) }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                      >
                        Update status
                      </button>
                      {c.status === "Pending" && (
                        <button
                          onClick={() => setAssigningComplaint(c)}
                          className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                        >
                          Assign worker →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ WORKERS ═══ */}
        {activeTab === "workers" && (
          <div className="space-y-4">
            {workers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/5 py-20 text-center">
                <div className="text-5xl">👷</div>
                <p className="text-slate-400">No workers registered yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workers.map((w) => (
                  <div key={w.id} className="rounded-2xl border border-white/10 bg-white/3 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-lg font-bold text-violet-300">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{w.name}</p>
                        <p className="text-xs text-slate-400">{w.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-300">{w.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ STATS ═══ */}
        {activeTab === "stats" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Status breakdown */}
            <div className="rounded-3xl border border-white/10 bg-white/3 p-8">
              <h3 className="mb-6 font-semibold">Complaint breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: "Pending", count: stats.pending, color: "bg-amber-500", total: stats.total },
                  { label: "Assigned", count: stats.assigned, color: "bg-blue-500", total: stats.total },
                  { label: "In Progress", count: complaints.filter((c) => c.status === "In Progress").length, color: "bg-violet-500", total: stats.total },
                  { label: "Resolved", count: stats.resolved, color: "bg-emerald-500", total: stats.total },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-slate-300">{s.label}</span>
                      <span className="font-semibold">{s.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5">
                      <div
                        className={`h-2 rounded-full ${s.color} transition-all duration-700`}
                        style={{ width: s.total ? `${(s.count / s.total) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick numbers */}
            <div className="grid grid-cols-2 gap-4 content-start">
              {[
                { label: "Resolution rate", val: stats.total ? `${Math.round((stats.resolved / stats.total) * 100)}%` : "—", color: "text-emerald-400" },
                { label: "Workers active", val: workers.length, color: "text-blue-400" },
                { label: "Pending action", val: stats.pending, color: "text-amber-400" },
                { label: "Total complaints", val: stats.total, color: "text-white" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ Update Status Modal ══ */}
      {updatingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0a1f] p-8 shadow-2xl">
            <h3 className="mb-1 text-lg font-bold">Update status</h3>
            <p className="mb-5 text-sm text-slate-400 line-clamp-2">{updatingComplaint.description}</p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#170d2e] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
            >
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setUpdatingComplaint(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {isUpdating ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Assign Worker Modal ══ */}
      {assigningComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0a1f] p-8 shadow-2xl">
            <h3 className="mb-1 text-lg font-bold">Assign to worker</h3>
            <p className="mb-5 text-sm text-slate-400 line-clamp-2">{assigningComplaint.description}</p>
            {workers.length === 0 ? (
              <p className="text-sm text-slate-400">No workers available.</p>
            ) : (
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#170d2e] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
              >
                <option value="">Select a worker…</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.email})</option>
                ))}
              </select>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setAssigningComplaint(null); setSelectedWorker("") }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedWorker || isAssigning}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {isAssigning ? "Assigning…" : "Assign →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
