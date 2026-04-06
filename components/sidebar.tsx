'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brain,
  LayoutDashboard,
  Play,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Flame,
  Trophy,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/study', label: 'Study Session', icon: Play },
  { href: '/planner', label: 'Planner', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/profile', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
          <Brain className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">Study Buddy</span>
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Flame className="w-4 h-4 text-warning" />
            <span className="text-sidebar-foreground font-medium">0</span>
            <span className="text-muted-foreground">day streak</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="text-sidebar-foreground font-medium">0</span>
            <span className="text-muted-foreground">pts</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2.5 h-auto hover:bg-sidebar-accent"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {user?.full_name ? getInitials(user.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ''}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
