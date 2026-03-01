"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "./bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === "/"

  if (isLanding) {
    return <>{children}</>
  }

  return (
    <div className="h-dvh flex">
      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main content — padding-bottom for mobile nav */}
      <main className="flex-1 min-w-0 h-dvh overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
