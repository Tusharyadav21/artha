"use client"

import { useState } from "react"
import { SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

interface ChatDefaultsFormProps {
  defaultHomeTab: "chat" | "library" | "settings"
  defaultScopeMode: "clear" | "remember" | "all-completed"
  isSavingSettings: boolean
  onSave: (updates: { default_home_tab?: "chat" | "library" | "settings"; new_chat_scope_mode?: "clear" | "remember" | "all-completed" }) => Promise<unknown>
}

export function ChatDefaultsForm({ defaultHomeTab, defaultScopeMode, isSavingSettings, onSave }: ChatDefaultsFormProps) {
  const [homeTab, setHomeTab] = useState(defaultHomeTab)
  const [scopeMode, setScopeMode] = useState(defaultScopeMode)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({ default_home_tab: homeTab, new_chat_scope_mode: scopeMode })
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Home Route</label>
          <Select value={homeTab} onChange={(e) => setHomeTab(e.target.value as "chat" | "library" | "settings")} className="bg-muted/30">
            <option value="chat">Chat workspace</option>
            <option value="library">Library & Documents</option>
            <option value="settings">Settings & Profile</option>
          </Select>
          <p className="text-[10px] text-muted-foreground opacity-70">Where the app lands after login</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Chat Scope Preset</label>
          <Select value={scopeMode} onChange={(e) => setScopeMode(e.target.value as "clear" | "remember" | "all-completed")} className="bg-muted/30">
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
