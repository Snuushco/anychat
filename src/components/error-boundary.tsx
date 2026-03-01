"use client"

import React from "react"
import { AlertTriangle, RefreshCw, MessageCircle } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-sm w-full text-center space-y-4 p-6 rounded-2xl border border-border/50 bg-card animate-fade-in">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-1">
                An unexpected error occurred. Please reload the page.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <a
                href="mailto:snuushco@gmail.com?subject=AnyChat%20Bug%20Report"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Report an issue
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
