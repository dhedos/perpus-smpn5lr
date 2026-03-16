
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
  Lock
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
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from "@/firebase"
import { collection, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"

// Firebase Auth logic for Admin adding users
import { initializeApp, deleteApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"

export default function StaffPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    staffId: "",
    role: "Staff" as "Admin" | "Staff"
  })

  const staffCollectionRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'staff')
  }, [db])

  const { data: staff = [], loading } = useCollection(staffCollectionRef)

  const filteredStaff = useMemo(() => {
    return staff.filter(s => 
      (s.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (s.staffId?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (s.email?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [staff, search])

  const handleRegisterStaff = async () => {
    if (!db) return
    if (!formData.name || !formData.email || !formData.password || !formData.staffId) {
      toast({ title: "Data Belum Lengkap", variant: "destructive" })
      return
    }

    setIsRegistering(true)
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary')
    const secondaryAuth = getAuth(secondaryApp)

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      )
      const uid = userCredential.user.uid

      // 2. Save user profile & role to Firestore
      const staffDocRef = doc(db, 'staff', uid)
      await setDoc(staffDocRef, {
        name: formData.name,
        email: formData.email,
        staffId: formData.staffId,
        role: formData.role,
        status: "Active",
        createdAt: new Date().toISOString()
      })

      toast({ 
        title: "Berhasil!", 
        description: `Petugas ${formData.name} telah didaftarkan sebagai ${formData.role}.` 
      })
      
      setIsOpen(false)
      setFormData({ name: "", email: "", password: "", staffId: "", role: "Staff" })
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

  const toggleStatus = (id: string, currentStatus: string) => {
    if (!db) return
    const staffDocRef = doc(db, 'staff', id)
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active"
    
    updateDoc(staffDocRef, { status: newStatus }).catch(async (error) => {
       const permissionError = new FirestorePermissionError({
        path: staffDocRef.path,
        operation: 'update',
        requestResourceData: { status: newStatus }
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
  }

  const handleDeleteStaff = (id: string) => {
    if (!db) return
    const staffDocRef = doc(db, 'staff', id)
    deleteDoc(staffDocRef).catch(async (error) => {
       const permissionError = new FirestorePermissionError({
        path: staffDocRef.path,
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
          <p className="text-muted-foreground text-sm">Hanya Admin yang dapat mendaftarkan petugas baru.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Daftarkan Petugas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pendaftaran Petugas Baru</DialogTitle>
              <DialogDescription>
                Akun ini akan langsung aktif dan bisa digunakan untuk login.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input 
                  id="name" 
                  placeholder="Nama Lengkap..." 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">ID Petugas / NIP</Label>
                  <Input 
                    id="staffId" 
                    placeholder="P001" 
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role Akses</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(v: any) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff">Petugas</SelectItem>
                      <SelectItem value="Admin">Admin Utama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Login</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="nama@smpn5.sch.id" 
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi Awal</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Minimal 6 karakter" 
                    className="pl-10"
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
            placeholder="Cari berdasarkan nama, ID, atau email..." 
            className="pl-10" 
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
              <TableHead>ID & Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Tidak ada petugas ditemukan.
                </TableCell>
              </TableRow>
            ) : filteredStaff.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <div className="font-semibold">{person.name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="font-mono w-fit">{person.staffId}</Badge>
                    <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                      <Shield className="h-3 w-3" />
                      {person.role.toUpperCase()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="text-sm">{person.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={person.status === "Active" ? "outline" : "destructive"}
                    className={cn(person.status === "Active" ? "border-green-500 text-green-600 bg-green-50" : "")}
                  >
                    {person.status === "Active" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => toggleStatus(person.id, person.status)}>
                        {person.status === "Active" ? (
                          <><UserX className="h-4 w-4 text-destructive" /> Nonaktifkan</>
                        ) : (
                          <><UserCheck className="h-4 w-4 text-green-600" /> Aktifkan</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteStaff(person.id)}>
                        <Trash2 className="h-4 w-4" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
