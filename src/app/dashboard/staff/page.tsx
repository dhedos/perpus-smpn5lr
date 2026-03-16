
"use client"

import { useState } from "react"
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
  UserX
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

interface StaffMember {
  id: string
  staffId: string
  name: string
  email: string
  role: "Admin" | "Staff"
  status: "Active" | "Inactive"
}

const MOCK_STAFF: StaffMember[] = [
  { id: "1", staffId: "ADM001", name: "Budi Santoso", email: "budi@sekolah.sch.id", role: "Admin", status: "Active" },
  { id: "2", staffId: "STF001", name: "Siti Rahma", email: "siti@sekolah.sch.id", role: "Staff", status: "Active" },
  { id: "3", staffId: "STF002", name: "Andi Wijaya", email: "andi@sekolah.sch.id", role: "Staff", status: "Inactive" },
]

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(MOCK_STAFF)
  const [search, setSearch] = useState("")

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.staffId.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Petugas Perpustakaan</h1>
          <p className="text-muted-foreground text-sm">Kelola akun dan hak akses petugas perpustakaan.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Tambah Petugas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Petugas Baru</DialogTitle>
              <DialogDescription>Daftarkan petugas baru untuk mengelola operasional perpustakaan.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" placeholder="Masukkan nama petugas..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staffId">NIP / ID Petugas</Label>
                <Input id="staffId" placeholder="Contoh: STF003" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="petugas@sekolah.sch.id" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Hak Akses (Role)</Label>
                <Select defaultValue="Staff">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin (Full Akses)</SelectItem>
                    <SelectItem value="Staff">Staff (Operasional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Batal</Button>
              <Button>Simpan Petugas</Button>
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

      <Card className="border-none shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Petugas</TableHead>
              <TableHead>ID Petugas</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <div className="font-semibold">{person.name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">{person.staffId}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="text-sm">{person.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className={cn("h-4 w-4", person.role === "Admin" ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm">{person.role}</span>
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
                      <DropdownMenuItem className="gap-2">
                        <Edit className="h-4 w-4" /> Ubah Data
                      </DropdownMenuItem>
                      {person.status === "Active" ? (
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <UserX className="h-4 w-4" /> Nonaktifkan
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="gap-2 text-green-600">
                          <UserCheck className="h-4 w-4" /> Aktifkan Kembali
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" /> Hapus Permanen
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
