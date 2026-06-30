import Link from "next/link"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-1.5 font-sans no-underline",
        className
      )}
    >
      <span className="text-xl font-bold leading-none tracking-tight text-primary transition-colors duration-300 group-hover:text-emerald-400">
        artha
      </span>
      <span className="inline-block h-0.5 w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-4 group-hover:bg-emerald-400" />
    </Link>
  )
}
