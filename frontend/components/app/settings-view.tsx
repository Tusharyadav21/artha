"use client"

import * as React from "react"
import { SaveIcon } from "lucide-react"

import { useWorkspace } from "@/components/app/workspace-provider"
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

export function SettingsView() {
  const { user, isSavingSettings, updateUserSettings } = useWorkspace()
  const [activeTab, setActiveTab] = React.useState("profile")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
      <TabsList className="w-fit">
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
      className="grid gap-4 md:max-w-xl"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          display_name: displayName.trim() || null,
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Display name</label>
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Workspace owner"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Email</label>
        <Input value={email} readOnly />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Member since</label>
        <Input
          value={
            createdAt
              ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: "full",
                }).format(new Date(createdAt))
              : ""
          }
          readOnly
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSavingSettings}>
          <SaveIcon data-icon="inline-start" />
          Save profile
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
      className="grid gap-4 md:max-w-xl"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          theme_preference: themePreference,
          sidebar_collapsed: sidebarCollapsed === "collapsed",
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Theme preference</label>
        <Select
          value={themePreference}
          onChange={(event) =>
            setThemePreference(
              event.target.value as "system" | "light" | "dark"
            )
          }
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Sidebar default</label>
        <Select
          value={sidebarCollapsed}
          onChange={(event) => setSidebarCollapsed(event.target.value)}
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed</option>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSavingSettings}>
          <SaveIcon data-icon="inline-start" />
          Save appearance
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
      className="grid gap-4 md:max-w-xl"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          default_home_tab: homeTab,
          new_chat_scope_mode: scopeMode,
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Default home route</label>
        <Select
          value={homeTab}
          onChange={(event) =>
            setHomeTab(event.target.value as "chat" | "library" | "settings")
          }
        >
          <option value="chat">Chat</option>
          <option value="library">Library</option>
          <option value="settings">Settings</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">New chat scope preset</label>
        <Select
          value={scopeMode}
          onChange={(event) =>
            setScopeMode(
              event.target.value as "clear" | "remember" | "all-completed"
            )
          }
        >
          <option value="clear">Start with no scoped documents</option>
          <option value="remember">Reuse current document scope</option>
          <option value="all-completed">Preselect all completed documents</option>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSavingSettings}>
          <SaveIcon data-icon="inline-start" />
          Save chat defaults
        </Button>
      </div>
    </form>
  )
}
