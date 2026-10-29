import type { ReactNode } from "react"
import { ChevronDown, Search } from "lucide-react"

export function Avatar({
  initials,
  className = "",
}: {
  initials: string
  className?: string
}) {
  return <span className={`avatar ${className}`}>{initials}</span>
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Blocked" || status === "At risk"
      ? "status-red"
      : status === "In progress" || status === "Active"
        ? "status-blue"
        : status === "In review"
          ? "status-purple"
          : status === "Done"
            ? "status-green"
            : status === "On hold"
              ? "status-amber"
              : "status-gray"
  return <span className={`status ${tone}`}>{status}</span>
}

export function SectionCard({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function FilterButton({ children }: { children: ReactNode }) {
  return (
    <button className="filter-button" type="button">
      {children}
      <ChevronDown size={14} />
    </button>
  )
}

export function SearchField({
  placeholder = "Search",
}: {
  placeholder?: string
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input aria-label={placeholder} placeholder={placeholder} />
    </label>
  )
}
