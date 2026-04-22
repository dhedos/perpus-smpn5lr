
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
  ChevronDown,
  X
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
  useDoc,
  errorEmitter 
} from '@/firebase'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, limit, orderBy } from 'firebase/firestore'

const INITIAL_MEMBER_DATA = {
  memberId: "",
  name: "",
  type: "Student" as "Student" | "Teacher",
  classPart: "",
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

  // Load Settings for Card Header
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

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
      (m.memberId?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.classOrSubject?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [members, search])

  const forceUnlockUI = () => {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto'
      }, 100)
    }
  }

  const handlePrintIdCard = () => {
    if (!selectedMemberQr) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const cardHtml = `
      <html>
        <head>
          <title>Cetak Kartu Anggota - ${selectedMemberQr.name}</title>
          <style>
            @page { size: 54mm 86mm; margin: 0; }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Inter', -apple-system, sans-serif; 
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #f0f0f0;
            }
            .card-container {
              width: 54mm;
              height: 86mm;
              background: #fff;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
              overflow: hidden;
              border: 0.1mm solid #ccc;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              width: 100%;
              padding: 12px 0 6px 0;
              text-align: center;
            }
            .school-name {
              font-size: 11px;
              font-weight: 900;
              color: #1e4b8f;
              text-transform: uppercase;
              line-height: 1.1;
            }
            .school-address {
              font-size: 6px;
              font-weight: 600;
              color: #888;
              margin-top: 2px;
            }
            .divider {
              width: 100%;
              height: 6px;
              background: #1e4b8f !important;
              margin-bottom: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card-title {
              font-size: 9px;
              font-weight: 800;
              margin-bottom: 8px;
              color: #333;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .qr-wrapper {
              margin-bottom: 8px;
              display: flex;
              justify-content: center;
            }
            .qr-code {
              width: 42mm;
              height: 42mm;
              display: block;
            }
            .member-info {
              text-align: center;
              width: 100%;
              padding: 0 5px;
            }
            .member-name {
              font-size: 13px;
              font-weight: 900;
              color: #000;
              margin-bottom: 1px;
              text-transform: uppercase;
              line-height: 1.1;
            }
            .member-id {
              font-size: 14px;
              font-weight: 900;
              color: #1e4b8f;
              font-family: monospace;
              margin-bottom: 0px;
            }
            .member-class {
              font-size: 8px;
              color: #666;
              font-weight: 800;
              text-transform: uppercase;
            }
            .footer {
              width: 100%;
              background: #1e4b8f !important;
              color: #ffffff !important;
              font-size: 11px;
              padding: 10px 0;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              position: absolute;
              bottom: 0;
              text-align: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              body { background: none; }
              .card-container { border: 0.1mm solid #ccc; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card-container">
            <div class="header">
              <div class="school-name">${settings?.schoolName || 'SMPN 5 LANGKE REMBONG'}</div>
              <div class="school-address">Mando, Compang Carep Kab. Manggarai NTT</div>
            </div>
            <div class="divider"></div>
            <div class="card-title">KARTU ANGGOTA PERPUSTAKAAN</div>
            <div class="qr-wrapper">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${selectedMemberQr.memberId}" class="qr-code" />
            </div>
            <div class="member-info">
              <div class="member-name">${selectedMemberQr.name}</div>
              <div class="member-id">${selectedMemberQr.memberId}</div>
              <div class="member-class">KELAS: ${selectedMemberQr.classOrSubject || '-'}</div>
            </div>
            <div class="footer">PUSTAKA NUSANTARA</div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(cardHtml)
    printWindow.document.close()
  }

  const handleSaveMember = () => {
    if (!db) return
    
    const dataToSave = { 
      memberId: formData.memberId,
      name: formData.name,
      type: formData.type,
      classOrSubject: formData.classPart || "",
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
    toast({ title: "Berhasil!", description: "Anggota baru telah didaftarkan." })
    setTimeout(() => { setFormData(INITIAL_MEMBER_DATA) }, 200)
  }

  const handleUpdateMember = () => {
    if (!db || !editingMemberId) return
    
    const docRef = doc(db, 'members', editingMemberId)
    const dataToUpdate = { 
      memberId: formData.memberId,
      name: formData.name,
      type: formData.type,
      classOrSubject: formData.classPart || "",
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
    toast({ title: "Terhapus", description: "Anggota telah dihapus." })
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
          <DialogTrigger asChild><Button className="gap-2"><UserPlus className="h-4 w-4" /> Tambah Anggota</Button></DialogTrigger>
          <DialogContent className="bg-slate-50 max-w-md">
            <DialogHeader><DialogTitle>Daftarkan Anggota Baru</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs uppercase text-muted-foreground">ID Anggota (NIS/NIP)</Label>
                  <Input value={formData.memberId ?? ""} onChange={e => setFormData({...formData, memberId: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="NIS/NIP" />
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
                <Input value={formData.name ?? ""} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Kelas</Label>
                <Input value={formData.classPart ?? ""} onChange={e => setFormData({...formData, classPart: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Masukkan Kelas (Contoh: VII A)" />
              </div>
            </div>
            <DialogFooter><Button onClick={handleSaveMember} className="w-full sm:w-auto h-11 px-8 shadow-lg shadow-primary/20">Simpan Anggota</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 rounded-xl shadow-sm border-none bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari anggota berdasarkan nama, ID, atau kelas..." className="pl-10 h-11 border-slate-200" value={search ?? ""} onChange={e => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">No.</TableHead>
              <TableHead>Nama Anggota</TableHead>
              <TableHead>ID Anggota</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredMembers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada anggota terdaftar.</TableCell></TableRow>
            ) : filteredMembers.map((member, index) => (
              <TableRow key={member.id}>
                <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-semibold">{member.name ?? ""}</TableCell>
                <TableCell className="font-mono text-xs text-primary font-bold">{member.memberId ?? ""}</TableCell>
                <TableCell><Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold border-none">{member.type === 'Teacher' ? 'GURU' : 'SISWA'}</Badge></TableCell>
                <TableCell className="text-sm font-medium">{member.classOrSubject || '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setSelectedMemberQr(member); 
                          setIsQrOpen(true);
                        }, 10);
                      }}><QrCode className="h-4 w-4 mr-2" /> Kartu QR</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setEditingMemberId(member.id); 
                          setFormData({
                            memberId: member.memberId || "",
                            name: member.name || "",
                            type: (member.type as any) || "Student",
                            classPart: member.classOrSubject || "",
                            phone: member.phone || "",
                            joinDate: member.joinDate || new Date().toISOString().split('T')[0]
                          }); 
                          setIsEditOpen(true);
                        }, 10);
                      }}><Edit className="h-4 w-4 mr-2" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => { 
                        setTimeout(() => {
                          setMemberToDelete(member.id); 
                          setIsDeleteDialogOpen(true);
                        }, 10);
                      }}><Trash2 className="h-4 w-4 mr-2" /> Hapus</DropdownMenuItem>
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
              <div className="text-xs text-muted-foreground mt-1">Kelas: {selectedMemberQr?.classOrSubject}</div>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handlePrintIdCard}><Printer className="h-4 w-4 mr-2" /> Cetak Kartu</Button>
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
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Kelas</Label>
              <Input value={formData.classPart ?? ""} onChange={e => setFormData({...formData, classPart: e.target.value})} className="bg-white border-slate-300 h-11" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateMember} className="w-full h-11">Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(v) => { setIsDeleteDialogOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>Data identitas akan dihapus secara permanen.</AlertDialogDescription>
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
