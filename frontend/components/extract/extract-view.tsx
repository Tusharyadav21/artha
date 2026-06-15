"use client"

import * as React from "react"
import { useState } from "react"
import { ImageIcon, FileTextIcon } from "lucide-react"
import { ImageToTextTab } from "@/components/extract/image-to-text-tab"
import { PdfToTextTab } from "@/components/extract/pdf-to-text-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ExtractView() {
  const [activeTab, setActiveTab] = useState("image-to-text")

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 select-none">
      <header className="h-14 px-6 border-b flex items-center shrink-0 backdrop-blur">
        <h1 className="font-semibold text-[15px] text-foreground tracking-tight">
          Extract
        </h1>
      </header>

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit mb-6">
            <TabsTrigger value="image-to-text" className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              Image to Text
            </TabsTrigger>
            <TabsTrigger value="pdf-to-text" className="flex items-center gap-2">
              <FileTextIcon className="size-4" />
              PDF to Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image-to-text" className="flex-1 min-h-0 mt-0">
            <ImageToTextTab />
          </TabsContent>

          <TabsContent value="pdf-to-text" className="flex-1 min-h-0 mt-0">
            <PdfToTextTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
