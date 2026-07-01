"use client"

import { FormEvent, useState } from "react"
import { KeyRoundIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface ChangePasswordDialogProps {
  changePassword: (payload: { current_password: string; new_password: string }) => Promise<boolean>
}

export function ChangePasswordDialog({ changePassword }: ChangePasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
  }

  const handleClose = () => {
    reset()
    setIsOpen(false)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }

    setIsLoading(true)
    const ok = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    })
    setIsLoading(false)

    if (ok) {
      handleClose()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="flex w-full justify-start gap-2 px-2 text-sm font-normal"
        onClick={() => setIsOpen(true)}
      >
        <KeyRoundIcon className="h-4 w-4" />
        Change password
      </Button>

      <Dialog open={isOpen}>
        <DialogContent className="relative bg-card text-card-foreground max-w-[380px]">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-7 w-7"
            onClick={handleClose}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </Button>

          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              <KeyRoundIcon className="h-4 w-4 text-primary" />
              Change Password
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1">
              <label htmlFor="cp-current" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Password
              </label>
              <Input
                id="cp-current"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="cp-new" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Password
              </label>
              <Input
                id="cp-new"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="cp-confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Confirm New Password
              </label>
              <Input
                id="cp-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving…" : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
