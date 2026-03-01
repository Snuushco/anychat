"use client"

import { BottomNav } from "./bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex overflow-hidden">
      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <div className="flex-1 min-w-0 h-dvh flex flex-col">
        {/* Content fills available space minus nav */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
        {/* Invisible spacer that pushes content up, matching bottom nav */}
        <div className="h-16 shrink-0 md:hidden" />
      </div>

      <BottomNav />
    </div>
  )
}
