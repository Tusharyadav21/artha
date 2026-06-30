"use client"

import { ComponentProps } from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

function DropdownMenu({ children, ...props }: MenuPrimitive.Root.Props) {
  return (
    <MenuPrimitive.Root data-slot="dropdown-menu" {...props}>
      {children}
    </MenuPrimitive.Root>
  )
}

function DropdownMenuTrigger({ className, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn("inline-flex items-center justify-center", className)}
      render={<span className="inline-flex" />}
      nativeButton={false}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset,
  alignOffset,
  align,
  side,
  ...props
}: MenuPrimitive.Popup.Props & MenuPrimitive.Positioner.Props) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50"
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        align={align}
        side={side}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.Group>
      <MenuPrimitive.GroupLabel
        data-slot="dropdown-menu-label"
        className={cn(
          "px-2 py-1.5 text-xs font-semibold text-muted-foreground select-none",
          className
        )}
        {...props}
      />
    </MenuPrimitive.Group>
  )
}

function DropdownMenuGroup({ className, ...props }: MenuPrimitive.Group.Props) {
  return (
    <MenuPrimitive.Group
      data-slot="dropdown-menu-group"
      className={className}
      {...props}
    />
  )
}

function DropdownMenuRadioGroup({ className, ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      className={className}
      {...props}
    />
  )
}

function DropdownMenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.RadioItem>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
}
