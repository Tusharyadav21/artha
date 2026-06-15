"use client"

import * as React from "react"
import { SaveIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ProfileFormProps {
  createdAt: string
  defaultDisplayName: string
  email: string
  isSavingSettings: boolean
  onSave: (updates: { display_name?: string | null }) => Promise<unknown>
}

export function ProfileForm({ createdAt, defaultDisplayName, email, isSavingSettings, onSave }: ProfileFormProps) {
  const [displayName, setDisplayName] = React.useState(defaultDisplayName)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({ display_name: displayName.trim() || null })
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
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Alex" className="bg-muted/30" />
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
            value={createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(createdAt)) : ""}
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
