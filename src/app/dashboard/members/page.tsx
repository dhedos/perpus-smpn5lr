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
  QrCode,
  Printer,
  ChevronDown
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
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
import { useToast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, limit, orderBy } from 'firebase/firestore'

const INITIAL_MEMBER_DATA = {
  memberId: "",
  name: "",
  type: "Student",
  classPart: "",
  subjectPart: "",
  phone: "",
  joinDate: new Date().toISOString().split('T')[0]
}

export default function MembersPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [displayLimit, setDisplayLimit] = useState(50)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null)
  const [selectedMemberQr, setSelectedMemberQr] = useState<any>(null)
  
  const [formData, setFormData] = useState(INITIAL_MEMBER_DATA)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const membersCollectionQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, 'members'), 
      orderBy('createdAt', 'desc'), 
      limit(displayLimit)
    )
  }, [db, displayLimit])

  const { data: members, loading } = useCollection(membersCollectionQuery)

  const filteredMembers = useMemo(() => {
    if (!members) return []
    return members.filter(m => 
      (m.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (m.memberId?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [members, search])

  const forceUnlockUI = () => {
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto'
      }
    }, 100)
  }

  const handleSaveMember = () => {
    if (!db) return
    
    // Gabungkan Kelas dan Mapel dengan tanda miring agar formatnya standar VII/TIK
    const fullClassSubject = formData.classPart && formData.subjectPart 
      ? `${formData.classPart}/${formData.subjectPart}` 
      : (formData.classPart || formData.subjectPart || "");

    const dataToSave = { 
      memberId: formData.memberId,
      name: formData.name,
      type: formData.type,
      classOrSubject: fullClassSubject,
      phone: formData.phone,
      joinDate: formData.joinDate,
      createdAt: serverTimestamp() 
    }

    setIsOpen(false)
    forceUnlockUI()

    addDoc(collection(db, 'members'), dataToSave)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'members',
          operation: 'create',
          requestResourceData: dataToSave,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    toast({ title: "Berhasil!", description: "Anggota baru sedang didaftarkan." })
    setTimeout(() => { setFormData(INITIAL_MEMBER_DATA) }, 200)
  }

  const handleUpdateMember = () => {
    if (!db || !editingMemberId) return
    
    const fullClassSubject = formData.classPart && formData.subjectPart 
      ? `${formData.classPart}/${formData.subjectPart}` 
      : (formData.classPart || formData.subjectPart || "");

    const docRef = doc(db, 'members', editingMemberId)
    const dataToUpdate = { 
      memberId: formData.memberId,
      name: formData.name,
      type: formData.type,
      classOrSubject: fullClassSubject,
      phone: formData.phone,
      joinDate: formData.joinDate,
      updatedAt: serverTimestamp() 
    }

    setIsEditOpen(false)
    forceUnlockUI()

    updateDoc(docRef, dataToUpdate)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    toast({ title: "Berhasil!", description: "Data anggota telah diperbarui." })
    setTimeout(() => { setEditingMemberId(null); setFormData(INITIAL_MEMBER_DATA); }, 200)
  }

  const handleDeleteMember = () => {
    if (!db || !memberToDelete) return
    const docRef = doc(db, 'members', memberToDelete)
    setIsDeleteDialogOpen(false)
    forceUnlockUI()

    deleteDoc(docRef)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    toast({ title: "Terhapus", description: "Anggota sedang dihapus." })
    setTimeout(() => { setMemberToDelete(null) }, 200)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary">Daftar Anggota</h1>
          <p className="text-muted-foreground text-sm">Kelola data siswa dan guru yang terdaftar.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) { setFormData(INITIAL_MEMBER_DATA); forceUnlockUI(); } }}>
          <DialogTrigger asChild><Button className="gap-2"><UserPlus className="h-4 w-4" />Tambah Anggota</Button></DialogTrigger>
          <DialogContent className="bg-slate-50 max-w-md">
            <DialogHeader><DialogTitle>Daftarkan Anggota Baru</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs uppercase text-muted-foreground">ID Anggota (NIS/NIP)</Label>
                  <Input value={formData.memberId ?? ""} onChange={e => setFormData({...formData, memberId: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Contoh: 12345" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-xs uppercase text-muted-foreground">Tipe</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as any})}>
                    <SelectTrigger className="bg-white border-slate-300 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Student">Siswa</SelectItem><SelectItem value="Teacher">Guru</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
                <Input value={formData.name ?? ""} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Masukkan nama lengkap" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs uppercase text-muted-foreground">Kelas</Label>
                  <Input value={formData.classPart ?? ""} onChange={e => setFormData({...formData, classPart: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Contoh: VII" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-xs uppercase text-muted-foreground">Mapel</Label>
                  <Input value={formData.subjectPart ?? ""} onChange={e => setFormData({...formData, subjectPart: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Contoh: TIK" />
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleSaveMember} className="w-full sm:w-auto h-11 px-8 shadow-lg shadow-primary/20">Simpan Anggota</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 rounded-xl shadow-sm border-none bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari anggota berdasarkan nama atau ID..." className="pl-10 h-11 border-slate-200" value={search ?? ""} onChange={e => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">No.</TableHead>
              <TableHead>Identitas</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kelas/Mapel</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredMembers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Belum ada anggota terdaftar.</TableCell></TableRow>
            ) : filteredMembers.map((member, index) => (
              <TableRow key={member.id}>
                <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-semibold leading-tight">{member.name ?? ""}</div>
                    <div className="text-xs text-primary font-bold font-mono">{member.memberId ?? ""}</div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold">{member.type === 'Teacher' ? 'GURU' : 'SISWA'}</Badge></TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{member.classOrSubject || '-'}</div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setSelectedMemberQr(member); 
                          setIsQrOpen(true);
                        }, 10);
                      }}><QrCode className="h-4 w-4 mr-2" />Kartu QR</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setEditingMemberId(member.id); 
                          const parts = (member.classOrSubject || "").split('/');
                          setFormData({
                            memberId: member.memberId || "",
                            name: member.name || "",
                            type: (member.type as any) || "Student",
                            classPart: parts[0] || "",
                            subjectPart: parts[1] || "",
                            phone: member.phone || "",
                            joinDate: member.joinDate || new Date().toISOString().split('T')[0]
                          }); 
                          setIsEditOpen(true);
                        }, 10);
                      }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => { 
                        setTimeout(() => {
                          setMemberToDelete(member.id); 
                          setIsDeleteDialogOpen(true);
                        }, 10);
                      }}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {members && members.length >= displayLimit && (
          <div className="p-4 text-center border-t bg-slate-50">
            <Button variant="ghost" size="sm" onClick={() => setDisplayLimit(prev => prev + 50)} className="text-primary font-bold">
              <ChevronDown className="h-4 w-4 mr-2" /> Muat Lebih Banyak
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={isQrOpen} onOpenChange={(v) => { setIsQrOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Kartu Digital Anggota</DialogTitle></DialogHeader>
          <div className="bg-white p-6 rounded-xl border-2 border-primary/20 space-y-4 shadow-xl">
            <div className="flex justify-center">{selectedMemberQr && <QRCodeSVG value={selectedMemberQr.memberId} size={250} level="H" includeMargin />}</div>
            <div>
              <div className="font-bold text-lg leading-tight">{selectedMemberQr?.name ?? ""}</div>
              <div className="font-mono text-primary font-bold">{selectedMemberQr?.memberId ?? ""}</div>
              <div className="text-xs text-muted-foreground mt-1">{selectedMemberQr?.classOrSubject}</div>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Cetak</Button>
            <Button onClick={() => setIsQrOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if(!v) { setFormData(INITIAL_MEMBER_DATA); setEditingMemberId(null); forceUnlockUI(); } }}>
        <DialogContent className="bg-slate-50 max-w-md">
          <DialogHeader><DialogTitle>Ubah Data Anggota</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
              <Input value={formData.name ?? ""} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Kelas</Label>
                <Input value={formData.classPart ?? ""} onChange={e => setFormData({...formData, classPart: e.target.value})} className="bg-white border-slate-300 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Mapel</Label>
                <Input value={formData.subjectPart ?? ""} onChange={e => setFormData({...formData, subjectPart: e.target.value})} className="bg-white border-slate-300 h-11" />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateMember} className="w-full h-11">Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(v) => { setIsDeleteDialogOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>Data identitas akan dihapus. Pastikan anggota ini sudah tidak memiliki pinjaman aktif.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setMemberToDelete(null); forceUnlockUI(); }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
