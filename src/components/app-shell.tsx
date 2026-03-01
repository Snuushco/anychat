"use client"

import { BottomNav } from "./bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 h-[calc(100dvh-4rem)] md:h-dvh overflow-hidden">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
