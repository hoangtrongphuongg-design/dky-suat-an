import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASHBOARD_COOKIE, verifyDashboardSession } from '@/lib/dashboardAuth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function DashboardLoginPage() {
  const token = cookies().get(DASHBOARD_COOKIE)?.value;
  if (verifyDashboardSession(token)) redirect('/dashboard');
  return <LoginForm />;
}
