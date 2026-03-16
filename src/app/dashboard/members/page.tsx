
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
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  Loader2,
  Phone,
  GraduationCap,
  School
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
import { Card } from "@/components/ui/card"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function MembersPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    memberId: "",
    name: "",
    type: "Student",
    classOrSubject: "",
    phone: "",
    joinDate: new Date().toISOString().split('T')[0]
  })

  // Get members from Firestore
  const membersCollectionRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'members')
  }, [db])

  const { data: members = [], loading } = useCollection(membersCollectionRef)

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      (m.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (m.memberId?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [members, search])

  const handleSaveMember = () => {
    if (!db || !membersCollectionRef) return
    if (!formData.name || !formData.memberId) {
      toast({ title: "Data Belum Lengkap", description: "Nama dan ID Anggota wajib diisi.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    
    addDoc(membersCollectionRef, {
      ...formData,
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Berhasil!", description: "Anggota baru telah ditambahkan." })
      setIsOpen(false)
      setFormData({
        memberId: "",
        name: "",
        type: "Student",
        classOrSubject: "",
        phone: "",
        joinDate: new Date().toISOString().split('T')[0]
      })
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: membersCollectionRef.path,
        operation: 'create',
        requestResourceData: formData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsSaving(false)
    })
  }

  const handleDeleteMember = (id: string) => {
    if (!db) return
    const memberDocRef = doc(db, 'members', id)
    
    deleteDoc(memberDocRef).catch(async (error) => {
       const permissionError = new FirestorePermissionError({
        path: memberDocRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Keanggotaan</h1>
          <p className="text-muted-foreground text-sm">Kelola data siswa dan guru yang terdaftar sebagai anggota.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Tambah Anggota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Daftarkan Anggota Baru</DialogTitle>
              <DialogDescription>Lengkapi data diri anggota sesuai kartu identitas sekolah.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberId">ID Anggota (NIS/NIP)</Label>
                  <Input 
                    id="memberId" 
                    placeholder="2024001" 
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipe Anggota</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Siswa</SelectItem>
                      <SelectItem value="Teacher">Guru</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input 
                  id="name" 
                  placeholder="Masukkan nama lengkap..." 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Kelas / Mata Pelajaran</Label>
                <Input 
                  id="class" 
                  placeholder="Contoh: XI-IPA-1 atau Matematika" 
                  value={formData.classOrSubject}
                  onChange={(e) => setFormData({ ...formData, classOrSubject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon / WhatsApp</Label>
                <Input 
                  id="phone" 
                  placeholder="0812..." 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button onClick={handleSaveMember} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Anggota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari berdasarkan nama atau ID anggota..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identitas</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kelas/Mapel</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Tgl Gabung</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                </TableCell>
              </TableRow>
            ) : filteredMembers.length === 0 ? (
               <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <p className="text-sm text-muted-foreground">Tidak ada anggota ditemukan.</p>
                </TableCell>
              </TableRow>
            ) : filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{member.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{member.memberId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.type === 'Teacher' ? 'secondary' : 'outline'}>
                    {member.type === 'Teacher' ? <School className="h-3 w-3 mr-1" /> : <GraduationCap className="h-3 w-3 mr-1" />}
                    {member.type === 'Teacher' ? 'Guru' : 'Siswa'}
                  </Badge>
                </TableCell>
                <TableCell>{member.classOrSubject || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 mr-1" />
                    {member.phone || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{member.joinDate}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Edit className="h-4 w-4" /> Ubah
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2 text-destructive"
                        onClick={() => handleDeleteMember(member.id)}
                      >
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
