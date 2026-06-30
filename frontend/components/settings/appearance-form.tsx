"use client"

import { useState } from "react"
import { CheckIcon, MonitorIcon, MoonIcon, SaveIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface AppearanceFormProps {
  defaultSidebarState: string
  defaultTheme: "system" | "light" | "dark"
  isSavingSettings: boolean
  onSave: (updates: { theme_preference?: "system" | "light" | "dark"; sidebar_collapsed?: boolean }) => Promise<unknown>
}

export function AppearanceForm({ defaultSidebarState, defaultTheme, isSavingSettings, onSave }: AppearanceFormProps) {
  const [themePreference, setThemePreference] = useState(defaultTheme)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarState)

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({ theme_preference: themePreference, sidebar_collapsed: sidebarCollapsed === "collapsed" })
      }}
    >
      <div className="space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme Preference</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", icon: SunIcon, label: "Light" },
            { id: "dark", icon: MoonIcon, label: "Dark" },
            { id: "system", icon: MonitorIcon, label: "System" },
          ].map((theme) => (
            <Button
              variant="ghost"
              key={theme.id}
              type="button"
              onClick={() => setThemePreference(theme.id as any)}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all group/theme relative",
                themePreference === theme.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 hover:border-border hover:bg-muted"
              )}
            >

              <span className="text-xs font-medium flex items-center justify-center"><theme.icon className={cn("size-6", themePreference === theme.id ? "text-primary" : "text-muted-foreground group-hover/theme:text-foreground")} />&nbsp;&nbsp;{theme.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sidebar Default State</label>
        <Select value={sidebarCollapsed} onChange={(e) => setSidebarCollapsed(e.target.value)} className="bg-muted/30">
          <option value="expanded">Expanded by default</option>
          <option value="collapsed">Collapsed by default</option>
        </Select>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button type="submit" disabled={isSavingSettings} className="px-6">
          <SaveIcon className="size-4 mr-2" />
          Update Appearance
        </Button>
      </div>
    </form>
  )
}
