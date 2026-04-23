
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  ArrowLeftRight, 
  BarChart3, 
  Settings,
  Database,
  LogOut,
  UserCog,
  ClipboardCheck,
  Library,
  GraduationCap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const menuItems = [
  { icon: LayoutDashboard, label: "Beranda", href: "/dashboard" },
  { icon: BookOpen, label: "Koleksi Buku", href: "/dashboard/books" },
  { icon: Users, label: "Daftar Anggota", href: "/dashboard/members" },
  { icon: GraduationCap, label: "Buku Pegangan Guru", href: "/dashboard/teacher-loans" },
  { icon: ArrowLeftRight, label: "Pinjam & Kembali", href: "/dashboard/transactions" },
  { icon: BarChart3, label: "Laporan", href: "/dashboard/reports" },
]

const administrationItems = [
  { icon: ClipboardCheck, label: "Cek Stok (Opname)", href: "/dashboard/stock-opname" },
  { icon: UserCog, label: "Data Petugas", href: "/dashboard/staff", adminOnly: true },
  { icon: Database, label: "Sinkronisasi Data", href: "/dashboard/sync" },
  { icon: Settings, label: "Pengaturan Sistem", href: "/dashboard/settings" },
]

export function SidebarNav() {
  const pathname = usePathname()
  const auth = useAuth()
  const { isAdmin } = useUser()

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      window.location.href = "/"
    }
  }

  return (
    <div className="flex h-full flex-col bg-card text-card-foreground border-r">
      <div className="flex h-20 items-center px-4 shrink-0 gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Library className="h-8 w-8" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black leading-tight text-primary tracking-tight uppercase">PUSTAKA NUSANTARA</span>
          <span className="text-[10px] font-bold leading-tight text-secondary uppercase tracking-widest">SMPN 5 LANGKE REMBONG</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="mb-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
          Menu Utama
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
              <span className="text-sm">{item.label}</span>
            </Button>
          </Link>
        ))}

        <div className="mt-8 mb-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
          Administrasi
        </div>
        {administrationItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent text-accent-foreground font-medium shadow-sm" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", pathname === item.href ? "text-primary" : "")} />
                <span className="text-sm">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>

      <div className="p-4 shrink-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Keluar</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase tracking-tight text-primary">Konfirmasi Keluar</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin mengakhiri sesi pengerjaan di Pustaka Nusantara?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold">
                Ya, Keluar Sekarang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
