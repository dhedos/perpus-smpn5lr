
"use client"

import { Bell, Search, User, Globe, Wifi, WifiOff, LogOut, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { useUser, useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { SidebarNav } from "./SidebarNav"

export function TopNav() {
  const [isOnline, setIsOnline] = useState(true)
  const { user } = useUser()
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/")
    }
  }

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Buka Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigasi Menu</SheetTitle>
                <SheetDescription>Akses cepat ke seluruh fitur perpustakaan.</SheetDescription>
              </SheetHeader>
              <SidebarNav />
            </SheetContent>
          </Sheet>
        </div>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari buku, anggota..." 
            className="pl-10 bg-background/50 border-none ring-1 ring-border focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 mr-2">
          <Badge variant={isOnline ? "outline" : "destructive"} className="gap-1.5 flex items-center px-2 py-0.5 border-none bg-transparent">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 flex items-center gap-3 px-2 hover:bg-transparent">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold leading-none uppercase tracking-tight">
                  {user?.displayNameCustom || "Petugas"}
                </p>
                <p className="text-[10px] leading-none text-muted-foreground mt-1.5">
                  {user?.role || "Staff"}
                </p>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200/200`} alt="User" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.displayNameCustom?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayNameCustom}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
