import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="pl-64">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
