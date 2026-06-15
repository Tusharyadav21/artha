"use client"

import * as React from "react"

import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SaveIcon,
  SunIcon,
} from "lucide-react"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Avatar, AvatarFallback } from "@/components/app/ui-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// fallow-ignore-next-line complexity
export function SettingsView() {
  const { user, isSavingSettings, updateUserSettings } = useWorkspace()
  const [activeTab, setActiveTab] = React.useState("profile")

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-5">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-fit" variant="line">
          <TabsTrigger value="profile">
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="chat">
            Chat Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Personal identity settings for your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettingsForm
              key={user?.id ?? "anonymous"}
              createdAt={user?.created_at ?? ""}
              defaultDisplayName={user?.display_name ?? ""}
              email={user?.email ?? ""}
              isSavingSettings={isSavingSettings}
              onSave={updateUserSettings}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Persist the theme and the default sidebar posture you want each time
              the app loads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSettingsForm
              key={`${user?.theme_preference ?? "system"}:${user?.sidebar_collapsed ?? false}`}
              defaultSidebarState={user?.sidebar_collapsed ? "collapsed" : "expanded"}
              defaultTheme={user?.theme_preference ?? "system"}
              isSavingSettings={isSavingSettings}
              onSave={updateUserSettings}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="chat">
        <Card>
          <CardHeader>
            <CardTitle>Chat defaults</CardTitle>
            <CardDescription>
              Choose which route opens first and how the new chat dialog should
              prefill its document scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChatDefaultsForm
              key={`${user?.default_home_tab ?? "chat"}:${user?.new_chat_scope_mode ?? "clear"}`}
              defaultHomeTab={user?.default_home_tab ?? "chat"}
              defaultScopeMode={user?.new_chat_scope_mode ?? "clear"}
              isSavingSettings={isSavingSettings}
              onSave={updateUserSettings}
            />
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSettingsForm({
  createdAt,
  defaultDisplayName,
  email,
  isSavingSettings,
  onSave,
}: {
  createdAt: string
  defaultDisplayName: string
  email: string
  isSavingSettings: boolean
  onSave: (updates: {
    display_name?: string | null
  }) => Promise<unknown>
}) {
  const [displayName, setDisplayName] = React.useState(defaultDisplayName)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          display_name: displayName.trim() || null,
        })
      }}
    >
      <div className="flex items-center gap-6">
        <Avatar size="lg">
          <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
            {email.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-semibold">{displayName || "Workspace Owner"}</h3>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Name</label>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. Alex"
            className="bg-muted/30"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
          <div className="relative">
            <Input value={email} readOnly className="bg-muted/50 opacity-70 pr-20" />
            <Badge variant="outline" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] uppercase">Primary</Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member Since</label>
          <Input
            value={
              createdAt
                ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                }).format(new Date(createdAt))
                : ""
            }
            readOnly
            className="bg-muted/50 opacity-70"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button type="submit" disabled={isSavingSettings} className="px-6">
          <SaveIcon className="size-4 mr-2" />
          Update Profile
        </Button>
      </div>
    </form>
  )
}

function AppearanceSettingsForm({
  defaultSidebarState,
  defaultTheme,
  isSavingSettings,
  onSave,
}: {
  defaultSidebarState: string
  defaultTheme: "system" | "light" | "dark"
  isSavingSettings: boolean
  onSave: (updates: {
    theme_preference?: "system" | "light" | "dark"
    sidebar_collapsed?: boolean
  }) => Promise<unknown>
}) {
  const [themePreference, setThemePreference] = React.useState(defaultTheme)
  const [sidebarCollapsed, setSidebarCollapsed] =
    React.useState(defaultSidebarState)

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          theme_preference: themePreference,
          sidebar_collapsed: sidebarCollapsed === "collapsed",
        })
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
            <button
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
              <theme.icon className={cn("size-6", themePreference === theme.id ? "text-primary" : "text-muted-foreground group-hover/theme:text-foreground")} />
              <span className="text-xs font-medium">{theme.label}</span>
              {themePreference === theme.id && (
                <div className="absolute top-1.5 right-1.5 size-4 bg-primary rounded-full flex items-center justify-center">
                  <CheckIcon className="size-2.5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sidebar Default State</label>
        <Select
          value={sidebarCollapsed}
          onChange={(event) => setSidebarCollapsed(event.target.value)}
          className="bg-muted/30"
        >
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

function ChatDefaultsForm({
  defaultHomeTab,
  defaultScopeMode,
  isSavingSettings,
  onSave,
}: {
  defaultHomeTab: "chat" | "library" | "settings"
  defaultScopeMode: "clear" | "remember" | "all-completed"
  isSavingSettings: boolean
  onSave: (updates: {
    default_home_tab?: "chat" | "library" | "settings"
    new_chat_scope_mode?: "clear" | "remember" | "all-completed"
  }) => Promise<unknown>
}) {
  const [homeTab, setHomeTab] = React.useState(defaultHomeTab)
  const [scopeMode, setScopeMode] = React.useState(defaultScopeMode)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          default_home_tab: homeTab,
          new_chat_scope_mode: scopeMode,
        })
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Home Route</label>
          <Select
            value={homeTab}
            onChange={(event) =>
              setHomeTab(event.target.value as "chat" | "library" | "settings")
            }
            className="bg-muted/30"
          >
            <option value="chat">Chat workspace</option>
            <option value="library">Library & Documents</option>
            <option value="settings">Settings & Profile</option>
          </Select>
          <p className="text-[10px] text-muted-foreground opacity-70">Where the app lands after login</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Chat Scope Preset</label>
          <Select
            value={scopeMode}
            onChange={(event) =>
              setScopeMode(
                event.target.value as "clear" | "remember" | "all-completed"
              )
            }
            className="bg-muted/30"
          >
            <option value="clear">Start fresh (no documents)</option>
            <option value="remember">Keep current selection</option>
            <option value="all-completed">Include all ready files</option>
          </Select>
          <p className="text-[10px] text-muted-foreground opacity-70">Default document seeding for new chats</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button type="submit" disabled={isSavingSettings} className="px-6">
          <SaveIcon className="size-4 mr-2" />
          Update Defaults
        </Button>
      </div>
    </form>
  )
}
