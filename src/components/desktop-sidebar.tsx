"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageSquare, CheckSquare, Bot, Settings, Puzzle } from "lucide-react"

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/tasks", icon: CheckSquare, label: "Taken" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/plugins", icon: Puzzle, label: "Plugins" },
  { href: "/settings", icon: Settings, label: "Instellingen" },
]

export function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/50 h-dvh shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border/50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span>AnyChat</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">AI Command Centre</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground text-center">AnyChat v0.3.0</p>
      </div>
    </aside>
  )
}
