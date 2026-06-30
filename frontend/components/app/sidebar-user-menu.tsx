"use client"

import { memo } from "react"
import {
  LogOutIcon,
  SettingsIcon,
  MonitorIcon,
  MoonStarIcon,
  SunMediumIcon,
  CheckIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/hooks/use-auth"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const themeOptions = [
  { value: "dark" as const, label: "Dark", Icon: MoonStarIcon },
  { value: "light" as const, label: "Light", Icon: SunMediumIcon },
  { value: "system" as const, label: "System", Icon: MonitorIcon },
]

const SidebarUserMenu = memo(function SidebarUserMenu({
  isCollapsed,
}: {
  isCollapsed: boolean
}) {
  const { user, signOut, updateUserSettings } = useAuth()
  const { setTheme } = useTheme()
  const router = useRouter()

  const initials = user?.display_name
    ? user.display_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "AR"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "px-2"
          )}
        >
          <Avatar className="size-9 ring-1 ring-white/10 shrink-0 cursor-pointer">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs select-none">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 leading-tight text-left">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {user?.display_name || "User"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground opacity-60 font-medium mt-0.5">
                {user?.email || ""}
              </p>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-56"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.display_name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email || ""}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="gap-2"
        >
          <SettingsIcon className="size-4 text-muted-foreground" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={user?.theme_preference ?? "dark"}
          onValueChange={(value) => {
            const theme = value as "dark" | "light" | "system"
            setTheme(theme)
            void updateUserSettings({ theme_preference: theme })
          }}
        >
          {themeOptions.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="gap-2 pl-2"
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              {user?.theme_preference === value && (
                <CheckIcon className="size-3.5 text-primary" />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={signOut}
          className="gap-2 text-muted-foreground hover:text-status-danger focus:text-status-danger"
        >
          <LogOutIcon className="size-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

export { SidebarUserMenu }
