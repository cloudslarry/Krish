"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  Clock3,
  LogOut,
  PlayCircle,
  Recycle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react"

import { backendUrl } from "@/lib/backend"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STORAGE_AUTH_KEY = "citizenAuth"
const COMPLAINT_STATUS_SYNC_KEY = "complaintStatusSync"
const WORKER_TASKS_STORAGE_KEY = "workerPortalTasks"

type AuthUser = {
  _id?: string
  id?: string
  name?: string
  email?: string
  role?: string
}

type TaskStatus = "Pending" | "Accepted" | "In Progress" | "Completed"
type TaskPriority = "Low" | "Medium" | "High" | "Critical"

type Task = {
  id: string
  title: string
  description: string
  assignedDate: string
  binId: string
  location: string
  wasteType: string
  priority: TaskPriority
  status: TaskStatus
  completedDate?: string
  complaintId?: string
}

type NotificationItem = {
  id: string
  title: string
  detail: string
  tone: "positive" | "warning" | "neutral"
}

type TrainingVideo = {
  id: string
  title: string
  embedUrl: string
  category: string
}

const initialTasks: Task[] = []

const initialNotifications: NotificationItem[] = [
  {
    id: "N100",
    title: "New task assigned",
    detail: "A high-priority waste collection task is ready for review.",
    tone: "warning",
  },
  {
    id: "N101",
    title: "Safety alert",
    detail: "Please wear PPE before handling hazardous waste.",
    tone: "neutral",
  },
]

const trainingVideos: TrainingVideo[] = [
  {
    id: "video-1",
    title: "Waste Segregation & Management",
    embedUrl: "https://www.youtube.com/embed/tDQCV7dUacc",
    category: "Segregation",
  },
  {
    id: "video-2",
    title: "Waste Collection & Safety Procedures",
    embedUrl: "https://www.youtube.com/embed/J9EdxXdUe50",
    category: "Safety",
  },
]

export function WorkerPortal() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTasks[0]?.id ?? null)
  const [lastSynced, setLastSynced] = useState("Just now")
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dialogState, setDialogState] = useState({ open: false, title: "", description: "" })

  const loadWorkerTasks = async (forceFetch = false) => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const storedAuth = window.localStorage.getItem(STORAGE_AUTH_KEY)
      if (!storedAuth) {
        router.replace("/login")
        return
      }

      const parsedAuth = JSON.parse(storedAuth) as { user?: AuthUser; accessToken?: string }
      const storedUser = parsedAuth?.user ?? null
      const accessToken = parsedAuth?.accessToken
      const role = String(storedUser?.role ?? "").toLowerCase()

      if (!storedUser || role !== "worker") {
        if (role === "admin") {
          router.replace("/admin")
        } else if (role === "citizen") {
          router.replace("/citizen")
        } else {
          router.replace("/login")
        }
        return
      }

      setUser(storedUser)

      if (!accessToken) {
        return
      }

      const storedTasks = window.localStorage.getItem(WORKER_TASKS_STORAGE_KEY)
      let workerTasks: Task[] = []

      try {
        const response = await fetch(`${backendUrl}/api/worker/tasks`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to load tasks")
        }

        workerTasks = (payload?.data ?? []).map((task: any) => ({
          id: task?.id ?? task?._id ?? "",
          title: task?.title ?? "Assigned task",
          description: task?.description ?? "",
          assignedDate: task?.assignedDate ? new Date(task.assignedDate).toLocaleDateString() : "Recently assigned",
          binId: task?.binId ?? "",
          location: task?.location ?? "",
          wasteType: task?.wasteType ?? "General",
          priority: (task?.priority as TaskPriority) ?? "Medium",
          status: (task?.status as TaskStatus) ?? "Pending",
          completedDate: task?.completedDate ? new Date(task.completedDate).toLocaleDateString() : undefined,
        }))
      } catch {
        if (storedTasks) {
          try {
            workerTasks = JSON.parse(storedTasks) as Task[]
          } catch {
            workerTasks = []
          }
        }
      }

      if (workerTasks.length) {
        window.localStorage.setItem(WORKER_TASKS_STORAGE_KEY, JSON.stringify(workerTasks))
      }

      setTasks(workerTasks)
      setSelectedTaskId(workerTasks[0]?.id ?? null)
    } catch {
      window.localStorage.removeItem(STORAGE_AUTH_KEY)
      router.replace("/login")
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(WORKER_TASKS_STORAGE_KEY)
    }
    void loadWorkerTasks()
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const timer = window.setInterval(() => {
      setIsRefreshing(true)
      setLastSynced(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))
      setNotifications((previous): NotificationItem[] => {
        const syncNotification: NotificationItem = {
          id: `sync-${Date.now()}`,
          title: "Portal refreshed",
          detail: "Assigned tasks and alerts were synced automatically.",
          tone: "neutral",
        }

        return [syncNotification, ...previous].slice(0, 6)
      })

      window.setTimeout(() => setIsRefreshing(false), 800)
    }, 20000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleWorkerTasksUpdated = async (event: StorageEvent | Event) => {
      if (event instanceof StorageEvent) {
        if (event.key !== WORKER_TASKS_STORAGE_KEY && event.key !== "workerTasksUpdatedAt") return
      }

      await loadWorkerTasks(true)
    }

    window.addEventListener("storage", handleWorkerTasksUpdated)
    window.addEventListener("worker-tasks-updated", handleWorkerTasksUpdated)

    return () => {
      window.removeEventListener("storage", handleWorkerTasksUpdated)
      window.removeEventListener("worker-tasks-updated", handleWorkerTasksUpdated)
    }
  }, [])

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null,
    [selectedTaskId, tasks],
  )

  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "Completed").length, [tasks])
  const completionPercentage = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
  const performanceScore = Math.min(100, Math.round(completedTasks * 20 + Math.min(completedTasks, 2) * 5 + (completedTasks >= 1 ? 5 : 0)))
  const performanceLabel =
    performanceScore >= 90
      ? "Excellent"
      : performanceScore >= 75
        ? "Good"
        : performanceScore >= 50
          ? "Average"
          : "Needs Improvement"

  const persistComplaintStatus = (complaintId: string, nextStatus: TaskStatus) => {
    if (typeof window === "undefined" || !complaintId) return

    const storedEntries = window.localStorage.getItem(COMPLAINT_STATUS_SYNC_KEY)
    const existingEntries = storedEntries ? (JSON.parse(storedEntries) as Array<{ complaintId: string; adminStatus: string; citizenStatus: string }>) : []

    const nextEntries = existingEntries.filter((entry) => entry.complaintId !== complaintId)
    nextEntries.push({
      complaintId,
      adminStatus: nextStatus === "Completed" ? "Complete" : nextStatus === "In Progress" ? "Assigned" : nextStatus,
      citizenStatus: nextStatus === "Completed" ? "Resolved" : "Pending",
    })

    window.localStorage.setItem(COMPLAINT_STATUS_SYNC_KEY, JSON.stringify(nextEntries))
    window.dispatchEvent(new Event("complaint-status-changed"))
  }

  const persistWorkerTasks = (nextTasks: Task[]) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(WORKER_TASKS_STORAGE_KEY, JSON.stringify(nextTasks))
  }

  const handleTaskAction = async (taskId: string, nextStatus: TaskStatus) => {
    if (typeof window === "undefined") {
      return
    }

    const taskToUpdate = tasks.find((task) => task.id === taskId)
    const taskTitle = taskToUpdate?.title ?? "Task"

    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: nextStatus,
            completedDate: nextStatus === "Completed" ? new Date().toLocaleDateString() : task.completedDate,
          }
        : task,
    )

    setTasks(updatedTasks)
    persistWorkerTasks(updatedTasks)

    if (taskToUpdate?.complaintId) {
      persistComplaintStatus(taskToUpdate.complaintId, nextStatus)
    }

    if (nextStatus === "In Progress") {
      setDialogState({
        open: true,
        title: "Task started",
        description: "This task is now in progress. Please mark it complete when finished.",
      })
    } else if (nextStatus === "Completed") {
      setDialogState({
        open: true,
        title: "Task completed",
        description: "Great work. The task has been marked complete and the complaint status has been updated.",
      })
    }

    setNotifications((previous): NotificationItem[] => {
      const taskNotification: NotificationItem = {
        id: `task-${Date.now()}`,
        title: `${taskTitle} ${nextStatus === "Completed" ? "completed" : nextStatus === "In Progress" ? "started" : "updated"}`,
        detail: `${taskTitle} was marked as ${nextStatus}.`,
        tone: nextStatus === "Completed" ? "positive" : "warning",
      }

      return [taskNotification, ...previous].slice(0, 6)
    })

    try {
      const storedAuth = window.localStorage.getItem(STORAGE_AUTH_KEY)
      const parsedAuth = storedAuth ? JSON.parse(storedAuth) as { accessToken?: string } : null
      const accessToken = parsedAuth?.accessToken

      if (!accessToken) {
        return
      }

      await fetch(`${backendUrl}/api/worker/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      })
    } catch {
      // Keep the local update and show the confirmation dialog even if the API call fails.
    }
  }

  const resetDemo = () => {
    setTasks(initialTasks)
    setNotifications(initialNotifications)
    setSelectedTaskId(initialTasks[0]?.id ?? null)
    setLastSynced("Reset")
  }

  const logout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_AUTH_KEY)
    }
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_40%),linear-gradient(135deg,_#020617,_#0f172a)] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <Dialog open={dialogState.open} onOpenChange={(open) => setDialogState((previous) => ({ ...previous, open }))}>
        <DialogContent className="border border-emerald-500/20 bg-slate-900 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">{dialogState.title}</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">{dialogState.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDialogState((previous) => ({ ...previous, open: false }))}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-emerald-500/20 bg-slate-950/80 p-5 shadow-2xl shadow-emerald-950/40 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                <Recycle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-wide">Waste to Wealth Revolution</p>
                <p className="text-sm text-slate-400">Community-led waste management & civic action</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-slate-400">Logged in as</p>
                <p className="font-semibold">{user?.name ?? "Worker"}</p>
                <p className="text-sm text-emerald-300">{user?.id ?? "WKR009"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDemo} className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset Demo
                </Button>
                <Button variant="outline" onClick={logout} className="border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white">Training videos</CardTitle>
                  <CardDescription className="text-slate-400">Watch required modules and refresh your collection workflow.</CardDescription>
                </div>
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">Live</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {trainingVideos.map((video) => (
                <div key={video.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{video.title}</p>
                      <p className="text-sm text-slate-400">{video.category}</p>
                    </div>
                    <PlayCircle className="h-5 w-5 text-emerald-300" />
                  </div>
                  {videoErrors[video.id] ? (
                    <div className="flex h-48 items-center justify-center bg-slate-950/80 text-sm text-slate-400">Video unavailable</div>
                  ) : (
                    <iframe
                      className="aspect-video w-full"
                      src={video.embedUrl}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onError={() => setVideoErrors((previous) => ({ ...previous, [video.id]: true }))}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
            <CardHeader>
              <CardTitle className="text-xl text-white">Performance overview</CardTitle>
              <CardDescription className="text-slate-400">Track task completion and daily performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Worker</p>
                <p className="text-lg font-semibold text-white">{user?.name ?? "Patel Krrish"}</p>
                <p className="text-sm text-emerald-300">Worker ID: {user?.id ?? "WKR009"}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-400">Tasks completed</p>
                  <p className="text-2xl font-semibold text-white">{completedTasks}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-400">Performance score</p>
                  <p className="text-2xl font-semibold text-emerald-300">{performanceScore}%</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Completion percentage</span>
                  <span className="font-semibold text-white">{completionPercentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completionPercentage}%` }} />
                </div>
                <p className="mt-3 text-sm text-emerald-300">{performanceLabel}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-white">Assigned tasks</CardTitle>
                  <CardDescription className="text-slate-400">Accept, start, and complete your assignments from the admin team.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  <span>{isRefreshing ? "Refreshing..." : `Last synced ${lastSynced}`}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No tasks assigned yet.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{task.title}</p>
                        <p className="text-sm text-slate-400">{task.id} • {task.binId}</p>
                      </div>
                      <Badge
                        className={
                          task.status === "Completed"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : task.status === "In Progress"
                              ? "border-sky-500/20 bg-sky-500/10 text-sky-200"
                              : task.status === "Accepted"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                                : "border-slate-700 bg-slate-800 text-slate-300"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{task.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>Assigned: {task.assignedDate}</span>
                      <span>Location: {task.location}</span>
                      <span>Waste: {task.wasteType}</span>
                      <span>Priority: {task.priority}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={task.status === "Accepted" || task.status === "In Progress" ? "outline" : "default"}
                        onClick={() => handleTaskAction(task.id, "In Progress")}
                        disabled={task.status !== "Accepted" && task.status !== "Pending"}
                        className="border-slate-700 bg-slate-950/80 text-slate-100 hover:bg-slate-800"
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleTaskAction(task.id, "Completed")}
                        disabled={task.status !== "In Progress"}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        Complete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedTaskId(task.id)} className="text-slate-200 hover:bg-slate-800">
                        View details
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
              <CardHeader>
                <CardTitle className="text-xl text-white">Task details</CardTitle>
                <CardDescription className="text-slate-400">Focus on the active assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTask ? (
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                    <p className="text-lg font-semibold text-white">{selectedTask.title}</p>
                    <p>{selectedTask.description}</p>
                    <div className="grid gap-2 text-sm text-slate-400">
                      <p>Bin ID: {selectedTask.binId}</p>
                      <p>Location: {selectedTask.location}</p>
                      <p>Waste type: {selectedTask.wasteType}</p>
                      <p>Priority: {selectedTask.priority}</p>
                      {selectedTask.completedDate ? <p>Completed: {selectedTask.completedDate}</p> : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Select a task to view more details.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
              <CardHeader>
                <CardTitle className="text-xl text-white">Waste control tips</CardTitle>
                <CardDescription className="text-slate-400">Follow these reminders while on duty.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span>Segregate waste at source: wet, dry, and hazardous.</span>
                </div>
                <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>Report overflowing bins immediately to the admin desk.</span>
                </div>
                <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <Truck className="mt-0.5 h-4 w-4 text-sky-300" />
                  <span>Wear PPE while handling hazardous waste and follow route safety instructions.</span>
                </div>
                <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-violet-300" />
                  <span>Encourage composting and reduce single-use plastics wherever possible.</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
              <CardHeader>
                <CardTitle className="text-xl text-white">Notifications</CardTitle>
                <CardDescription className="text-slate-400">Stay informed about updates and safety alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <Bell className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <div>
                      <p className="font-medium text-white">{notification.title}</p>
                      <p className="text-sm text-slate-400">{notification.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
