'use client';

import { Link as LinkIcon, QrCode, Calculator, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ToolsHubPage() {
  const tools = [
    {
      id: 'short-link',
      name: 'Short Link Generator',
      description: 'Create short tracking links for your WhatsApp broadcasts and track open rates.',
      icon: LinkIcon,
      href: '/dashboard/tools/short-link',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      badge: 'Active'
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate customized QR codes with pre-filled message triggers for your offline marketing.',
      icon: QrCode,
      href: '#',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      badge: 'Coming Soon'
    },
    {
      id: 'cost-calculator',
      name: 'Broadcast Cost Calculator',
      description: 'Calculate campaign token consumption based on contacts count and message templates.',
      icon: Calculator,
      href: '#',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      badge: 'Coming Soon'
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Marketing & Utility Tools
          </h2>
          <p className="text-sm text-slate-500 mt-1">Boost user acquisition with link shorteners and smart widgets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div key={tool.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${tool.bg} ${tool.color} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                  tool.badge === 'Active' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {tool.badge}
                </span>
              </div>
              
              <h3 className="font-bold text-base text-slate-800 mb-2">{tool.name}</h3>
              <p className="text-[13px] leading-relaxed text-slate-500 mb-6">{tool.description}</p>
            </div>
            
            <Link 
              href={tool.href}
              className={`w-full text-center font-semibold py-2 rounded-xl border flex items-center justify-center gap-1 text-xs transition-all ${
                tool.badge === 'Active'
                  ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-600 hover:text-white'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              {tool.badge === 'Active' ? (
                <>Open Tool <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                'Unavailable'
              )}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
