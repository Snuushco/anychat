"use client"

import { BottomNav } from "./bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex overflow-hidden">
      {/* Desktop sidebar */}
      <DesktopSidebar />
      
      {/* Main content — use env(safe-area-inset-bottom) + nav height */}
      <div className="flex-1 min-w-0 flex flex-col h-dvh">
        <div className="flex-1 min-h-0">
          {children}
        </div>
        {/* Spacer matching bottom nav height on mobile */}
        <div className="shrink-0 h-16 md:h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
      
      <BottomNav />
    </div>
  )
}
