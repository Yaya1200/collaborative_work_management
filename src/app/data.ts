export type TaskStatus =
  | "Backlog"
  | "To do"
  | "In progress"
  | "In review"
  | "Done"
  | "Blocked"
  | "Cancelled"

export type Task = {
  id: string
  key: string
  title: string
  project: string
  status: TaskStatus
  priority: "Low" | "Medium" | "High" | "Critical"
  due: string
  dueLabel: string
  owner: { name: string; initials: string; color: string }
  progress: number
}

export type Project = {
  key: string
  name: string
  space: string
  status: "Active" | "At risk" | "On hold" | "Completed"
  progress: number
  tasks: number
  due: string
  color: string
}

export const tasks: Task[] = [
  {
    id: "1",
    key: "WEB-24",
    title: "Finalize dashboard interaction specs",
    project: "Website Redesign",
    status: "In progress",
    priority: "High",
    due: "2026-10-27",
    dueLabel: "Tomorrow",
    owner: {
      name: "Alex Morgan",
      initials: "AM",
      color: "bg-violet-100 text-violet-700",
    },
    progress: 68,
  },
  {
    id: "2",
    key: "MOB-18",
    title: "Review authentication edge cases",
    project: "Mobile App v2",
    status: "In review",
    priority: "Critical",
    due: "2026-10-26",
    dueLabel: "Today",
    owner: {
      name: "Maya Chen",
      initials: "MC",
      color: "bg-amber-100 text-amber-700",
    },
    progress: 92,
  },
  {
    id: "3",
    key: "OPS-09",
    title: "Document release rollback procedure",
    project: "Operations Hub",
    status: "Blocked",
    priority: "High",
    due: "2026-10-25",
    dueLabel: "1 day overdue",
    owner: {
      name: "Jordan Lee",
      initials: "JL",
      color: "bg-sky-100 text-sky-700",
    },
    progress: 35,
  },
  {
    id: "4",
    key: "WEB-31",
    title: "Prepare responsive component audit",
    project: "Website Redesign",
    status: "To do",
    priority: "Medium",
    due: "2026-10-30",
    dueLabel: "Oct 30",
    owner: {
      name: "Nora Patel",
      initials: "NP",
      color: "bg-emerald-100 text-emerald-700",
    },
    progress: 0,
  },
  {
    id: "5",
    key: "MKT-12",
    title: "Approve Q4 campaign messaging",
    project: "Q4 Campaign",
    status: "In review",
    priority: "Medium",
    due: "2026-11-01",
    dueLabel: "Nov 1",
    owner: {
      name: "Chris Bell",
      initials: "CB",
      color: "bg-rose-100 text-rose-700",
    },
    progress: 85,
  },
  {
    id: "6",
    key: "MOB-22",
    title: "Implement offline state indicators",
    project: "Mobile App v2",
    status: "Backlog",
    priority: "Low",
    due: "2026-11-08",
    dueLabel: "Nov 8",
    owner: {
      name: "Alex Morgan",
      initials: "AM",
      color: "bg-violet-100 text-violet-700",
    },
    progress: 0,
  },
]

export const projects: Project[] = [
  {
    key: "WEB",
    name: "Website Redesign",
    space: "Product & Design",
    status: "Active",
    progress: 72,
    tasks: 38,
    due: "Nov 14",
    color: "bg-violet-500",
  },
  {
    key: "MOB",
    name: "Mobile App v2",
    space: "Engineering",
    status: "Active",
    progress: 48,
    tasks: 26,
    due: "Dec 8",
    color: "bg-sky-500",
  },
  {
    key: "MKT",
    name: "Q4 Campaign",
    space: "Marketing",
    status: "At risk",
    progress: 61,
    tasks: 19,
    due: "Nov 3",
    color: "bg-amber-500",
  },
  {
    key: "OPS",
    name: "Operations Hub",
    space: "Operations",
    status: "On hold",
    progress: 35,
    tasks: 14,
    due: "Dec 18",
    color: "bg-emerald-500",
  },
]
