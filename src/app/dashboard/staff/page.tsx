
"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Search, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Lock,
  KeyRound,
  Send
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, useAuth } from "@/firebase"
import { collection, doc, deleteDoc, updateDoc, setDoc, query, where } from "firebase/firestore"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"
import { sendPasswordResetEmail, initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"

export default function StaffPage() {
  const db = useFirestore()
  const auth = useAuth()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Staff" as "Admin" | "Staff"
  })

  const usersCollectionRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'users')
  }, [db])

  const { data: allUsers, loading } = useCollection(usersCollectionRef)
  
  const staffMembers = useMemo(() => {
    if (!allUsers) return []
    return allUsers.filter(u => u.role === 'Admin' || u.role === 'Staff')
  }, [allUsers])

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(s => 
      (s.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (s.email?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [staffMembers, search])

  const handleRegisterStaff = async () => {
    if (!db) return
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Data Belum Lengkap", variant: "destructive" })
      return
    }

    setIsRegistering(true)
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary')
    const secondaryAuth = getAuth(secondaryApp)

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      )
      const uid = userCredential.user.uid

      const userDocRef = doc(db, 'users', uid)
      await setDoc(userDocRef, {
        id: uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      toast({ 
        title: "Berhasil!", 
        description: `Petugas ${formData.name} telah didaftarkan. Email reset password akan dikirimkan otomatis.` 
      })
      
      // Opsional: Kirim email reset agar user bisa ganti password sendiri
      await sendPasswordResetEmail(auth, formData.email)
      
      setIsOpen(false)
      setFormData({ name: "", email: "", password: "", role: "Staff" })
    } catch (error: any) {
      toast({ 
        title: "Pendaftaran Gagal", 
        description: error.message || "Pastikan email belum terdaftar.", 
        variant: "destructive" 
      })
    } finally {
      await deleteApp(secondaryApp)
      setIsRegistering(false)
    }
  }

  const handleSendResetEmail = async (email: string, id: string) => {
    if (!auth) return
    setIsSendingReset(id)
    try {
      await sendPasswordResetEmail(auth, email)
      toast({ 
        title: "Email Terkirim", 
        description: `Tautan pemulihan telah dikirim ke ${email}.` 
      })
    } catch (error: any) {
      toast({ 
        title: "Gagal Mengirim", 
        description: error.message, 
        variant: "destructive" 
      })
    } finally {
      setIsSendingReset(null)
    }
  }

  const handleDeleteStaff = (id: string) => {
    if (!db) return
    if (!confirm("Hapus petugas ini secara permanen?")) return
    
    const userDocRef = doc(db, 'users', id)
    deleteDoc(userDocRef).catch(async (error) => {
       const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Petugas Perpustakaan</h1>
          <p className="text-muted-foreground text-sm">Kelola akses petugas dan kirim instruksi pemulihan via email.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Daftarkan Petugas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Pendaftaran Petugas Baru</DialogTitle>
              <DialogDescription>
                Petugas akan menerima email untuk mengatur kata sandi mereka sendiri.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
                <Input 
                  id="name" 
                  placeholder="Nama Lengkap..." 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white h-11 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="font-bold text-xs uppercase text-muted-foreground">Peran / Hak Akses</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v: any) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Petugas (Staff)</SelectItem>
                    <SelectItem value="Admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-xs uppercase text-muted-foreground">Email Login</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="nama@email.com" 
                    className="pl-10 h-11 bg-white border-slate-200"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold text-xs uppercase text-muted-foreground">Kata Sandi Awal</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Minimal 6 karakter" 
                    className="pl-10 h-11 bg-white border-slate-200"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button onClick={handleRegisterStaff} disabled={isRegistering}>
                {isRegistering ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftarkan...</>
                ) : (
                  "Konfirmasi Pendaftaran"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari berdasarkan nama atau email..." 
            className="pl-10 bg-white" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Petugas</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Tidak ada petugas ditemukan.
                </TableCell>
              </TableRow>
            ) : filteredStaff.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <div className="font-semibold">{person.name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={person.role === 'Admin' ? 'default' : 'secondary'} className="gap-1">
                    <Shield className="h-3 w-3" />
                    {person.role.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="text-sm">{person.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                      onClick={() => handleSendResetEmail(person.email, person.id)}
                      disabled={isSendingReset === person.id}
                    >
                      {isSendingReset === person.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Reset Email</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteStaff(person.id)}>
                          <Trash2 className="h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
