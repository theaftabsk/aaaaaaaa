'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings, Globe, Bot, Users, 
  CreditCard, Shield, Bell, Palette 
} from 'lucide-react';

const navItems = [
  { name: 'General', href: '/dashboard/settings', icon: Settings },
  { name: 'AI Configuration', href: '/dashboard/settings/ai-configuration', icon: Bot },
  { name: 'Team Members', href: '/dashboard/settings/team-members', icon: Users },
  { name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
  { name: 'Security', href: '/dashboard/settings/security', icon: Shield },
  { name: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell },
  { name: 'Appearance', href: '/dashboard/settings/appearance', icon: Palette },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto pb-12 flex flex-col md:flex-row gap-8">
      {/* Settings Inner Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your workspace</p>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
