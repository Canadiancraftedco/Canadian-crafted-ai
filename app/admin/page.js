import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/adminAuth';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const token = cookies().get('admin_session')?.value;
  if (!verifySessionToken(token)) {
    redirect('/admin/login');
  }

  return <AdminDashboard />;
}
