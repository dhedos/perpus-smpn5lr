
"use client"

import { Bell, Search, User, Globe, Globe as GlobeIcon, Wifi, WifiOff, LogOut, Menu, UserCircle, Lock, Loader2, CheckCircle2 } from "lucide-react"
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
import { useUser, useAuth, useFirestore } from "@/firebase"
import { signOut, updatePassword } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { SidebarNav } from "./SidebarNav"
import { useToast } from "@/hooks/use-toast"

export function TopNav() {
  const [isOnline, setIsOnline] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [profileData, setProfileData] = useState({
    name: "",
    newPassword: ""
  })

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({ ...prev, name: user.displayNameCustom || "" }))
    }
  }, [user])

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

  // Fungsi pengaman untuk melepas kunci interaksi layar secara paksa
  const forceUnlockUI = () => {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto'
        document.body.style.overflow = 'auto'
      }, 50)
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/")
    }
  }

  const handleUpdateProfile = async () => {
    if (!user || !db || !auth.currentUser) return
    setIsSaving(true)

    try {
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, {
        name: profileData.name,
        updatedAt: new Date().toISOString()
      })

      if (profileData.newPassword) {
        if (profileData.newPassword.length < 6) {
          throw new Error("Password minimal 6 karakter.")
        }
        await updatePassword(auth.currentUser, profileData.newPassword)
      }

      toast({
        title: "Profil Diperbarui",
        description: "Nama dan pengaturan Anda telah berhasil disimpan."
      })
      setIsProfileOpen(false)
      forceUnlockUI()
      setProfileData(prev => ({ ...prev, newPassword: "" }))
    } catch (error: any) {
      toast({
        title: "Gagal Memperbarui",
        description: error.message || "Terjadi kesalahan. Jika ingin ganti password, Anda mungkin perlu login ulang.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="md:hidden">
          <Sheet onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
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

        <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 flex items-center gap-3 px-2 hover:bg-transparent">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold leading-none tracking-tight">
                  {user?.displayNameCustom || "Petugas"}
                </p>
                <p className="text-[10px] leading-none text-muted-foreground mt-1.5 uppercase">
                  {user?.role || "Staff"}
                </p>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200/200`} alt="User" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.displayNameCustom?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none">{user?.displayNameCustom}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => {
                  setIsProfileOpen(true);
                }, 150);
              }} 
              className="py-2.5 cursor-pointer"
            >
              <UserCircle className="h-4 w-4 mr-2 text-primary" />
              Profil Saya
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => {
                  setIsLogoutConfirmOpen(true);
                }, 150);
              }} 
              className="text-destructive focus:text-destructive py-2.5 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={(v) => { setIsProfileOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserCircle className="h-5 w-5" />
              Pengaturan Profil
            </DialogTitle>
            <DialogDescription>
              Perbarui nama tampilan dan kata sandi akun Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="font-bold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
              <Input 
                id="profile-name" 
                value={profileData.name} 
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-pass" className="font-bold text-xs uppercase text-muted-foreground">Kata Sandi Baru (Opsional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="profile-pass" 
                  type="password"
                  placeholder="Kosongkan jika tidak ingin ganti"
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="pl-10 h-11 bg-slate-50 border-slate-200"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Minimal 6 karakter untuk keamanan.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsProfileOpen(false); forceUnlockUI(); }}>Batal</Button>
            <Button onClick={handleUpdateProfile} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isLogoutConfirmOpen} onOpenChange={(v) => { setIsLogoutConfirmOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin keluar dari sistem Pustaka Nusantara? Sesi Anda akan diakhiri.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => forceUnlockUI()}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
