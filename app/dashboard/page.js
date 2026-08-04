import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASHBOARD_COOKIE, verifyDashboardSession } from '@/lib/dashboardAuth';
import { getVietnamDate } from '@/lib/time';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function DashboardPage() {
  const token = cookies().get(DASHBOARD_COOKIE)?.value;
  if (!verifyDashboardSession(token)) redirect('/dashboard/login');
  return <DashboardClient today={getVietnamDate()} />;
}
