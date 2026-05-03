
"use client"

import { useState, useMemo, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  QrCode,
  Printer,
  ChevronDown,
  X,
  Filter,
  CreditCard
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
  type: "Student" as "Student" | "Teacher" | "Staff",
  classPart: "",
  phone: "",
  joinDate: ""
}

function MembersContent() {
  const db = useFirestore()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
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

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        const focusGuards = document.querySelectorAll('[data-radix-focus-guard]');
        focusGuards.forEach(el => (el as HTMLElement).remove());
      }, 150);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true)
    forceUnlockUI()
  }, [forceUnlockUI])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [searchParams])

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
    return members.filter(m => {
      const matchesSearch = 
        (m.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
        (m.memberId?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (m.classOrSubject?.toLowerCase() || "").includes(search.toLowerCase());
      
      const matchesType = filterType === "all" || m.type === filterType;
      
      return matchesSearch && matchesType;
    })
  }, [members, search, filterType])

  const handleOpenAdd = () => {
    forceUnlockUI()
    setFormData({
      ...INITIAL_MEMBER_DATA,
      joinDate: isMounted ? new Date().toISOString().split('T')[0] : ""
    });
    setIsOpen(true);
  }

  const handlePrintTable = (type: 'Student' | 'Teacher' | 'Staff' | 'all') => {
    const targetData = type === 'all' ? filteredMembers : filteredMembers.filter(m => m.type === type)
    if (targetData.length === 0) {
      toast({ title: "Data Kosong", description: "Tidak ada data untuk dicetak." })
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const labelType = type === 'Student' ? 'SISWA' : type === 'Teacher' ? 'GURU' : type === 'Staff' ? 'PEGAWAI' : 'SELURUH'
    const classLabel = "Keterangan / Kelas"

    const rowsHtml = targetData.map((m, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-family: monospace;">${m.memberId || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${m.name}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${m.type === 'Student' ? 'Siswa' : m.type === 'Teacher' ? 'Guru' : 'Pegawai'}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${m.classOrSubject || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${m.joinDate || '-'}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Daftar Anggota Perpustakaan</title>
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
          </div>
          <div class="title">DAFTAR ANGGOTA PERPUSTAKAAN (${labelType})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>ID Anggota</th>
                <th>Nama Lengkap</th>
                <th>Kategori</th>
                <th>${classLabel}</th>
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
          <div class="print-footer">© 2026 Lantera Baca</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const handlePrintAllCards = () => {
    if (filteredMembers.length === 0) {
      toast({ title: "Data Kosong", description: "Tidak ada data anggota untuk dicetak." })
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rawAddress = settings?.schoolAddress || 'Mando, Kelurahan Compang Carep, Kec. Langke Rembong';
    const shortAddress = rawAddress
      .replace(/Kelurahan/gi, 'Kel.')
      .replace(/Kecamatan/gi, 'Kec.')
      .replace(/Kabupaten/gi, 'Kab.');

    const libName = settings?.libraryName || 'PUSTAKA NUSANTARA';
    const schoolName = settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG';

    const cardsHtml = filteredMembers.map(member => {
      const detailLabel = member.type === 'Teacher' ? 'GURU' : member.type === 'Staff' ? 'PEGAWAI' : 'KELAS';
      const qrData = member.memberId || member.id || "NO_ID";
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&data=${encodeURIComponent(qrData)}`;
      
      return `
        <div class="card-container">
          <div class="header-box">
            <div class="school-name">${schoolName}</div>
            <div class="address">${shortAddress}</div>
          </div>
          
          <div class="card-title-box">
            <div class="card-title">KARTU ANGGOTA<br/>PERPUSTAKAAN</div>
          </div>
          
          <div class="qr-section">
             <img src="${qrUrl}" />
          </div>
          
          <div class="info-section">
            <div class="member-name">${member.name}</div>
            <div class="member-id">${member.memberId || ""}</div>
            <div class="member-detail">${detailLabel}: ${member.classOrSubject || '-'}</div>
          </div>
          
          <div class="footer">
            <div class="footer-text">${libName}</div>
            <div class="footer-subtext">Kartu ini digunakan untuk proses peminjaman & pengembalian koleksi buku sekolah</div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu Anggota</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 10mm; background: #fff; font-family: 'Inter', sans-serif; }
            .print-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 5mm;
              justify-items: center;
            }
            .card-container {
              width: 54mm;
              height: 86mm;
              border: 0.1pt solid #eee;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              background: #fff;
              text-align: center;
              position: relative;
              overflow: hidden;
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin-bottom: 5mm;
            }
            .header-box { padding: 4mm 2mm 1mm 2mm; }
            .school-name { 
              font-size: 8.5pt; 
              font-weight: 900; 
              color: #1e4b8f; 
              text-transform: uppercase; 
              margin: 0; 
              line-height: 1.1; 
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .address { 
              font-size: 4.8pt; 
              color: #444; 
              margin-top: 1mm; 
              font-weight: 500; 
              line-height: 1.2; 
              white-space: nowrap;
              padding-bottom: 0.8mm;
              border-bottom: 0.8pt solid #000;
              margin-left: 1mm;
              margin-right: 1mm;
              text-transform: none;
              overflow: hidden;
            }
            
            .card-title-box { margin-top: 2.5mm; }
            .card-title { font-size: 7.5pt; font-weight: 800; color: #000; text-transform: uppercase; line-height: 1.1; letter-spacing: 0.2px; }
            
            .qr-section { flex: 1; display: flex; justify-content: center; align-items: center; padding: 1mm 4mm; }
            .qr-section img { width: 34mm; height: 34mm; border: none; }
            
            .info-section { padding-bottom: 15.5mm; }
            .member-name { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; color: #000; margin-bottom: 0.5mm; padding: 0 1mm; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .member-id { font-size: 10pt; font-weight: 800; color: #1e4b8f; font-family: monospace; line-height: 1; }
            .member-detail { font-size: 6.5pt; font-weight: 800; color: #666; text-transform: uppercase; margin-top: 0.8mm; }
            
            .footer { 
              background: #1e4b8f !important; 
              color: #fff !important; 
              height: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%; 
              position: absolute; 
              bottom: 0; 
              left: 0;
              padding: 0 1.5mm;
              box-sizing: border-box;
            }
            .footer-text { 
              font-size: 9.5pt; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: 1.5px; 
              color: #fff !important; 
              line-height: 1.1;
            }
            .footer-subtext {
              font-size: 3.8pt;
              font-weight: 500;
              color: rgba(255, 255, 255, 0.9) !important;
              text-transform: none;
              letter-spacing: 0;
              margin-top: 0.5mm;
              line-height: 1;
              max-width: 95%;
              text-align: center;
            }
            .print-footer-info { position: fixed; bottom: 5mm; left: 10mm; right: 10mm; text-align: center; font-size: 7pt; color: #999; }
          </style>
        </head>
        <body onload="
          const imgs = document.getElementsByTagName('img');
          let loaded = 0;
          const checkLoad = () => {
            loaded++;
            if (loaded === imgs.length) {
              setTimeout(() => { window.print(); window.close(); }, 800);
            }
          };
          if (imgs.length === 0) {
            window.print(); window.close();
          } else {
            Array.from(imgs).forEach(img => {
              if (img.complete) checkLoad();
              else {
                img.onload = checkLoad;
                img.onerror = checkLoad;
              }
            });
            setTimeout(() => { if(loaded < imgs.length) { window.print(); window.close(); } }, 5000);
          }
        ">
          <div class="print-grid">
            ${cardsHtml}
          </div>
          <div class="print-footer-info">© 2026 Lantera Baca - Sistem Informasi Perpustakaan</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const handlePrintSingleCard = (member: any) => {
    if (!member) return
    const printWindow = window.open('', '_blank')
    if (!member) return

    const rawAddress = settings?.schoolAddress || 'Mando, Kelurahan Compang Carep, Kec. Langke Rembong';
    const shortAddress = rawAddress
      .replace(/Kelurahan/gi, 'Kel.')
      .replace(/Kecamatan/gi, 'Kec.')
      .replace(/Kabupaten/gi, 'Kab.');

    const libName = settings?.libraryName || 'PUSTAKA NUSANTARA';
    const schoolName = settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG';
    const detailLabel = member.type === 'Teacher' ? 'GURU' : member.type === 'Staff' ? 'PEGAWAI' : 'KELAS';
    const qrData = member.memberId || member.id || "NO_ID";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu Anggota</title>
          <style>
            @page { size: 54mm 86mm; margin: 0; }
            body { margin: 0; padding: 0; background: #fff; font-family: 'Inter', sans-serif; display: flex; justify-content: center; }
            .card-container {
              width: 54mm;
              height: 86mm;
              border: 0.1pt solid #eee;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              background: #fff;
              text-align: center;
              position: relative;
              overflow: hidden;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-box { padding: 4mm 2mm 1mm 2mm; }
            .school-name { 
              font-size: 8.5pt; 
              font-weight: 900; 
              color: #1e4b8f; 
              text-transform: uppercase; 
              margin: 0; 
              line-height: 1.1; 
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .address { 
              font-size: 4.8pt; 
              color: #444; 
              margin-top: 1mm; 
              font-weight: 500; 
              line-height: 1.2; 
              white-space: nowrap;
              padding-bottom: 0.8mm;
              border-bottom: 0.8pt solid #000;
              margin-left: 1mm;
              margin-right: 1mm;
              text-transform: none;
              overflow: hidden;
            }
            
            .card-title-box { margin-top: 2.5mm; }
            .card-title { font-size: 7.5pt; font-weight: 800; color: #000; text-transform: uppercase; line-height: 1.1; letter-spacing: 0.2px; }
            
            .qr-section { flex: 1; display: flex; justify-content: center; align-items: center; padding: 1mm 4mm; }
            .qr-section img { width: 34mm; height: 34mm; border: none; }
            
            .info-section { padding-bottom: 15.5mm; }
            .member-name { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; color: #000; margin-bottom: 0.5mm; padding: 0 1mm; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .member-id { font-size: 10pt; font-weight: 800; color: #1e4b8f; font-family: monospace; line-height: 1; }
            .member-detail { font-size: 6.5pt; font-weight: 800; color: #666; text-transform: uppercase; margin-top: 0.8mm; }
            
            .footer { 
              background: #1e4b8f !important; 
              color: #fff !important; 
              height: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%; 
              position: absolute; 
              bottom: 0; 
              left: 0;
              padding: 0 1.5mm;
              box-sizing: border-box;
            }
            .footer-text { 
              font-size: 9.5pt; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: 1.5px; 
              color: #fff !important; 
              line-height: 1.1;
            }
            .footer-subtext {
              font-size: 3.8pt;
              font-weight: 500;
              color: rgba(255, 255, 255, 0.9) !important;
              text-transform: none;
              letter-spacing: 0;
              margin-top: 0.5mm;
              line-height: 1;
              max-width: 95%;
              text-align: center;
            }
          </style>
        </head>
        <body onload="
          const img = document.querySelector('img');
          if (!img) { window.print(); window.close(); }
          else if (img.complete) { window.print(); window.close(); }
          else { img.onload = () => { window.print(); window.close(); }; img.onerror = () => { window.print(); window.close(); }; }
        ">
          <div class="card-container">
            <div class="header-box">
              <div class="school-name">${schoolName}</div>
              <div class="address">${shortAddress}</div>
            </div>
            
            <div class="card-title-box">
              <div class="card-title">KARTU ANGGOTA<br/>PERPUSTAKAAN</div>
            </div>
            
            <div class="qr-section">
               <img src="${qrUrl}" />
            </div>
            
            <div class="info-section">
              <div class="member-name">${member.name}</div>
              <div class="member-id">${member.memberId || ""}</div>
              <div class="member-detail">${detailLabel}: ${member.classOrSubject || '-'}</div>
            </div>
            
            <div class="footer">
              <div class="footer-text">${libName}</div>
              <div class="footer-subtext">Kartu ini digunakan untuk proses peminjaman & pengembalian koleksi buku sekolah</div>
            </div>
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
    setIsOpen(false); forceUnlockUI();
    addDoc(collection(db, 'members'), dataToSave).catch(async (e) => errorEmitter.emit('permission-error', new FirestorePermissionError({path: 'members', operation: 'create', requestResourceData: dataToSave})));
    toast({ title: "Berhasil!", description: "Anggota baru telah didaftarkan." });
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
    setIsEditOpen(false); forceUnlockUI();
    updateDoc(docRef, dataToUpdate).catch(async (e) => errorEmitter.emit('permission-error', new FirestorePermissionError({path: docRef.path, operation: 'update', requestResourceData: dataToUpdate})));
    toast({ title: "Berhasil!", description: "Data anggota telah diperbarui." });
    setTimeout(() => { setEditingMemberId(null); setFormData(INITIAL_MEMBER_DATA); }, 200)
  }

  const handleDeleteMember = () => {
    if (!db || !memberToDelete) return
    const docRef = doc(db, 'members', memberToDelete)
    setIsDeleteDialogOpen(false); forceUnlockUI();
    deleteDoc(docRef).catch(async (e) => errorEmitter.emit('permission-error', new FirestorePermissionError({path: docRef.path, operation: 'delete'})));
    toast({ title: "Terhapus", description: "Anggota telah dihapus." });
    setTimeout(() => { setMemberToDelete(null) }, 200)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary">Daftar Anggota</h1>
          <p className="text-muted-foreground text-sm">Kelola data siswa, guru, dan pegawai yang terdaftar.</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-slate-300 dark:border-white/20">
                <Printer className="h-4 w-4" /> Opsi Cetak
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintTable('all'); }}>
                Daftar Seluruh Anggota
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintTable('Student'); }}>
                Daftar Siswa Saja
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintTable('Teacher'); }}>
                Daftar Guru Saja
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintTable('Staff'); }}>
                Daftar Pegawai Saja
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-bold text-primary" onSelect={(e) => { e.preventDefault(); handlePrintAllCards(); }}>
                <CreditCard className="h-4 w-4 mr-2" /> Cetak Semua Kartu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleOpenAdd} className="gap-2 rounded-xl px-6 shadow-lg shadow-primary/20"><UserPlus className="h-4 w-4" /> Tambah Anggota</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-transparent p-4 rounded-[2rem] border border-slate-200 dark:border-white/20">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari anggota berdasarkan nama, ID, atau kelas..." 
            className="pl-11 h-12 bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 rounded-full text-foreground font-medium" 
            value={search ?? ""} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full h-12 bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 rounded-full text-foreground font-medium">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Semua Kategori" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="Student">Siswa</SelectItem>
            <SelectItem value="Teacher">Guru</SelectItem>
            <SelectItem value="Staff">Pegawai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-transparent">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b dark:border-white/10">
              <TableHead className="w-12 text-center text-[10px] font-black uppercase tracking-widest">No.</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Nama Anggota</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">ID Anggota</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Kategori</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Keterangan / Kelas</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse duration-[2000ms]">Memuat Data...</p>
                </TableCell>
              </TableRow>
            ) : filteredMembers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada anggota ditemukan.</TableCell></TableRow>
            ) : filteredMembers.map((member, index) => (
              <TableRow key={member.id} className="hover:bg-muted/30 border-b dark:border-white/5">
                <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                <TableCell className="font-semibold">{member.name ?? ""}</TableCell>
                <TableCell className="font-mono text-xs text-primary font-bold">{member.memberId || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="h-5 px-2 text-[10px] font-black border-none uppercase bg-primary/10 text-primary">
                    {member.type === 'Teacher' ? 'GURU' : member.type === 'Staff' ? 'PEGAWAI' : 'SISWA'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium opacity-80">{member.classOrSubject || '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50">
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); forceUnlockUI(); setTimeout(() => { setSelectedMemberQr(member); setIsQrOpen(true); }, 150); }}><QrCode className="h-4 w-4 mr-2" /> Kartu Anggota</DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); forceUnlockUI(); setTimeout(() => { setEditingMemberId(member.id); setFormData({ memberId: member.memberId || "", name: member.name || "", type: (member.type as any) || "Student", classPart: member.classOrSubject || "", phone: member.phone || "", joinDate: member.joinDate || new Date().toISOString().split('T')[0] }); setIsEditOpen(true); }, 150); }}><Edit className="h-4 w-4 mr-2" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); forceUnlockUI(); setTimeout(() => { setMemberToDelete(member.id); setIsDeleteDialogOpen(true); }, 150); }}><Trash2 className="h-4 w-4 mr-2" /> Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {members && members.length >= displayLimit && (
          <div className="p-6 text-center border-t dark:border-white/10 bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setDisplayLimit(prev => prev + 50)} className="text-primary font-black uppercase text-[10px] tracking-widest"><ChevronDown className="h-4 w-4 mr-2" /> Muat Lebih Banyak</Button>
          </div>
        )}
      </Card>

      {/* DIALOG TAMBAH ANGGOTA */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="bg-slate-50 dark:bg-slate-900 max-w-md border-none rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Daftarkan Anggota Baru</DialogTitle>
            <DialogDescription>Masukkan identitas siswa, guru, atau pegawai untuk akses layanan perpustakaan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">ID Anggota (NIS/NIP)</Label>
                <Input value={formData.memberId ?? ""} onChange={e => setFormData({...formData, memberId: e.target.value})} className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl" placeholder="NIS/NIP" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Kategori</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as any})}>
                  <SelectTrigger className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Siswa</SelectItem>
                    <SelectItem value="Teacher">Guru</SelectItem>
                    <SelectItem value="Staff">Pegawai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
              <Input value={formData.name ?? ""} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl" placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">
                {formData.type === 'Teacher' ? 'Mengajar / Kelas' : formData.type === 'Staff' ? 'Jabatan / Bagian' : 'Kelas'}
              </Label>
              <Input 
                value={formData.classPart ?? ""} 
                onChange={e => setFormData({...formData, classPart: e.target.value})} 
                className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl" 
                placeholder={formData.type === 'Teacher' ? "Cth: BAHASA INGGRIS/VII" : formData.type === 'Staff' ? "Cth: Tata Usaha / Keamanan" : "Cth: VII A"} 
              />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveMember} className="w-full h-12 px-8 shadow-lg shadow-primary/20 rounded-xl font-bold">Simpan Anggota</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG UBAH ANGGOTA */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="bg-slate-50 dark:bg-slate-900 max-w-md border-none rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Ubah Data Anggota</DialogTitle>
            <DialogDescription>Perbarui informasi identitas anggota di bawah ini secara lengkap.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">ID Anggota (NIS/NIP)</Label>
                <Input value={formData.memberId ?? ""} onChange={e => setFormData({...formData, memberId: e.target.value})} className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl" placeholder="NIS/NIP" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Kategori</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as any})}>
                  <SelectTrigger className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Siswa</SelectItem>
                    <SelectItem value="Teacher">Guru</SelectItem>
                    <SelectItem value="Staff">Pegawai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Nama Lengkap</Label>
              <Input value={formData.name ?? ""} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl" placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">
                {formData.type === 'Teacher' ? 'Mengajar / Kelas' : formData.type === 'Staff' ? 'Jabatan / Bagian' : 'Kelas'}
              </Label>
              <Input 
                value={formData.classPart ?? ""} 
                onChange={e => setFormData({...formData, classPart: e.target.value})} 
                className="bg-white dark:bg-white h-11 border-slate-300 dark:border-white/10 text-slate-900 rounded-xl" 
                placeholder={formData.type === 'Teacher' ? "Cth: BAHASA INGGRIS/VII" : formData.type === 'Staff' ? "Cth: Tata Usaha / Keamanan" : "Cth: VII A"} 
              />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateMember} className="w-full h-12 rounded-xl font-bold">Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={(v) => { setIsQrOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md text-center border-none p-0 overflow-hidden rounded-[2.5rem]">
          <DialogHeader className="p-6 bg-white dark:bg-slate-900 shrink-0 border-b dark:border-white/10">
            <DialogTitle className="text-center font-bold text-primary">Kartu Digital Anggota</DialogTitle>
            <DialogDescription className="text-center">Label identitas digital untuk akses sirkulasi mandiri.</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6 dark:bg-black/20">
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-primary/20 space-y-4 shadow-xl flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border shadow-inner">
                {selectedMemberQr && (
                  <QRCodeSVG 
                    value={selectedMemberQr.memberId || selectedMemberQr.id} 
                    size={200} 
                    level="H" 
                    includeMargin 
                  />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-black text-2xl leading-tight uppercase tracking-tight text-slate-900">{selectedMemberQr?.name ?? ""}</div>
                <div className="font-mono text-primary font-black text-xl">{selectedMemberQr?.memberId || "-"}</div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  {selectedMemberQr?.type === 'Teacher' ? 'GURU' : selectedMemberQr?.type === 'Staff' ? 'PEGAWAI' : 'KELAS'}: {selectedMemberQr?.classOrSubject || '-'}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 grid grid-cols-2 gap-3 bg-white dark:bg-slate-900"><Button variant="outline" onClick={() => { setIsQrOpen(false); forceUnlockUI(); }} className="h-12 rounded-xl font-bold">Tutup</Button><Button onClick={() => handlePrintSingleCard(selectedMemberQr)} className="h-12 gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold"><Printer className="h-4 w-4" /> Cetak Kartu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(v) => { setIsDeleteDialogOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-primary uppercase tracking-tight">Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>Data identitas akan dihapus secara permanen dari database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel onClick={() => { setMemberToDelete(null); forceUnlockUI(); }} className="rounded-xl font-bold">Batal</AlertDialogCancel><AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="text-center py-4 opacity-30">
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          © 2026 Lantera Baca
        </p>
      </div>
    </div>
  )
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] animate-pulse duration-[2500ms]">LANTERA BACA</p>
      </div>
    }>
      <MembersContent />
    </Suspense>
  )
}
