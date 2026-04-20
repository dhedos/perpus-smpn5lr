
"use client"

import { useState, useMemo, useEffect } from "react"
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
  Download,
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
import { QRCodeSVG } from "qrcode.react"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function MembersPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [selectedMemberQr, setSelectedMemberQr] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    memberId: "",
    name: "",
    type: "Student",
    classOrSubject: "",
    phone: "",
    joinDate: new Date().toISOString().split('T')[0]
  })

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const membersCollectionRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'members')
  }, [db])

  const { data: members, loading } = useCollection(membersCollectionRef)

  const filteredMembers = useMemo(() => {
    if (!members) return []
    return members.filter(m => 
      (m.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (m.memberId?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [members, search])

  const handleSaveMember = () => {
    if (!db || !membersCollectionRef) return
    setIsSaving(true)
    addDoc(membersCollectionRef, { ...formData, createdAt: serverTimestamp() })
      .then(() => {
        toast({ title: "Berhasil!", description: "Anggota ditambahkan." })
        setIsOpen(false)
        setFormData({ memberId: "", name: "", type: "Student", classOrSubject: "", phone: "", joinDate: new Date().toISOString().split('T')[0] })
      })
      .finally(() => setIsSaving(false))
  }

  const handleUpdateMember = () => {
    if (!db || !editingMemberId) return
    setIsSaving(true)
    const ref = doc(db, 'members', editingMemberId)
    updateDoc(ref, { ...formData, updatedAt: serverTimestamp() })
      .then(() => {
        toast({ title: "Berhasil!", description: "Data diperbarui." })
        setIsEditOpen(false)
      })
      .finally(() => setIsSaving(false))
  }

  const downloadQrAsImage = () => {
    const svg = document.querySelector("#member-qr svg")
    if (!svg) return
    const canvas = document.createElement("canvas")
    const img = new Image()
    img.onload = () => {
      canvas.width = 1000; canvas.height = 1000
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1000, 1000)
        ctx.drawImage(img, 0, 0, 1000, 1000)
        const a = document.createElement("a")
        a.href = canvas.toDataURL("image/png")
        a.download = `QR_Member_${selectedMemberQr.memberId}.png`
        a.click()
      }
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary">Daftar Anggota</h1>
          <p className="text-muted-foreground text-sm">Kelola data siswa dan guru yang terdaftar.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button className="gap-2"><UserPlus className="h-4 w-4" />Tambah Anggota</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Daftarkan Anggota Baru</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>ID Anggota</Label><Input value={formData.memberId} onChange={e => setFormData({...formData, memberId: e.target.value})} /></div>
                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Student">Siswa</SelectItem><SelectItem value="Teacher">Guru</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Nama</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Kelas/Mapel</Label><Input value={formData.classOrSubject} onChange={e => setFormData({...formData, classOrSubject: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={handleSaveMember} disabled={isSaving}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card p-4 rounded-xl shadow-sm"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari anggota..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      <Card className="border-none shadow-sm">
        <Table>
          <TableHeader><TableRow><TableHead>Identitas</TableHead><TableHead>Tipe</TableHead><TableHead>Kelas/Mapel</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell><div><p className="font-semibold">{member.name}</p><p className="text-xs text-primary font-bold">{member.memberId}</p></div></TableCell>
                <TableCell><Badge variant="outline">{member.type === 'Teacher' ? 'Guru' : 'Siswa'}</Badge></TableCell>
                <TableCell>{member.classOrSubject || '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedMemberQr(member); setTimeout(() => setIsQrOpen(true), 100); }}><QrCode className="h-4 w-4 mr-2" />QR Code</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingMemberId(member.id); setFormData({...member}); setTimeout(() => setIsEditOpen(true), 100); }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteDoc(doc(db, 'members', member.id))}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Kartu Digital</DialogTitle></DialogHeader>
          <div className="bg-white p-6 rounded-xl border-2 border-primary/20 space-y-4">
            <div id="member-qr" className="flex justify-center">
              {selectedMemberQr && <QRCodeSVG value={selectedMemberQr.memberId} size={250} level="H" includeMargin={true} />}
            </div>
            <div><p className="font-bold text-lg">{selectedMemberQr?.name}</p><p className="font-mono text-primary font-bold">{selectedMemberQr?.memberId}</p></div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={downloadQrAsImage}><Download className="h-4 w-4 mr-2" />Unduh</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Cetak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Ubah Anggota</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nama</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Kelas/Mapel</Label><Input value={formData.classOrSubject} onChange={e => setFormData({...formData, classOrSubject: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateMember}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
