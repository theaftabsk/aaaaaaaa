'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  GitBranch, 
  Users, 
  Megaphone,
  LogOut,
  Settings,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  Contact,
  Tags,
  FileText,
  Plus,
  Globe,
  Store,
  Calendar,
  ShoppingCart,
  Webhook,
  Bot,
  GraduationCap,
  Coins,
  StickyNote,
  Activity,
  History
} from 'lucide-react';

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

type SubMenuItem = {
  name: string;
  href: string;
  icon?: any;
};

type MenuItem = {
  name: string;
  href?: string;
  icon: any;
  subItems?: SubMenuItem[];
};

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    name: 'WhatsApp', 
    icon: MessageSquare,
    subItems: [
      { name: 'Connection / Settings', href: '/dashboard/whatsapp', icon: Settings },
      { name: 'Contact List', href: '/dashboard/whatsapp/phonebook', icon: Contact },
      { name: 'Contact Groups', href: '/dashboard/whatsapp/phonebook/groups', icon: Users },
      { name: 'Contact Labels', href: '/dashboard/whatsapp/phonebook/labels', icon: Tags },
      { name: 'New Broadcast', href: '/dashboard/whatsapp/broadcast/new', icon: Plus },
      { name: 'Broadcast History', href: '/dashboard/whatsapp/broadcast', icon: Megaphone },
      { name: 'Message Templates', href: '/dashboard/whatsapp/broadcast/templates', icon: FileText },
    ]
  },
  {
    name: 'Telegram',
    icon: TelegramIcon,
    subItems: [
      { name: 'My Bots', href: '/dashboard/telegram', icon: Bot },
      { name: 'Notes', href: '/dashboard/telegram/notes', icon: StickyNote },
    ]
  },
  { name: 'Team Inbox', href: '/dashboard/inbox', icon: MessageSquare },
  { 
    name: 'AI Bot', 
    icon: Bot,
    subItems: [
      { name: 'Overview Dashboard', href: '/dashboard/ai-bot?tab=overview', icon: Activity },
      { name: 'Train AI & Knowledge', href: '/dashboard/ai-bot?tab=train', icon: GraduationCap },
      { name: 'Channels & Persona', href: '/dashboard/ai-bot?tab=channels', icon: Settings },
      { name: 'AI Response Logs', href: '/dashboard/ai-bot?tab=logs', icon: History },
      { name: 'Tokens & Billing', href: '/dashboard/ai-bot?tab=tokens', icon: Coins },
    ]
  },
  { name: 'Flow Builder', href: '/dashboard/builder', icon: GitBranch },
  { 
    name: 'Tools', 
    icon: LinkIcon,
    subItems: [
      { name: 'Tools Hub', href: '/dashboard/tools', icon: Globe },
      { name: 'Short Link', href: '/dashboard/tools/short-link', icon: LinkIcon },
    ]
  },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Globe },
  { name: 'API & Webhooks', href: '/dashboard/integrations/api-webhooks', icon: Webhook },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Tools': pathname.startsWith('/dashboard/tools'),
    'AI Bot': pathname.startsWith('/dashboard/ai-bot'),
    'WhatsApp': pathname.startsWith('/dashboard/whatsapp'),
    'Telegram': pathname.startsWith('/dashboard/telegram'),
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredMenuItems = menuItems;

  const logoBg = 'from-blue-500 to-indigo-600 shadow-blue-500/20';
  const activeItemBg = 'bg-blue-50/70 text-blue-600 border-l-[3px] border-l-blue-500 pl-[13px]';
  const activeSubMenuHeaderBg = 'bg-blue-50/40 text-blue-600 border-l-[3px] border-l-blue-500 pl-[13px]';
  const activeSubMenuHeaderIcon = 'text-blue-600';
  const activeSubItemBg = 'bg-blue-50/70 text-blue-600 font-semibold border-l-2 border-blue-500 pl-2.5';
  const activeSubItemIcon = 'text-blue-600';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 text-slate-900 flex flex-col justify-between h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className={`bg-gradient-to-tr ${logoBg} w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg`}>
            V
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Vexo CRM</h1>
            <span className="text-xs text-slate-500 font-medium">API Platform</span>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            
            if (item.subItems) {
              const isOpen = openMenus[item.name];
              const isAnySubActive = item.subItems.some(sub => {
                const subUrlBase = sub.href.split('?')[0];
                const subUrlQuery = sub.href.split('?')[1];
                if (subUrlQuery) {
                  const [key, val] = subUrlQuery.split('=');
                  return pathname === subUrlBase && searchParams.get(key) === val;
                }
                return pathname === sub.href;
              });
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-250 group ${
                      isAnySubActive && !isOpen
                        ? activeSubMenuHeaderBg
                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 pl-4'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-105 ${isAnySubActive ? activeSubMenuHeaderIcon : 'text-slate-500 group-hover:text-slate-900'}`} />
                      <span className="font-semibold text-[13px]">{item.name}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  
                  {isOpen && (
                    <div className="pl-6 pr-2 space-y-1 mt-1 border-l border-slate-100 ml-6">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const subUrlBase = sub.href.split('?')[0];
                        const subUrlQuery = sub.href.split('?')[1];
                        const isSubActive = subUrlQuery
                          ? pathname === subUrlBase && searchParams.get(subUrlQuery.split('=')[0]) === subUrlQuery.split('=')[1]
                          : pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                              isSubActive
                                ? activeSubItemBg
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 pl-3'
                            }`}
                          >
                            {SubIcon && <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? activeSubItemIcon : 'text-slate-400 group-hover:text-slate-600'}`} />}
                            <span className="font-medium text-[13px]">{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href!}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-250 group ${
                  isActive
                    ? activeItemBg
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 border-transparent pl-4'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-105 ${isActive ? activeSubMenuHeaderIcon : 'text-slate-500 group-hover:text-slate-900'}`} />
                <span className="font-semibold text-[13px]">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-200 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all pl-4"
        >
          <Settings className="w-[18px] h-[18px]" />
          <span className="font-semibold text-[13px]">Settings</span>
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all pl-4"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="font-semibold text-[13px]">Log out</span>
        </button>
      </div>
    </aside>
  );
}
