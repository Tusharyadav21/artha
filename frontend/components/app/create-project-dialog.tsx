"use client"

import * as React from "react"
import { FolderPlusIcon, UploadIcon, XIcon, FileIcon, Loader2Icon } from "lucide-react"

import { useProjects } from "@/hooks/use-projects"
import { useDocuments } from "@/hooks/use-documents"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MAX_UPLOAD_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/constants"

interface CreateProjectDialogProps {
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// fallow-ignore-next-line complexity
export function CreateProjectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = setControlledOpen ?? setInternalOpen

  const { createProject, isCreatingProject } = useProjects()
  const { uploadDocument, isUploading } = useDocuments()
  const [name, setName] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter(f => f.size <= MAX_UPLOAD_SIZE)
      
      if (validFiles.length < selectedFiles.length) {
        toast.error("Some files exceed the 10MB limit and were skipped")
      }
      
      setFiles((prev) => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // fallow-ignore-next-line complexity
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    try {
      // 1. Create project
      const project = await createProject(trimmedName)

      // 2. Upload documents if any
      if (project && files.length > 0) {
        await Promise.all(files.map(file => uploadDocument(file, project.id)))
      }

      // 3. Reset and close
      setName("")
      setFiles([])
      setOpen(false)
    } catch (error) {
      console.error("Failed to create project with documents:", error)
    }
  }

  const isSubmitting = isCreatingProject || isUploading

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Give your project a name and optionally upload some documents to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g., Q2 Research"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>Documents (Optional)</Label>
            <div
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-8 transition-colors hover:border-primary/50",
                isSubmitting && "pointer-events-none opacity-50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground">
                <UploadIcon className="h-8 w-8" />
                <p className="text-sm font-medium">Click to upload files</p>
                <p className="text-xs">PDF, TXT, MD, etc.</p>
              </div>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
              />
            </div>

            {files.length > 0 && (
              <ScrollArea className="max-h-[160px] rounded-md border border-border/50">
                <div className="flex flex-col gap-1 p-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {isCreatingProject ? "Creating..." : "Uploading..."}
                </>
              ) : (
                <>
                  <FolderPlusIcon className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
