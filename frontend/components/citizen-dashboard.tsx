"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { backendUrl } from "@/lib/backend"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { cn } from "@/lib/utils"

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

type Redemption = {
  id: string
  rewardId: string
  rewardName: string
  creditsUsed: number
  redeemedAt: string
  deliveryStatus: string
}

type Reward = {
  id: string
  name: string
  cost: number
  stock: number
  image: string
}

type FormState = {
  name: string
  contact: string
  location: string
  description: string
  image: string
  imageName: string
  imageFile: File | null
}

const DEFAULT_CREDITS = 0
const STORAGE_AUTH_KEY = "citizenAuth"
const STORAGE_DASHBOARD_KEY = "citizenDashboardState"
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

const wasteCategories = [
  {
    title: "Wet Waste",
    description: "Food scraps and garden waste can be turned into compost or biogas.",
    items: [
      "Food scraps",
      "Vegetable peels",
      "Fruit waste",
      "Leftover food",
      "Tea & coffee grounds",
      "Flowers",
      "Garden waste",
      "Green bin disposal",
      "Compost/Biogas info",
    ],
  },
  {
    title: "Dry Waste",
    description: "Paper, cardboard, glass, and certain plastics should be separated before disposal.",
    items: [
      "Paper",
      "Cardboard",
      "Newspapers",
      "Plastic bottles",
      "Plastic bags",
      "Glass bottles",
      "Metal cans",
      "Blue bin disposal",
      "Clean before disposal",
    ],
  },
  {
    title: "E-Waste",
    description: "Electronics contain toxic metals and should never be thrown in regular bins.",
    items: [
      "Phones",
      "Laptops",
      "Chargers",
      "Batteries",
      "CFL bulbs",
      "Circuit boards",
      "E-waste collection centers",
      "Toxic metal warning",
    ],
  },
]

const cleanupEvent = {
  title: "Neighborhood Cleanup Drive",
  description: "Join residents to remove litter and beautify the park this weekend.",
  location: "Green Park Community Center",
  time: "07:30 AM",
  refreshments: "Water, gloves, and breakfast packets",
  nextDate: "July 20, 2026",
  week: "4th Saturday",
}

const rewardCatalog: Reward[] = [
  {
    id: "boat-headphones",
    name: "Boat Headphones",
    cost: 450,
    stock: 6,
    image: "🎧",
  },
  {
    id: "speaker",
    name: "Bluetooth Speaker",
    cost: 650,
    stock: 4,
    image: "🔊",
  },
  {
    id: "earbuds",
    name: "Wireless Earbuds",
    cost: 550,
    stock: 8,
    image: "🎵",
  },
  {
    id: "power-bank",
    name: "Power Bank",
    cost: 700,
    stock: 3,
    image: "🔋",
  },
  {
    id: "smart-watch",
    name: "Smart Watch",
    cost: 850,
    stock: 2,
    image: "⌚",
  },
]

const initialForm: FormState = {
  name: "",
  contact: "",
  location: "",
  description: "",
  image: "",
  imageName: "",
  imageFile: null,
}

export function CitizenDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [credits, setCredits] = useState(DEFAULT_CREDITS)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncComplaintStatus = () => {
      const storedEntries = window.localStorage.getItem("complaintStatusSync")
      if (!storedEntries) return

      const entries = JSON.parse(storedEntries) as Array<{ complaintId: string; citizenStatus: string }>
      setComplaints((previous) =>
        previous.map((complaint) => {
          const matchedEntry = entries.find((entry) => entry.complaintId === complaint.id)
          if (!matchedEntry) return complaint
          return { ...complaint, status: matchedEntry.citizenStatus as Complaint["status"] }
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

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedAuth = window.localStorage.getItem(STORAGE_AUTH_KEY)
    const storedDashboard = window.localStorage.getItem(STORAGE_DASHBOARD_KEY)

    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth) as { user?: AuthUser }
      const authUser = parsedAuth.user ?? null

      if (authUser?.role && authUser.role.toLowerCase() === "admin") {
        window.location.replace("/admin")
        return
      }

      if (authUser?.role && authUser.role.toLowerCase() !== "citizen") {
        window.localStorage.removeItem(STORAGE_AUTH_KEY)
        window.localStorage.removeItem(STORAGE_DASHBOARD_KEY)
        window.location.replace("/login")
        return
      }

      setUser(authUser)
    }

    if (storedDashboard) {
      const parsedState = JSON.parse(storedDashboard) as {
        credits?: number
        complaints?: Complaint[]
        redemptions?: Redemption[]
      }
      setCredits(parsedState.credits ?? DEFAULT_CREDITS)
      setComplaints(parsedState.complaints ?? [])
      setRedemptions(parsedState.redemptions ?? [])
    }

    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return

    window.localStorage.setItem(
      STORAGE_DASHBOARD_KEY,
      JSON.stringify({ credits, complaints, redemptions }),
    )
  }, [isHydrated, credits, complaints, redemptions])

  const userId = useMemo(() => {
    if (!user) return "CIT001"
    const rawId = user._id ?? user.id ?? ""
    if (rawId) {
      return `CIT${String(rawId).slice(-4).toUpperCase()}`
    }
    return "CIT001"
  }, [user])

  const recentComplaints = useMemo(() => {
    return complaints.slice(0, 3)
  }, [complaints])

  const weeklyComplaintCount = useMemo(() => {
    const now = Date.now()
    return complaints.filter((complaint) => {
      return now - new Date(complaint.submittedAt).getTime() < WEEK_IN_MS
    }).length
  }, [complaints])

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-slate-300">
          Loading citizen dashboard...
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_35%),linear-gradient(135deg,#020617_0%,#111827_100%)] px-6 py-10 text-slate-50">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <Card className="w-full border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Citizen dashboard access</CardTitle>
              <CardDescription className="text-slate-300">
                Please sign in to view your dashboard, submit complaints, and redeem rewards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Your session is not active yet. Use the login page to continue.
              </p>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button onClick={() => router.push("/login")}>Go to login</Button>
              <Button variant="outline" onClick={() => router.push("/signup")}>
                Create account
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    )
  }

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_AUTH_KEY)
    window.localStorage.removeItem(STORAGE_DASHBOARD_KEY)
    setUser(null)
    setCredits(DEFAULT_CREDITS)
    setComplaints([])
    setRedemptions([])
    router.push("/login")
  }

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        image: "Please upload a JPG, JPEG, or PNG image.",
      }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        image: "Image size should be 5 MB or less.",
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setForm((prev) => ({ ...prev, image: result, imageName: file.name, imageFile: file }))
      setFormErrors((prev) => ({ ...prev, image: "" }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitComplaint = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)
    setFormErrors({})

    const trimmedName = form.name.trim()
    const trimmedContact = form.contact.trim()
    const trimmedLocation = form.location.trim()
    const trimmedDescription = form.description.trim()

    const errors: Record<string, string> = {}
    if (!trimmedName) errors.name = "Full name is required."
    if (!trimmedContact) {
      errors.contact = "Please enter a phone number or email."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact) && !/^\+?[0-9\s()-]{7,15}$/.test(trimmedContact)) {
      errors.contact = "Please enter a valid phone number or email."
    }
    if (!trimmedLocation) errors.location = "Location is required."
    if (!trimmedDescription) errors.description = "Complaint description is required."
    if (!form.imageFile) errors.image = "Upload an image before submitting."

    const currentUserId = user?._id ?? user?.id ?? ""
    const duplicateComplaint = complaints.some((complaint) => {
      return (
        complaint.userId === currentUserId &&
        complaint.description.trim().toLowerCase() === trimmedDescription.toLowerCase() &&
        Date.now() - new Date(complaint.submittedAt).getTime() < WEEK_IN_MS
      )
    })

    if (duplicateComplaint) {
      errors.description = "A similar complaint was submitted this week."
    }

    if (weeklyComplaintCount >= 1) {
      errors.description = "You can submit only one complaint per week."
    }

    if (Object.keys(errors).length) {
      setFormErrors(errors)
      return
    }

    setIsSubmittingComplaint(true)

    try {
      const storedAuth = window.localStorage.getItem(STORAGE_AUTH_KEY)
      const parsedAuth = storedAuth ? JSON.parse(storedAuth) as { accessToken?: string } : null
      const accessToken = parsedAuth?.accessToken

      if (!accessToken) {
        throw new Error("You need to be signed in to submit a complaint.")
      }

      const formData = new FormData()
      formData.append("name", trimmedName)
      formData.append("contact", trimmedContact)
      formData.append("location", trimmedLocation)
      formData.append("description", trimmedDescription)
      formData.append("complaintType", "General")
      if (form.imageFile) {
        formData.append("image", form.imageFile)
      }

      const response = await fetch(`${backendUrl}/api/citizen/complaints`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to submit complaint")
      }

      const complaintPayload = payload?.data ?? payload
      const newComplaint: Complaint = {
        id: complaintPayload?._id ?? complaintPayload?.id ?? `complaint-${Date.now()}`,
        userId: complaintPayload?.userId ?? user?._id ?? user?.id ?? "unknown",
        name: complaintPayload?.name ?? trimmedName,
        contact: complaintPayload?.contact ?? trimmedContact,
        location: complaintPayload?.location ?? trimmedLocation,
        description: complaintPayload?.description ?? trimmedDescription,
        complaintType: complaintPayload?.complaintType ?? "General",
        image: complaintPayload?.imagePath ? `${backendUrl}${complaintPayload.imagePath}` : form.image,
        imagePath: complaintPayload?.imagePath,
        imageName: complaintPayload?.imageName ?? form.imageName,
        status: complaintPayload?.status ?? "Pending",
        creditsAwarded: complaintPayload?.creditsAwarded ?? 0,
        submittedAt: complaintPayload?.submittedAt ?? new Date().toISOString(),
      }

      setComplaints((prev) => [newComplaint, ...prev])
      setCredits((prev) => prev + 100)
      setSubmittedComplaint(newComplaint)
      setIsSuccessDialogOpen(true)
      setForm(initialForm)
      setNotice("Complaint submitted successfully. It is pending administrator review.")
    } catch (submitError) {
      setNotice(submitError instanceof Error ? submitError.message : "Unable to submit complaint")
    } finally {
      setIsSubmittingComplaint(false)
    }
  }

  const handleComplaintStatus = (complaintId: string, status: Complaint["status"]) => {
    setComplaints((prev) =>
      prev.map((complaint) => {
        if (complaint.id !== complaintId) return complaint
        return { ...complaint, status }
      }),
    )

    setNotice(`Complaint marked as ${status}.`)
  }

  const handleRedeem = (reward: Reward) => {
    if (credits < reward.cost) {
      setNotice(`You need ${reward.cost} Green Credits to redeem ${reward.name}.`)
      return
    }

    setCredits((prev) => prev - reward.cost)
    const redemption: Redemption = {
      id: `redemption-${Date.now()}`,
      rewardId: reward.id,
      rewardName: reward.name,
      creditsUsed: reward.cost,
      redeemedAt: new Date().toISOString(),
      deliveryStatus: "Processing",
    }
    setRedemptions((prev) => [redemption, ...prev])
    setNotice(`${reward.name} redeemed successfully. Credits deducted from your balance.`)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_35%),linear-gradient(135deg,#020617_0%,#111827_100%)] px-4 py-8 text-slate-50 sm:px-6 lg:px-8">
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="border border-emerald-500/20 bg-slate-900 text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-xl text-emerald-300">Complaint submitted</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">
              Your complaint has been recorded successfully. It now appears in your history with a Pending status.
            </DialogDescription>
          </DialogHeader>
          {submittedComplaint ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">{submittedComplaint.description}</div>
              <div className="mt-2 text-slate-400">{submittedComplaint.location}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
                  Pending
                </span>
                <span className="text-emerald-300">+100 credits</span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setIsSuccessDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-emerald-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur xl:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-300">
                Citizen dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                Welcome back, {user.name ?? "Citizen"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                Track your Green Credits, learn about waste sorting, submit complaints, and redeem rewards.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm sm:min-w-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User ID</span>
                <span className="font-semibold text-emerald-300">{userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Green Credits</span>
                <span className="text-2xl font-semibold text-emerald-300">{credits}</span>
              </div>
              <Button variant="outline" className="mt-1" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        {notice ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle>Green Credits overview</CardTitle>
              <CardDescription className="text-slate-300">
                Each submitted complaint adds 100 credits. Redemption spends credits instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="text-sm uppercase tracking-[0.3em] text-emerald-200">Balance</div>
                <div className="mt-3 text-5xl font-semibold text-emerald-300">{credits}</div>
                <div className="mt-3 text-sm text-emerald-100">
                  Every submitted complaint awards 100 Green Credits immediately.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Complaints submitted</div>
                  <div className="mt-2 text-2xl font-semibold">{complaints.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Redemptions</div>
                  <div className="mt-2 text-2xl font-semibold">{redemptions.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle>Waste awareness guide</CardTitle>
              <CardDescription className="text-slate-300">
                Learn how to separate and dispose of waste correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wasteCategories.map((section) => (
                <div key={section.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-semibold text-emerald-300">{section.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{section.description}</div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <li key={item} className="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs text-slate-200">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle>Monthly cleanup drive</CardTitle>
              <CardDescription className="text-slate-300">
                Join the next community event and help keep the city clean.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-emerald-300">{cleanupEvent.title}</div>
                <p className="mt-2">{cleanupEvent.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-slate-400">Location</div>
                  <div className="mt-1 font-medium text-slate-100">{cleanupEvent.location}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-slate-400">Time</div>
                  <div className="mt-1 font-medium text-slate-100">{cleanupEvent.time}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-slate-400">Refreshments</div>
                <div className="mt-1 font-medium text-slate-100">{cleanupEvent.refreshments}</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-sm text-emerald-100">Next cleanup date</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">{cleanupEvent.nextDate}</div>
                <div className="mt-1 text-sm text-emerald-100">Week: {cleanupEvent.week}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle>Reward redemption</CardTitle>
              <CardDescription className="text-slate-300">
                Redeem your credits for eco-friendly rewards. Credits are deducted after each successful redemption.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {rewardCatalog.map((reward) => (
                <div key={reward.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                      {reward.image}
                    </div>
                    <span className="rounded-full border border-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
                      {reward.stock} left
                    </span>
                  </div>
                  <div className="mt-4 font-semibold text-slate-100">{reward.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{reward.cost} credits</div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => handleRedeem(reward)}
                    disabled={credits < reward.cost || reward.stock < 1}
                  >
                    {credits < reward.cost ? "Insufficient credits" : "Redeem"}
                  </Button>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex-col items-start gap-3">
              <div className="text-sm font-medium text-slate-200">Redemption history</div>
              {redemptions.length ? (
                <div className="w-full space-y-2">
                  {redemptions.slice(0, 4).map((redemption) => (
                    <div key={redemption.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                      <span>{redemption.rewardName}</span>
                      <span>{redemption.creditsUsed} credits</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No redemptions yet.</div>
              )}
            </CardFooter>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle>Submit a complaint</CardTitle>
              <CardDescription className="text-slate-300">
                One complaint per week. Only JPG, JPEG, and PNG files up to 5 MB are accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmitComplaint}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300" htmlFor="name">
                      Full name
                    </label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) => handleFieldChange("name", event.target.value)}
                      placeholder="Alex Morgan"
                    />
                    {formErrors.name ? <p className="mt-1 text-sm text-rose-300">{formErrors.name}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300" htmlFor="contact">
                      Phone or email
                    </label>
                    <Input
                      id="contact"
                      value={form.contact}
                      onChange={(event) => handleFieldChange("contact", event.target.value)}
                      placeholder="alex@example.com"
                    />
                    {formErrors.contact ? <p className="mt-1 text-sm text-rose-300">{formErrors.contact}</p> : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300" htmlFor="location">
                    Location
                  </label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(event) => handleFieldChange("location", event.target.value)}
                    placeholder="North Avenue, Block 2"
                  />
                  {formErrors.location ? <p className="mt-1 text-sm text-rose-300">{formErrors.location}</p> : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300" htmlFor="description">
                    Complaint description
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(event) => handleFieldChange("description", event.target.value)}
                    className="min-h-28 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                    placeholder="Describe the issue clearly"
                  />
                  {formErrors.description ? <p className="mt-1 text-sm text-rose-300">{formErrors.description}</p> : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300" htmlFor="image">
                    Upload image
                  </label>
                  <input
                    id="image"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="w-full rounded-lg border border-dashed border-white/10 bg-slate-950/70 p-2 text-sm text-slate-200"
                  />
                  {form.imageName ? <p className="mt-2 text-xs text-slate-400">Selected file: {form.imageName}</p> : null}
                  {formErrors.image ? <p className="mt-1 text-sm text-rose-300">{formErrors.image}</p> : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isSubmittingComplaint}>
                    {isSubmittingComplaint ? "Submitting..." : "Submit complaint"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm(initialForm)
                      setFormErrors({})
                      setNotice("Complaint form cleared.")
                    }}
                  >
                    Clear form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/80 text-slate-50 shadow-2xl">
            <CardHeader>
              <CardTitle>Complaint status & history</CardTitle>
              <CardDescription className="text-slate-300">
                Pending complaints are reviewed by the admin team. Approved complaints add 100 Green Credits automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentComplaints.length ? (
                recentComplaints.map((complaint) => (
                  <div key={complaint.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-100">{complaint.description}</div>
                        <div className="mt-1 text-sm text-slate-400">{complaint.location}</div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          complaint.status === "Approved"
                            ? "bg-emerald-500/15 text-emerald-200"
                            : complaint.status === "Rejected"
                              ? "bg-rose-500/15 text-rose-200"
                              : "bg-slate-700/70 text-slate-200",
                        )}
                      >
                        {complaint.status}
                      </span>
                    </div>
                    {complaint.imagePath || complaint.image ? (
                      <img
                        src={complaint.imagePath ? `${backendUrl}${complaint.imagePath}` : complaint.image}
                        alt={complaint.imageName ?? "Complaint evidence"}
                        className="mt-3 h-32 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    {complaint.imageName ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-2 text-xs text-slate-400">
                        Photo: {complaint.imageName}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Status buttons removed from citizen page */}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                  No complaints have been submitted yet.
                </div>
              )}

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Weekly limit: {1 - weeklyComplaintCount} complaint remaining this week.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
