"use client"

import * as React from "react"
import { FileTextIcon, UploadIcon, Loader2Icon, TableIcon, AlertCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { parseTransactions, parseTableData, formatAmount, type Transaction } from "@/lib/financial/parser"

export function FinancialView() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [rawText, setRawText] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      setError("Please upload a PDF file.")
      return
    }
    setError("")
    setLoading(true)
    setFileName(file.name)

    try {
      const arrayBuffer = await file.arrayBuffer()

      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise
      let fullText = ""
      let allItems: Array<{ str: string; x: number; y: number; width: number; height: number }> = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const pageHeight = viewport.height
        const content = await page.getTextContent()
        const pageText = content.items.map((item: any) => item.str).join(" ")
        fullText += pageText + "\n\n"
        allItems.push(
          ...content.items.map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: pageHeight - item.transform[5],
            width: item.width,
            height: item.height || 0,
          }))
        )
      }

      setRawText(fullText)

      let parsed: Transaction[]
      if (allItems.length > 0) {
        parsed = parseTableData(allItems)
      } else {
        parsed = parseTransactions(fullText)
      }

      if (parsed.length === 0) {
        parsed = parseTransactions(fullText)
      }

      setTransactions(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse PDF.")
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-5 gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Upload a bank statement PDF to view extracted transactions.
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors",
          loading
            ? "border-primary/30 bg-primary/5"
            : "border-border/60 hover:border-primary/40 hover:bg-muted/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {loading ? (
          <Loader2Icon className="size-8 animate-spin text-primary" />
        ) : (
          <UploadIcon className="size-8 text-muted-foreground" />
        )}
        <div className="text-center">
          {loading ? (
            <p className="text-sm font-medium text-foreground">Parsing statement...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                Drop your PDF statement here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports bank statement PDFs
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {fileName && !loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileTextIcon className="size-3.5" />
          <span>{fileName}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold text-muted-foreground/60">
            {transactions.length} transactions
          </Badge>
        </div>
      )}

      {/* Results Table */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TableIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Extracted Transactions</CardTitle>
            </div>
            <CardDescription>
              Data extracted from uploaded statement — no data is saved or sent anywhere.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-right">Debit</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-right">Credit</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-border/50 transition-colors hover:bg-muted/30",
                        tx.debit && "bg-red-500/5"
                      )}
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{tx.description}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-red-500">
                        {tx.debit != null ? formatAmount(tx.debit) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-green-600">
                        {tx.credit != null ? formatAmount(tx.credit) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-muted-foreground">
                        {tx.balance != null ? formatAmount(tx.balance) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw text fallback */}
      {rawText && transactions.length === 0 && !loading && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Raw Extracted Text</CardTitle>
            </div>
            <CardDescription>
              Could not detect standard transaction format. Showing raw text below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground font-mono leading-relaxed max-h-96 overflow-y-auto">
              {rawText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


