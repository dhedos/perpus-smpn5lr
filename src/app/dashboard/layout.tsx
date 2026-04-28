"use client"

import { SidebarNav } from "@/components/dashboard/SidebarNav"
import { TopNav } from "@/components/dashboard/TopNav"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
    const displayTitle = settings?.libraryName || "LANTERA BACA";
    const displaySubtitle = settings?.librarySubtitle || "SMPN 5 LANGKE REMBONG";
    const displayLogo = settings?.libraryLogoUrl || "https://picsum.photos/seed/librarylogo/512/512";

    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#ECF0F7]">
        <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700">
          <div className="w-32 h-32 flex items-center justify-center rounded-[2.5rem] bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <img src={displayLogo} alt="Logo" className="w-20 h-20 object-contain" />
          </div>

          <div className="flex flex-col items-center space-y-3 text-center">
            <p className="text-lg font-black text-[#2E6ECE] uppercase tracking-[0.4em] animate-pulse duration-[3000ms]">
              {displayTitle}
            </p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-80 px-4">
              {displaySubtitle}
            </p>
          </div>
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
