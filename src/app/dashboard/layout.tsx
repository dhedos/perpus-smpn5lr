
"use client"

import { SidebarNav } from "@/components/dashboard/SidebarNav"
import { TopNav } from "@/components/dashboard/TopNav"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { doc } from "firebase/firestore"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: userLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings, isLoading: settingsLoading } = useDoc(settingsRef)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && !userLoading && !user && !isRedirecting) {
      setIsRedirecting(true)
      router.replace("/")
    }
  }, [user, userLoading, router, isRedirecting, isMounted])

  const isLoading = !isMounted || userLoading || isRedirecting || !user || settingsLoading;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background animate-in fade-in duration-500">
      <aside className="hidden md:block w-72 shrink-0">
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
