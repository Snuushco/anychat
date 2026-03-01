"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageSquare, CheckSquare, Bot, Settings } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-accent-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
