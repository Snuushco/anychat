"use client"

import { BottomNav } from "./bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: flex layout with sidebar */}
      <div className="hidden md:flex h-dvh overflow-hidden">
        <DesktopSidebar />
        <main className="flex-1 min-w-0 h-dvh">
          {children}
        </main>
      </div>

      {/* Mobile: fixed bottom nav, main content fills remaining space */}
      <div className="md:hidden fixed inset-0 bottom-16">
        <main className="h-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  )
}
