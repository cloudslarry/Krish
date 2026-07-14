"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { backendUrl } from "@/lib/backend"

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthUser = { _id?: string; id?: string; name?: string; email?: string; role?: string }

type TaskStatus = "Pending" | "Accepted" | "In Progress" | "Completed"
type TaskPriority = "Low" | "Medium" | "High" | "Critical"

type Task = {
  id: string
  title: string
  description: string
  location: string
  wasteType: string
  priority: TaskPriority
  status: TaskStatus
  assignedDate: string
  completedDate?: string
  complaintId?: string
}

const STORAGE_AUTH_KEY = "citizenAuth"

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  Medium: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  High: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Critical: "bg-rose-500/15 text-rose-300 border-rose-500/25",
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pending: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  Accepted: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "In Progress": "bg-violet-500/15 text-violet-300 border-violet-500/25",
  Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
}

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  Pending: "Accepted",
  Accepted: "In Progress",
  "In Progress": "Completed",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkerPortal() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [activeTab, setActiveTab] = useState<"tasks" | "completed">("tasks")

  // ── Auth ──
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_AUTH_KEY)
    if (!stored) { router.replace("/login"); return }
    const parsed = JSON.parse(stored) as { user?: AuthUser }
    const authUser = parsed.user ?? null
    if (!authUser || authUser.role?.toLowerCase() !== "worker") {
      router.replace("/login")
      return
    }
    setUser(authUser)
    setIsHydrated(true)
  }, [router])

  useEffect(() => {
    if (!isHydrated) return
    fetchTasks()
  }, [isHydrated])

  const getToken = () => {
    const stored = window.localStorage.getItem(STORAGE_AUTH_KEY)
    return stored ? (JSON.parse(stored) as { accessToken?: string }).accessToken ?? null : null
  }

  const fetchTasks = async () => {
    setIsFetching(true)
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${backendUrl}/api/worker/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const payload = await res.json()
      const list: Task[] = (payload?.data ?? payload ?? []).map((t: Record<string, unknown>) => ({
        id: (t._id ?? t.id ?? "") as string,
        title: (t.title ?? t.description ?? "Task") as string,
        description: (t.description ?? "") as string,
        location: (t.location ?? "") as string,
        wasteType: (t.wasteType ?? "General") as string,
        priority: (t.priority ?? "Medium") as TaskPriority,
        status: (t.status ?? "Pending") as TaskStatus,
        assignedDate: (t.assignedDate ?? t.createdAt ?? new Date().toISOString()) as string,
        completedDate: (t.completedDate ?? undefined) as string | undefined,
        complaintId: (t.complaintId ?? "") as string,
      }))
      setTasks(list)
    } catch { /* ignore */ } finally {
      setIsFetching(false)
    }
  }

  const handleAdvanceStatus = async (task: Task) => {
    const next = NEXT_STATUS[task.status]
    if (!next) return
    setUpdatingId(task.id)
    try {
      const token = getToken()
      const res = await fetch(`${backendUrl}/api/worker/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const p = await res.json()
        throw new Error(p?.message ?? "Update failed")
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: next, completedDate: next === "Completed" ? new Date().toISOString() : t.completedDate }
            : t
        )
      )
      setNotice({ text: `Task marked as "${next}".`, type: "success" })
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Failed to update.", type: "error" })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_AUTH_KEY)
    router.push("/login")
  }

  // ── Derived ──
  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "Completed"), [tasks])
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "Completed"), [tasks])

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030a06] text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Loading worker portal…
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#030a06] text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030a06]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600">
              <span className="text-sm font-bold">W</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Krish Worker</div>
              <div className="text-xs text-slate-500">{user?.name ?? "Field Agent"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTasks}
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
        {/* Welcome + stats */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Hello, {user?.name?.split(" ")[0] ?? "Worker"} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {activeTasks.length} active tasks · {completedTasks.length} completed
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active", val: activeTasks.length, color: "text-blue-400" },
              { label: "Completed", val: completedTasks.length, color: "text-emerald-400" },
              { label: "Total", val: tasks.length, color: "text-white" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/5 bg-white/3 p-1">
          {[
            { key: "tasks", label: "Active Tasks", icon: "⚡", count: activeTasks.length },
            { key: "completed", label: "Completed", icon: "✅", count: completedTasks.length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.icon} {t.label}
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{t.count}</span>
            </button>
          ))}
        </div>

        {/* ═══════ ACTIVE TASKS ═══ */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {activeTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/5 py-24 text-center">
                <div className="text-5xl">✅</div>
                <p className="font-semibold">All caught up!</p>
                <p className="text-sm text-slate-400">No active tasks. Check back after the admin assigns more.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeTasks.map((task) => {
                  const next = NEXT_STATUS[task.status]
                  const isUpdating = updatingId === task.id
                  return (
                    <div key={task.id} className="rounded-3xl border border-white/10 bg-white/3 p-6 transition hover:border-white/15">
                      {/* Priority bar */}
                      <div className={`mb-4 h-1 w-full rounded-full ${
                        task.priority === "Critical" ? "bg-rose-500" :
                        task.priority === "High" ? "bg-amber-500" :
                        task.priority === "Medium" ? "bg-blue-500" : "bg-slate-500"
                      }`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                              {task.status}
                            </span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                          <h3 className="mt-3 font-semibold">{task.title}</h3>
                          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{task.description}</p>
                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">📍 {task.location}</div>
                            <div className="flex items-center gap-1.5">🗑️ {task.wasteType}</div>
                            <div className="flex items-center gap-1.5">📅 Assigned {new Date(task.assignedDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
                          </div>
                        </div>
                      </div>

                      {next && (
                        <button
                          onClick={() => handleAdvanceStatus(task)}
                          disabled={isUpdating}
                          className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          {isUpdating ? "Updating…" : `Mark as "${next}" →`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════ COMPLETED TASKS ═══ */}
        {activeTab === "completed" && (
          <div className="space-y-3">
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/5 py-24 text-center">
                <div className="text-5xl">📋</div>
                <p className="text-slate-400">No completed tasks yet.</p>
              </div>
            ) : (
              completedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">📍 {task.location}</p>
                    {task.completedDate && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Completed {new Date(task.completedDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                    ✓ Done
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
