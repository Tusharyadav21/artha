"use client"

import * as React from "react"
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 min-h-0">
          <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <AlertCircleIcon className="size-6 text-destructive" />
          </div>
          <div className="text-center max-w-sm">
            <h3 className="text-sm font-semibold text-foreground mb-1">Something went wrong</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="flex items-center gap-1.5">
            <RefreshCwIcon className="size-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
