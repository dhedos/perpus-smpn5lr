
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  ArrowLeftRight, 
  BarChart3, 
  Printer, 
  Settings,
  Database,
  LogOut,
  Library
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BookOpen, label: "Koleksi Buku", href: "/dashboard/books" },
  { icon: Users, label: "Keanggotaan", href: "/dashboard/members" },
  { icon: ArrowLeftRight, label: "Transaksi", href: "/dashboard/transactions" },
  { icon: BarChart3, label: "Laporan", href: "/dashboard/reports" },
  { icon: Printer, label: "Cetak & Label", href: "/dashboard/print" },
]

const adminItems = [
  { icon: Database, label: "Backup & Sync", href: "/dashboard/sync" },
  { icon: Settings, label: "Pengaturan", href: "/dashboard/settings" },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col border-r bg-card text-card-foreground">
      <div className="flex h-16 items-center px-6 border-b">
        <Library className="h-8 w-8 text-primary mr-2" />
        <span className="text-xl font-bold font-headline tracking-tight text-primary">Pustaka<span className="text-secondary">Nusa</span></span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Utama
        </div>
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground font-medium shadow-sm" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", pathname === item.href ? "text-primary" : "")} />
              {item.label}
            </Button>
          </Link>
        ))}

        <div className="mt-8 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sistem
        </div>
        {adminItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground font-medium shadow-sm" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", pathname === item.href ? "text-primary" : "")} />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-5 w-5" />
          Keluar
        </Button>
      </div>
    </div>
  )
}
