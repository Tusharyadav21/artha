"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { ProfileForm } from "@/components/settings/profile-form"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { ChatDefaultsForm } from "@/components/settings/chat-defaults-form"

export function SettingsView() {
  const { user, isSavingSettings, updateUserSettings } = useAuth()
  const [activeTab, setActiveTab] = React.useState("profile")

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-5">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-fit" variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="chat">Chat Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Personal identity settings for your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
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
                Persist the theme and the default sidebar posture you want each time the app loads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppearanceForm
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
                Choose which route opens first and how the new chat dialog should prefill its document scope.
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
