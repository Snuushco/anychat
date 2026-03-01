"use client"

import { BottomNav } from "./bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 pb-16 md:pb-0 overflow-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
