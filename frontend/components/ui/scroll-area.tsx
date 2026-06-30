

import { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function ScrollArea({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="scroll-area" className={cn("overflow-auto", className)} {...props} />
}

export { ScrollArea }
