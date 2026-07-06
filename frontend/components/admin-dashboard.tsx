"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  Building2,
  Filter,
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  Users,
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
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type AuthUser = {
  _id?: string
  id?: string
  name?: string
  email?: string
  role?: string
}

type BinStatus = "Empty" | "Medium" | "Nearly Full" | "Critical"

type ComplaintStatus = "Pending" | "Assigned" | "In Progress" | "Resolved"

type WorkerStatus = "Active" | "Busy" | "Offline"

type Bin = {
  id: string
  area: string
  location: string
  wasteType: "Wet" | "Dry" | "Hazardous" | "Recyclable" | "Mixed"
  fillLevel: number
  status: BinStatus
  lastUpdated: string
  assignedWorker?: string
  position: string
}

type Complaint = {
  id: string
  citizenName: string
  complaintType: string
  description: string
  location: string
  status: ComplaintStatus
  createdAt: string
  imagePath?: string
  imageName?: string
  userId?: string
  name?: string
}

type Worker = {
  id: string
  name: string
  status: WorkerStatus
  completedTasks: number
  target: number
}

type Task = {
  id: string
  title: string
  details: string
  assignedTo: string
  createdAt: string
  status: "Open" | "In Progress" | "Completed"
  workerId?: string
  complaintId?: string
  binId?: string
  location?: string
  wasteType?: string
  priority?: string
}

type NotificationItem = {
  id: string
  title: string
  detail: string
  tone: "positive" | "warning" | "neutral"
}

type AssignFormState = {
  title: string
  details: string
  workerId: string
}

const STORAGE_AUTH_KEY = "citizenAuth"
const WORKER_TASKS_STORAGE_KEY = "workerPortalTasks"
const initialBins: Bin[] = [
  {
    id: "BIN001",
    area: "Sector 7",
    location: "Near Park Gate",
    wasteType: "Wet",
    fillLevel: 100,
    status: "Critical",
    lastUpdated: "2 min ago",
    assignedWorker: "Keval",
    position: "18%",
  },
  {
    id: "BIN002",
    area: "Sector 4",
    location: "Main Market",
    wasteType: "Dry",
    fillLevel: 64,
    status: "Medium",
    lastUpdated: "8 min ago",
    assignedWorker: "Mina",
    position: "54%",
  },
  {
    id: "BIN003",
    area: "Sector 9",
    location: "School Road",
    wasteType: "Hazardous",
    fillLevel: 92,
    status: "Nearly Full",
    lastUpdated: "4 min ago",
    assignedWorker: "Asha",
    position: "74%",
  },
  {
    id: "BIN004",
    area: "Sector 2",
    location: "Community Center",
    wasteType: "Recyclable",
    fillLevel: 24,
    status: "Empty",
    lastUpdated: "12 min ago",
    assignedWorker: undefined,
    position: "34%",
  },
  {
    id: "BIN005",
    area: "Sector 11",
    location: "Bus Depot",
    wasteType: "Mixed",
    fillLevel: 81,
    status: "Nearly Full",
    lastUpdated: "6 min ago",
    assignedWorker: "Rohan",
    position: "82%",
  },
]

const initialComplaints: Complaint[] = [
  {
    id: "CMP001",
    citizenName: "Nisha Rao",
    complaintType: "Overflowing Bin",
    description: "Hazardous waste overflowed near the school entrance after peak hours.",
    location: "Sector 9",
    status: "Pending",
    createdAt: "4 min ago",
  },
  {
    id: "CMP002",
    citizenName: "Arjun Mehta",
    complaintType: "Missed Pickup",
    description: "The scheduled pickup did not arrive for the wet waste collection.",
    location: "Sector 4",
    status: "Assigned",
    createdAt: "18 min ago",
  },
]

const initialWorkers: Worker[] = [
  { id: "WKR001", name: "Keval", status: "Active", completedTasks: 12, target: 20 },
  { id: "WKR002", name: "Mina", status: "Busy", completedTasks: 9, target: 16 },
  { id: "WKR003", name: "Asha", status: "Offline", completedTasks: 6, target: 14 },
]

const initialTasks: Task[] = [
  {
    id: "TSK001",
    title: "Emergency cleanup",
    details: "Critical bin at Sector 7 needs immediate collection.",
    assignedTo: "Keval",
    createdAt: "10 min ago",
    status: "In Progress",
  },
]

const initialNotifications: NotificationItem[] = [
  {
    id: "N001",
    title: "BIN001 reached 100%",
    detail: "Critical bin escalation was triggered at Sector 7.",
    tone: "warning",
  },
  {
    id: "N002",
    title: "Complaint received",
    detail: "A new citizen complaint was logged for Sector 9.",
    tone: "neutral",
  },
]

const initialAssignForm: AssignFormState = {
  title: "",
  details: "",
  workerId: "WKR001",
}

const getStatusStyles = (status: BinStatus | ComplaintStatus | WorkerStatus) => {
  switch (status) {
    case "Critical":
    case "Pending":
    case "Offline":
      return "border-rose-400/30 bg-rose-500/10 text-rose-300"
    case "Nearly Full":
    case "Assigned":
    case "Busy":
      return "border-amber-400/30 bg-amber-500/10 text-amber-300"
    case "Medium":
    case "In Progress":
    case "Active":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
    case "Empty":
    case "Resolved":
      return "border-sky-400/30 bg-sky-500/10 text-sky-300"
    default:
      return "border-slate-400/30 bg-slate-500/10 text-slate-300"
  }
}

const getBinMarkerColor = (status: BinStatus) => {
  switch (status) {
    case "Empty":
      return "bg-emerald-500"
    case "Medium":
      return "bg-amber-400"
    case "Nearly Full":
      return "bg-orange-500"
    case "Critical":
      return "bg-rose-500"
    default:
      return "bg-slate-500"
  }
}

export function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [bins, setBins] = useState<Bin[]>(initialBins)
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints)
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [search, setSearch] = useState("")
  const [selectedBinId, setSelectedBinId] = useState(initialBins[0].id)
  const [assignForm, setAssignForm] = useState<AssignFormState>(initialAssignForm)
  const [assignMessage, setAssignMessage] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false)
  const [complaintForAssignment, setComplaintForAssignment] = useState<Complaint | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncComplaintStatus = () => {
      const storedEntries = window.localStorage.getItem("complaintStatusSync")
      if (!storedEntries) return

      const entries = JSON.parse(storedEntries) as Array<{ complaintId: string; adminStatus: string; citizenStatus: string }>
      setComplaints((previous) =>
        previous.map((complaint) => {
          const matchedEntry = entries.find((entry) => entry.complaintId === complaint.id)
          if (!matchedEntry) return complaint
          return { ...complaint, status: matchedEntry.adminStatus as ComplaintStatus }
        }),
      )
    }

    syncComplaintStatus()
    window.addEventListener("storage", syncComplaintStatus)
    window.addEventListener("complaint-status-changed", syncComplaintStatus)
    return () => {
      window.removeEventListener("storage", syncComplaintStatus)
      window.removeEventListener("complaint-status-changed", syncComplaintStatus)
    }
  }, [])

  const persistWorkerTasks = (nextTasks: Task[]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKER_TASKS_STORAGE_KEY, JSON.stringify(nextTasks))
    }
  }

  const loadDashboardData = async (token?: string) => {
    try {
      const authToken = token ?? window.localStorage.getItem("citizenAuth")
      const parsedAuth = authToken ? JSON.parse(authToken) as { accessToken?: string } : null
      const accessToken = parsedAuth?.accessToken
      if (!accessToken) return

      const response = await fetch(`${backendUrl}/api/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = await response.json()
      if (!response.ok) return

      const adminData = payload?.data ?? payload
      const fetchedComplaints = (adminData?.complaints ?? []).map((item: any) => ({
        id: item?.id ?? item?._id,
        citizenName: item?.citizenName ?? item?.name ?? "Citizen",
        complaintType: item?.complaintType ?? "General",
        description: item?.description ?? "",
        location: item?.location ?? "",
        status: (item?.status as ComplaintStatus) ?? "Pending",
        createdAt: item?.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently received",
        imagePath: item?.imagePath,
        imageName: item?.imageName,
        userId: item?.userId,
        name: item?.name,
      }))

      const mappedWorkers = (adminData?.workers ?? []).map((worker: any) => ({
        id: worker?._id ?? worker?.id ?? "WKR000",
        name: worker?.name ?? "Worker",
        status: "Active",
        completedTasks: 0,
        target: 20,
      }))

      setComplaints(fetchedComplaints)
      setWorkers(mappedWorkers)
      setAssignForm((previous) => ({
        ...previous,
        workerId: previous.workerId && mappedWorkers.some((worker: Worker) => worker.id === previous.workerId)
          ? previous.workerId
          : mappedWorkers[0]?.id ?? previous.workerId,
      }))

      const fetchedTasks = (adminData?.tasks ?? []).map((task: any) => ({
        id: task?.id ?? task?._id ?? `TSK${Date.now()}`,
        title: task?.title ?? "Task",
        details: task?.description ?? "",
        assignedTo: task?.workerId ? mappedWorkers.find((worker: Worker) => worker.id === task?.workerId)?.name ?? "Worker" : "Unassigned",
        createdAt: task?.assignedDate ? new Date(task.assignedDate).toLocaleString() : "Just now",
        status: (task?.status as Task["status"]) ?? "In Progress",
        workerId: task?.workerId,
        complaintId: task?.complaintId,
        binId: task?.binId,
        location: task?.location,
        wasteType: task?.wasteType,
        priority: task?.priority,
      }))

      setTasks(fetchedTasks)
    } catch {
      // Keep the local demo data if the API is unavailable.
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedAuth = window.localStorage.getItem(STORAGE_AUTH_KEY)
    if (!storedAuth) {
      router.replace("/login")
      return
    }

    const parsedAuth = JSON.parse(storedAuth) as { user?: AuthUser }
    const authUser = parsedAuth.user ?? null
    if (authUser?.role?.toLowerCase() !== "admin") {
      router.replace("/login")
      return
    }

    setUser(authUser)
    setIsHydrated(true)
    void loadDashboardData(storedAuth)
  }, [router])

  const adminId = useMemo(() => {
    const rawId = user?._id ?? user?.id ?? ""
    return rawId ? `ADM${String(rawId).slice(-3).toUpperCase()}` : "ADM001"
  }, [user])

  const filteredBins = useMemo(() => {
    const query = search.trim().toLowerCase()
    return bins.filter((bin) => {
      if (!query) return true
      return (
        bin.id.toLowerCase().includes(query) ||
        bin.area.toLowerCase().includes(query) ||
        bin.location.toLowerCase().includes(query) ||
        bin.assignedWorker?.toLowerCase().includes(query)
      )
    })
  }, [bins, search])

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()
    return complaints.filter((complaint) => {
      if (!query) return true
      return (
        complaint.id.toLowerCase().includes(query) ||
        complaint.citizenName.toLowerCase().includes(query) ||
        complaint.location.toLowerCase().includes(query) ||
        complaint.complaintType.toLowerCase().includes(query)
      )
    })
  }, [complaints, search])

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return workers.filter((worker) => {
      if (!query) return true
      return (
        worker.id.toLowerCase().includes(query) ||
        worker.name.toLowerCase().includes(query)
      )
    })
  }, [workers, search])

  const totalBins = bins.length
  const openComplaints = complaints.filter((item) => item.status !== "Resolved").length
  const activeWorkers = workers.filter((worker) => worker.status === "Active").length
  const criticalBins = bins.filter((bin) => bin.fillLevel >= 90).length
  const selectedBin = filteredBins.find((bin) => bin.id === selectedBinId) ?? filteredBins[0] ?? bins[0]

  const handleResetDemo = () => {
    setBins(initialBins)
    setTasks(initialTasks)
    setNotifications(initialNotifications)
    setAssignForm(initialAssignForm)
    setSelectedBinId(initialBins[0].id)
    setAssignMessage("Refreshing admin data from the server.")
    void loadDashboardData()
  }

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_AUTH_KEY)
    setUser(null)
    router.replace("/login")
  }

  const handleComplaintAssignment = async (complaint: Complaint, worker: Worker) => {
    try {
      const authToken = window.localStorage.getItem("citizenAuth")
      const parsedAuth = authToken ? JSON.parse(authToken) as { accessToken?: string } : null
      const accessToken = parsedAuth?.accessToken
      if (!accessToken) throw new Error("Missing auth token")

      const response = await fetch(`${backendUrl}/api/worker/complaints/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          complaintId: complaint.id,
          workerId: worker.id,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.message ?? "Unable to assign complaint")

      const newTask: Task = {
        id: payload?.data?.id ?? payload?.data?._id ?? `TSK${Date.now().toString().slice(-4)}`,
        title: complaint.complaintType,
        details: complaint.description,
        assignedTo: worker.name,
        createdAt: "Just now",
        status: "In Progress",
        workerId: worker.id,
        complaintId: complaint.id,
        location: complaint.location,
        priority: "High",
      }

      setTasks((previous) => {
        const nextTasks = [newTask, ...previous]
        persistWorkerTasks(nextTasks)
        return nextTasks
      })
      setWorkers((previous) => previous.map((item) => (item.id === worker.id ? { ...item, status: "Busy" } : item)))
      setComplaints((previous) => previous.map((item) => (item.id === complaint.id ? { ...item, status: "Assigned" } : item)))
      setSelectedComplaintId(complaint.id)
      setAssignMessage(`Complaint ${complaint.id} assigned to ${worker.name}.`)
      const newNotification: NotificationItem = {
        id: `N${Date.now()}`,
        title: `Task assigned to ${worker.name}`,
        detail: `${complaint.complaintType} is now visible in the worker portal.`,
        tone: "positive",
      }
      setNotifications((previous) => [newNotification, ...previous].slice(0, 6))
    } catch (error) {
      setAssignMessage(error instanceof Error ? error.message : "Unable to assign complaint")
    } finally {
      setIsAssignmentDialogOpen(false)
      setComplaintForAssignment(null)
    }
  }

  const handleAssignTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assignForm.title.trim() || !assignForm.details.trim()) {
      setAssignMessage("Please fill in the task title and details.")
      return
    }

    setIsSubmittingTask(true)
    const worker = workers.find((item) => item.id === assignForm.workerId)

    try {
      const authToken = window.localStorage.getItem("citizenAuth")
      const parsedAuth = authToken ? JSON.parse(authToken) as { accessToken?: string } : null
      const accessToken = parsedAuth?.accessToken
      if (!accessToken) throw new Error("Missing auth token")

      const response = await fetch(`${backendUrl}/api/worker/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: assignForm.title.trim(),
          description: assignForm.details.trim(),
          workerId: assignForm.workerId,
          binId: selectedBin?.id ?? "",
          location: selectedBin?.location ?? "",
          wasteType: selectedBin?.wasteType ?? "General",
          priority: "High",
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.message ?? "Task assignment failed")

      const newTask: Task = {
        id: payload?.data?.id ?? payload?.data?._id ?? `TSK${Date.now().toString().slice(-4)}`,
        title: payload?.data?.title ?? assignForm.title.trim(),
        details: payload?.data?.description ?? assignForm.details.trim(),
        assignedTo: worker?.name ?? "Unassigned",
        createdAt: "Just now",
        status: "In Progress",
        workerId: payload?.data?.workerId,
        complaintId: payload?.data?.complaintId,
        binId: payload?.data?.binId,
        location: payload?.data?.location,
        wasteType: payload?.data?.wasteType,
        priority: payload?.data?.priority,
      }

      setTasks((previous) => [newTask, ...previous])
      setWorkers((previous) =>
        previous.map((item) =>
          item.id === assignForm.workerId ? { ...item, status: "Busy" } : item,
        ),
      )
      setComplaints((previous) =>
        previous.map((item) => (item.status === "Pending" ? { ...item, status: "Assigned" } : item)),
      )
      const newNotification: NotificationItem = {
        id: `N${Date.now()}`,
        title: `Task assigned to ${worker?.name ?? "worker"}`,
        detail: `${assignForm.title.trim()} is now live in the dispatch queue.`,
        tone: "positive",
      }
      setNotifications((previous) => [newNotification, ...previous].slice(0, 6))
      setAssignForm(initialAssignForm)
      setAssignMessage("Task assigned successfully and worker status updated.")
    } catch (error) {
      setAssignMessage(error instanceof Error ? error.message : "Unable to assign task")
    } finally {
      setIsSubmittingTask(false)
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-slate-300">
          Preparing admin dashboard...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_30%),linear-gradient(135deg,#020617_0%,#111827_100%)] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <Dialog open={isAssignmentDialogOpen} onOpenChange={(open) => {
        setIsAssignmentDialogOpen(open)
        if (!open) {
          setComplaintForAssignment(null)
        }
      }}>
        <DialogContent className="border border-cyan-400/20 bg-slate-900 text-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Assign complaint to a worker</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Choose a worker for {complaintForAssignment?.id ?? "this complaint"}. The task will appear in the worker portal right away.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {workers.map((worker) => (
              <button
                key={worker.id}
                type="button"
                onClick={() => complaintForAssignment && handleComplaintAssignment(complaintForAssignment, worker)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
              >
                <span>
                  <span className="block font-semibold text-white">{worker.name}</span>
                  <span className="text-xs text-slate-400">{worker.id}</span>
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                  {worker.status}
                </span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur xl:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-300">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                  Waste to Wealth Revolution
                </div>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Community-led waste management and civic action in one view.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleResetDemo} className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Demo
              </Button>
              <Button variant="outline" onClick={handleLogout} className="border-white/10 bg-white/5 text-slate-100">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                <div className="font-medium text-white">{user?.name ?? "Admin"}</div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{adminId}</div>
              </div>
            </div>
          </div>
        </header>

        {assignMessage ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {assignMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Bins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{totalBins}</div>
              <p className="mt-2 text-sm text-slate-400">Across all monitored zones</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Open Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{openComplaints}</div>
              <p className="mt-2 text-sm text-slate-400">Citizen issues awaiting action</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{activeWorkers}</div>
              <p className="mt-2 text-sm text-slate-400">Ready for task allocation</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Critical Bins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-semibold text-white">{criticalBins}</div>
                <Badge className="border-rose-400/30 bg-rose-500/10 text-rose-200">{criticalBins} bins critical</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Live Bin Map</CardTitle>
                  <CardDescription className="text-slate-400">
                    Toggle markers to inspect fill levels and assigned crews.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-100">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative h-72 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.25),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_100%)]">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
                  {bins.map((bin) => (
                    <button
                      key={bin.id}
                      type="button"
                      onClick={() => setSelectedBinId(bin.id)}
                      className={cn(
                        "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-semibold text-white shadow-lg transition",
                        selectedBinId === bin.id ? "scale-110 border-white" : "border-transparent",
                        getBinMarkerColor(bin.status),
                      )}
                      style={{ left: bin.position, top: "55%" }}
                    >
                      {bin.id.replace("BIN", "")}
                    </button>
                  ))}
                </div>

                {selectedBin ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{selectedBin.id}</p>
                        <p className="text-sm text-slate-400">{selectedBin.location}</p>
                      </div>
                      <Badge className={cn("border", getStatusStyles(selectedBin.status))}>{selectedBin.status}</Badge>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Waste Type</p>
                        <p className="mt-1 text-sm text-slate-200">{selectedBin.wasteType}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Fill Percentage</p>
                        <p className="mt-1 text-sm text-slate-200">{selectedBin.fillLevel}%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assigned Worker</p>
                        <p className="mt-1 text-sm text-slate-200">{selectedBin.assignedWorker ?? "Unassigned"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-xl">Bin Status Panel</CardTitle>
                <CardDescription className="text-slate-400">
                  Review fill levels, waste type, and maintenance status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredBins.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                    No bins match the current search.
                  </div>
                ) : (
                  filteredBins.map((bin) => (
                    <div key={bin.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{bin.id}</p>
                            <Badge className={cn("border", getStatusStyles(bin.status))}>{bin.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-400">{bin.area} • {bin.location}</p>
                        </div>
                        <Badge variant="secondary">{bin.wasteType}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                        <span>{bin.fillLevel}% Full</span>
                        <span>Updated {bin.lastUpdated}</span>
                      </div>
                      <Progress value={bin.fillLevel} className="mt-2 h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search bins, workers, or complaints"
                    className="pl-9"
                  />
                </div>
                <CardTitle className="mt-3 text-xl">Citizen Complaints</CardTitle>
                <CardDescription className="text-slate-400">
                  Track open issues and follow-up state.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredComplaints.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                    No complaints yet.
                  </div>
                ) : (
                  filteredComplaints.map((complaint) => (
                    <div key={complaint.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{complaint.id}</p>
                          <p className="text-sm text-slate-400">{complaint.citizenName}</p>
                        </div>
                        <Badge className={cn("border", getStatusStyles(complaint.status))}>{complaint.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{complaint.description}</p>
                      {complaint.imagePath ? (
                        <img
                          src={`${backendUrl}${complaint.imagePath}`}
                          alt={complaint.imageName ?? "Complaint evidence"}
                          className="mt-3 h-32 w-full rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                        <span>{complaint.location}</span>
                        <span>{complaint.createdAt}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
                          onClick={() => {
                            setComplaintForAssignment(complaint)
                            setIsAssignmentDialogOpen(true)
                          }}
                        >
                          Assign complaint to worker
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-xl">Assign Task</CardTitle>
                <CardDescription className="text-slate-400">
                  Create dispatch work for the active crews.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleAssignTask}>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300" htmlFor="task-title">
                      Task title
                    </label>
                    <Input
                      id="task-title"
                      value={assignForm.title}
                      onChange={(event) => setAssignForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Empty BIN003"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300" htmlFor="task-details">
                      Details
                    </label>
                    <textarea
                      id="task-details"
                      value={assignForm.details}
                      onChange={(event) => setAssignForm((prev) => ({ ...prev, details: event.target.value }))}
                      className="min-h-24 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      placeholder="Hazardous waste bin has reached 100%"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300" htmlFor="task-worker">
                      Assign to
                    </label>
                    <select
                      id="task-worker"
                      value={assignForm.workerId}
                      onChange={(event) => setAssignForm((prev) => ({ ...prev, workerId: event.target.value }))}
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    >
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name} ({worker.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmittingTask}>
                    {isSubmittingTask ? "Assigning task..." : "Assign task"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-xl">Worker Performance</CardTitle>
                <CardDescription className="text-slate-400">
                  Monitor completion rate and live status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredWorkers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                    No workers match the current search.
                  </div>
                ) : (
                  filteredWorkers.map((worker) => (
                    <div key={worker.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{worker.name}</p>
                          <p className="text-sm text-slate-400">{worker.id}</p>
                        </div>
                        <Badge className={cn("border", getStatusStyles(worker.status))}>{worker.status}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                        <span>Completed {worker.completedTasks} tasks</span>
                        <span>{Math.round((worker.completedTasks / worker.target) * 100)}%</span>
                      </div>
                      <Progress value={(worker.completedTasks / worker.target) * 100} className="mt-2 h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-xl">Notifications</CardTitle>
                <CardDescription className="text-slate-400">
                  Alerts that keep the admin console actionable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2 text-cyan-300">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{notification.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{notification.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
