
"use client"

import { SidebarNav } from "@/components/dashboard/SidebarNav"
import { TopNav } from "@/components/dashboard/TopNav"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, Library } from "lucide-react"
import { doc } from "firebase/firestore"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fast protected route redirect
  useEffect(() => {
    if (isMounted && !loading && !user && !isRedirecting) {
      setIsRedirecting(true)
      router.replace("/")
    }
  }, [user, loading, router, isRedirecting, isMounted])

  // Hydration-safe display logic
  const displayTitle = (isMounted && settings?.libraryName) ? settings.libraryName : "LANTERA BACA";
  const displaySubtitle = (isMounted && settings?.librarySubtitle) ? settings.librarySubtitle : "SMPN 5 LANGKE REMBONG";

  // Identical loading UI to page.tsx to prevent hydration errors
  const loadingUI = (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 flex items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
          <Library className="h-12 w-12 animate-pulse" />
        </div>
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">
              {displayTitle}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50 px-4">
            {displaySubtitle}
          </p>
        </div>
      </div>
    </div>
  )

  if (!isMounted || loading || isRedirecting || !user) return loadingUI

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
