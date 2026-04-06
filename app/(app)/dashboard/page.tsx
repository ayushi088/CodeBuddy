import { getCurrentUser } from '@/lib/auth'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const metadata = {
  title: 'Dashboard | Study Buddy',
  description: 'Your AI-powered study dashboard',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  return <DashboardContent user={user} />
}
