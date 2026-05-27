'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('Member');
  const [userEmail, setUserEmail] = useState<string>('');

  const fetchSettings = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return null;
      }
      if (!res.ok) {
        setLoading(false);
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (!data || typeof data !== 'object') return;
      if (data.name) setUserName(data.name);
      else if (data.email) setUserName(data.email.split('@')[0]);
      if (data.role) setUserRole(data.role);
      if (data.email) setUserEmail(data.email);
      setLoading(false);
    })
    .catch(err => {
      console.error('Settings fetch error:', err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchSettings();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs text-emerald-500 font-semibold tracking-wider uppercase">Overview</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Control Panel</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 font-bold">{userName}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{userRole === 'ADMIN' ? 'Administrator' : userRole === 'AGENT' ? 'Support Agent' : 'Standard User'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold border border-slate-200 text-emerald-600 shadow-sm select-none">
              {userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U'}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
