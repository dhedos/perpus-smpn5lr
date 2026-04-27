
"use client"

import { Bell, Search, User, Globe, Globe as GlobeIcon, Wifi, WifiOff, LogOut, Menu, UserCircle, Lock, Loader2, CheckCircle2, BookOpen, Users as UsersIcon, ArrowRight, X, Image as ImageIcon, Upload } from "lucide-react"
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
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { signOut, updatePassword } from "firebase/auth"
import { doc, updateDoc, collection } from "firebase/firestore"
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
  const [connectionType, setConnectionType] = useState<string>("4g")
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  
  const { user } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileData, setProfileData] = useState({
    name: "",
    photoURL: "",
    newPassword: ""
  })

  // Global Data for Search
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  
  const { data: allBooks } = useCollection(booksRef)
  const { data: allMembers } = useCollection(membersRef)

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return { books: [], members: [] }
    
    const queryStr = searchQuery.toLowerCase()
    
    const books = (allBooks || []).filter(b => 
      b.title?.toLowerCase().includes(queryStr) || 
      b.code?.toLowerCase().includes(queryStr) ||
      b.isbn?.toLowerCase().includes(queryStr)
    ).slice(0, 3)

    const members = (allMembers || []).filter(m => 
      m.name?.toLowerCase().includes(queryStr) || 
      m.memberId?.toLowerCase().includes(queryStr)
    ).slice(0, 3)

    return { books, members }
  }, [searchQuery, allBooks, allMembers])

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({ 
        ...prev, 
        name: user.displayNameCustom || "",
        photoURL: user.photoURLCustom || ""
      }))
    }
  }, [user])

  useEffect(() => {
    const updateConnectionInfo = () => {
      setIsOnline(navigator.onLine);
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        setConnectionType(conn.effectiveType || "4g");
      }
    };

    updateConnectionInfo();
    window.addEventListener('online', updateConnectionInfo);
    window.addEventListener('offline', updateConnectionInfo);
    
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', updateConnectionInfo);
    }

    return () => {
      window.removeEventListener('online', updateConnectionInfo);
      window.removeEventListener('offline', updateConnectionInfo);
      if (conn) {
        conn.removeEventListener('change', updateConnectionInfo);
      }
    }
  }, [])

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto'
      document.body.style.overflow = 'auto'
      
      const focusGuards = document.querySelectorAll('[data-radix-focus-guard]');
      focusGuards.forEach(el => (el as HTMLElement).remove());
    }
  }, [])

  useEffect(() => {
    if (!isProfileOpen && !isLogoutConfirmOpen && !isSheetOpen) {
      const timer = setTimeout(forceUnlockUI, 300)
      return () => clearTimeout(timer)
    }
  }, [isProfileOpen, isLogoutConfirmOpen, isSheetOpen, forceUnlockUI])

  const handleLogout = async () => {
    if (auth) {
      setIsLoggingOut(true)
      await signOut(auth)
      window.location.href = "/"
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 500 * 1024) { 
        toast({ title: "File Terlalu Besar", description: "Maksimal ukuran foto adalah 500KB untuk profil.", variant: "destructive" })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, photoURL: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user || !db || !auth.currentUser) return
    setIsSaving(true)

    try {
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, {
        name: profileData.name,
        photoURL: profileData.photoURL,
        updatedAt: new Date().toISOString()
      })

      if (profileData.newPassword) {
        if (profileData.newPassword.length < 6) {
          throw new Error("Password minimal 6 karakter.")
        }
        
        try {
          await updatePassword(auth.currentUser, profileData.newPassword)
          toast({
            title: "Profil & Password Diperbarui",
            description: "Semua perubahan telah disimpan dengan aman."
          })
        } catch (authError: any) {
          if (authError.code === 'auth/requires-recent-login') {
            toast({
              title: "Profil Disimpan, Tapi Password Gagal",
              description: "Foto dan nama berhasil diubah. Untuk mengganti password, silakan Keluar lalu Masuk kembali (Login Ulang).",
              variant: "destructive"
            })
          } else {
            throw authError
          }
        }
      } else {
        toast({
          title: "Profil Diperbarui",
          description: "Nama dan foto profil Anda telah berhasil disimpan."
        })
      }

      setIsProfileOpen(false)
      forceUnlockUI()
      setProfileData(prev => ({ ...prev, newPassword: "" }))
    } catch (error: any) {
      toast({
        title: "Gagal Memperbarui",
        description: error.message || "Terjadi kesalahan koneksi.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResultClick = (path: string) => {
    setSearchQuery("")
    setShowResults(false)
    router.push(path)
  }

  const getWifiStatus = () => {
    if (!isOnline) return { icon: <WifiOff className="h-4 w-4 text-destructive" />, label: "Offline" };
    
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        return { icon: <Wifi className="h-4 w-4 text-orange-500 opacity-60" />, label: "Sinyal Lemah" };
      case '3g':
        return { icon: <Wifi className="h-4 w-4 text-yellow-500" />, label: "Sinyal Sedang" };
      default:
        return { icon: <Wifi className="h-4 w-4 text-green-500" />, label: "Sinyal Kuat" };
    }
  }

  const wifiInfo = getWifiStatus();

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={(open) => { 
            setIsSheetOpen(open);
            if(!open) forceUnlockUI(); 
          }}>
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
              <SidebarNav onItemClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari buku, anggota..." 
            className="pl-10 bg-background/50 border-none ring-1 ring-border focus-visible:ring-primary/50 h-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
          />
          
          {showResults && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
              <div className="p-2 border-b bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Hasil Pencarian</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowResults(false)}><X className="h-3 w-3" /></Button>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto">
                {(searchResults.books.length > 0 || searchResults.members.length > 0) ? (
                  <>
                    {searchResults.books.length > 0 && (
                      <div className="p-2">
                        <p className="text-[10px] font-black text-primary uppercase px-2 mb-1">Buku</p>
                        {searchResults.books.map(b => (
                          <div key={b.id} onClick={() => handleResultClick(`/dashboard/books?q=${b.code}`)} className="p-3 hover:bg-slate-50 cursor-pointer rounded-lg flex items-center gap-3 group">
                            <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{b.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{b.code}</p>
                            </div>
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.members.length > 0 && (
                      <div className="p-2 border-t">
                        <p className="text-[10px] font-black text-secondary-foreground uppercase px-2 mb-1">Anggota</p>
                        {searchResults.members.map(m => (
                          <div key={m.id} onClick={() => handleResultClick(`/dashboard/members?q=${m.memberId}`)} className="p-3 hover:bg-slate-50 cursor-pointer rounded-lg flex items-center gap-3 group">
                            <UsersIcon className="h-4 w-4 text-muted-foreground group-hover:text-secondary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{m.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{m.memberId}</p>
                            </div>
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm italic">
                    Data tidak ditemukan.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 mr-2">
          <Badge variant="outline" className="gap-1.5 flex items-center px-2 py-0.5 border-none bg-transparent" title={wifiInfo.label}>
            {wifiInfo.icon}
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
                <AvatarImage src={user?.photoURLCustom || `https://picsum.photos/seed/${user?.uid}/200/200`} alt="User" />
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
                setTimeout(() => setIsProfileOpen(true), 100);
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
                setTimeout(() => setIsLogoutConfirmOpen(true), 100);
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
              Perbarui profil dan identitas akun Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4 mb-4">
               <Avatar className="h-24 w-24 border-4 border-slate-50 shadow-lg">
                  <AvatarImage src={profileData.photoURL || `https://picsum.photos/seed/${user?.uid}/200/200`} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {profileData.name?.[0] || "U"}
                  </AvatarFallback>
               </Avatar>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*" 
                 onChange={handleFileChange} 
               />
               <Button 
                variant="outline" 
                size="sm" 
                className="gap-2" 
                onClick={() => fileInputRef.current?.click()}
               >
                 <Upload className="h-3 w-3" /> Pilih Foto
               </Button>
            </div>
            
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
              <Label htmlFor="profile-photo" className="font-bold text-xs uppercase text-muted-foreground">URL Foto Profil (Opsional)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="profile-photo" 
                  value={profileData.photoURL.startsWith('data:') ? 'Foto terunggah' : profileData.photoURL} 
                  onChange={(e) => setProfileData(prev => ({ ...prev, photoURL: e.target.value }))}
                  className="pl-10 h-11 bg-slate-50 border-slate-200"
                  placeholder="https://link-foto.com/gambar.jpg"
                />
              </div>
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
              <p className="text-[10px] text-muted-foreground">Minimal 6 karakter. Jika ingin ganti password, pastikan Anda baru saja Login.</p>
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
              Apakah Anda yakin ingin keluar dari sistem? Sesi Anda akan diakhiri.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => forceUnlockUI()}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[100px]">
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Keluar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
