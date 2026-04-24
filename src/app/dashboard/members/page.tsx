
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
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
  joinDate: ""
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
  const [isMounted, setIsMounted] = useState(false)

  /**
   * AGGRESSIVE UI UNLOCKER
   * Membersihkan paksa pengunci interaksi browser yang ditinggalkan Radix UI.
   */
  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        const overlays = document.querySelectorAll('[data-radix-focus-guard], [data-radix-portal]');
        overlays.forEach(el => (el as HTMLElement).remove());
      }, 50);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true)
    forceUnlockUI()
  }, [forceUnlockUI])

  // Load Settings for Header & Title
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

  const handleOpenAdd = () => {
    setFormData({
      ...INITIAL_MEMBER_DATA,
      joinDate: isMounted ? new Date().toISOString().split('T')[0] : ""
    });
    setIsOpen(true);
  }

  const handlePrintTable = (type: 'Student' | 'Teacher') => {
    const targetData = filteredMembers.filter(m => m.type === type)
    if (targetData.length === 0) {
      toast({ title: "Data Kosong", description: `Tidak ada data ${type === 'Student' ? 'Siswa' : 'Guru'} untuk dicetak.` })
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const labelType = type === 'Student' ? 'SISWA' : 'GURU'
    const classLabel = type === 'Student' ? 'Kelas' : 'Mengajar / Kelas'

    const rowsHtml = targetData.map((m, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-family: monospace;">${m.memberId}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${m.name}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${m.classOrSubject || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${m.phone || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${m.joinDate || '-'}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 12px; margin: 0; padding: 15mm; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .school-name { font-size: 18px; font-weight: 900; text-transform: uppercase; }
            .title { text-align: center; font-size: 14px; font-weight: 800; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10px; }
            .footer { margin-top: 40px; float: right; text-align: center; width: 250px; }
            .print-footer { position: fixed; bottom: 5mm; left: 15mm; right: 15mm; font-size: 8px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>${settings?.govtInstitution || 'PEMERINTAH KABUPATEN MANGGARAI'}</div>
            <div>${settings?.eduDept || 'DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA'}</div>
            <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
            <div style="font-size: 10px;">${settings?.schoolAddress || 'Mando, Kelurahan Compang Carep'}</div>
          </div>
          <div class="title">DAFTAR ANGGOTA PERPUSTAKAAN (${labelType})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>ID Anggota</th>
                <th>Nama Lengkap</th>
                <th>${classLabel}</th>
                <th>No. Telepon</th>
                <th>Tgl Terdaftar</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">
            ${settings?.reportCity || 'Mando'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Kepala Sekolah,<br/><br/><br/><br/>
            <strong>${settings?.principalName || 'Lodovikus Jangkar, S.Pd.Gr'}</strong><br/>
            NIP. ${settings?.principalNip || '198507272011011020'}
          </div>
          <div class="print-footer">LANTERA BACA - ${settings?.librarySubtitle || 'SMPN 5 LANGKE REMBONG'} | Daftar Anggota ${labelType}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const handlePrintSingleCard = (member: any) => {
    if (!member) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { size: 85mm 54mm; margin: 0; }
            body { margin: 0; padding: 0; background: #fff; font-family: 'Inter', sans-serif; }
            .id-card { 
              width: 85mm; 
              height: 54mm; 
              border: 0.5pt solid #000; 
              padding: 4mm; 
              box-sizing: border-box; 
              display: flex;
              flex-direction: column;
              background: #fff;
              position: relative;
              overflow: hidden;
            }
            .card-header { text-align: center; border-bottom: 1pt solid #2E6ECE; padding-bottom: 2mm; margin-bottom: 3mm; }
            .school-name { font-size: 8pt; font-weight: 800; color: #2E6ECE; text-transform: uppercase; line-height: 1.1; }
            .lib-name { font-size: 7pt; font-weight: 600; color: #444; }
            .card-body { display: flex; gap: 4mm; align-items: center; flex: 1; }
            .qr-side { width: 25mm; display: flex; flex-direction: column; align-items: center; gap: 1mm; }
            .qr-side img { width: 22mm; height: 22mm; border: 0.5pt solid #eee; }
            .member-id-text { font-size: 8pt; font-weight: 900; font-family: monospace; color: #2E6ECE; }
            .info-side { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1.5mm; }
            .info-label { font-size: 5pt; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: -0.5mm; }
            .info-value { font-size: 9pt; font-weight: 800; color: #000; line-height: 1; }
            .info-sub { font-size: 7pt; font-weight: 600; color: #666; }
            .card-footer { position: absolute; bottom: 2mm; right: 4mm; text-align: right; font-size: 5pt; color: #ccc; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="id-card">
            <div class="card-header">
              <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
              <div class="lib-name">KARTU ANGGOTA PERPUSTAKAAN ${settings?.libraryName || 'LANTERA BACA'}</div>
            </div>
            <div class="card-body">
              <div class="qr-side">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${member.memberId}" />
                <div class="member-id-text">${member.memberId}</div>
              </div>
              <div class="info-side">
                <div>
                  <div class="info-label">Nama Lengkap</div>
                  <div class="info-value">${member.name}</div>
                </div>
                <div>
                  <div class="info-label">${member.type === 'Teacher' ? 'NIP / Jabatan' : 'Kelas / NIS'}</div>
                  <div class="info-value">${member.classOrSubject || '-'}</div>
                </div>
                <div>
                  <div class="info-label">Kategori</div>
                  <div class="badge-type" style="font-size: 7pt; font-weight: bold; color: #2E6ECE; text-transform: uppercase;">
                    ${member.type === 'Teacher' ? 'GURU / STAFF' : 'SISWA'}
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer">E-CARD V.1.0</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
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
        <div className="flex gap-2">
          <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Cetak Daftar Anggota
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePrintTable('Student')}>
                Daftar Siswa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintTable('Teacher')}>
                Daftar Guru
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleOpenAdd} className="gap-2">
            <UserPlus className="h-4 w-4" /> Tambah Anggota
          </Button>
        </div>
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
              <TableHead>Kategori</TableHead>
              <TableHead>Mengajar / Kelas</TableHead>
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
                  <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
                        setTimeout(() => {
                          setSelectedMemberQr(member); 
                          setIsQrOpen(true);
                        }, 100);
                      }}><QrCode className="h-4 w-4 mr-2" /> Kartu QR</DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
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
                        }, 100);
                      }}><Edit className="h-4 w-4 mr-2" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
                        setTimeout(() => {
                          setMemberToDelete(member.id); 
                          setIsDeleteDialogOpen(true);
                        }, 100);
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

      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="bg-slate-50 max-w-md border-none">
          <DialogHeader>
            <DialogTitle>Daftarkan Anggota Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">ID Anggota (NIS/NIP)</Label>
                <Input value={formData.memberId ?? ""} onChange={e => setFormData({...formData, memberId: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="NIS/NIP" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Kategori</Label>
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
              <Label className="font-semibold text-xs uppercase text-muted-foreground">
                {formData.type === 'Teacher' ? 'Mengajar / Kelas' : 'Kelas'}
              </Label>
              <Input 
                value={formData.classPart ?? ""} 
                onChange={e => setFormData({...formData, classPart: e.target.value})} 
                className="bg-white border-slate-300 h-11" 
                placeholder={formData.type === 'Teacher' ? "Cth: BAHASA INGGRIS/VII" : "Cth: VII A"} 
              />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveMember} className="w-full sm:w-auto h-11 px-8 shadow-lg shadow-primary/20">Simpan Anggota</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={(v) => { setIsQrOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md text-center border-none p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 bg-white shrink-0 border-b">
            <DialogTitle className="text-center font-bold text-primary">Kartu Digital Anggota</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="bg-white p-8 rounded-3xl border-2 border-primary/20 space-y-4 shadow-xl flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border shadow-inner">
                {selectedMemberQr && <QRCodeSVG value={selectedMemberQr.memberId} size={200} level="H" includeMargin />}
              </div>
              <div className="space-y-1">
                <div className="font-black text-2xl leading-tight uppercase tracking-tight">{selectedMemberQr?.name ?? ""}</div>
                <div className="font-mono text-primary font-black text-xl">{selectedMemberQr?.memberId ?? ""}</div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{selectedMemberQr?.classOrSubject}</div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => { setIsQrOpen(false); forceUnlockUI(); }} className="h-12 rounded-xl font-bold">Tutup</Button>
            <Button onClick={() => handlePrintSingleCard(selectedMemberQr)} className="h-12 gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold">
              <Printer className="h-4 w-4" /> Cetak Kartu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="bg-slate-50 max-md border-none">
          <DialogHeader>
            <DialogTitle>Ubah Data Anggota</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Kategori</Label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as any})}>
                <SelectTrigger className="bg-white border-slate-300 h-11"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Student">Siswa</SelectItem><SelectItem value="Teacher">Guru</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
              <Input value={formData.name ?? ""} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">
                {formData.type === 'Teacher' ? 'Mengajar / Kelas' : 'Kelas'}
              </Label>
              <Input 
                value={formData.classPart ?? ""} 
                onChange={e => setFormData({...formData, classPart: e.target.value})} 
                className="bg-white border-slate-300 h-11" 
                placeholder={formData.type === 'Teacher' ? "Cth: BAHASA INGGRIS/VII" : "Cth: VII A"} 
              />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateMember} className="w-full h-11">Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(v) => { setIsDeleteDialogOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-primary uppercase tracking-tight">Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>Data identitas akan dihapus secara permanen dari database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => { setMemberToDelete(null); forceUnlockUI(); }} className="rounded-xl font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
