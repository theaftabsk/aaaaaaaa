'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { MessageSquare, Users, Cpu, ShieldCheck, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalMessages: 0,
    connectedDevices: '0 / 0',
    activeLeads: 0,
    botAutoReplies: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.stats) setStats(data.stats);
        if (data.chartData) setChartData(data.chartData);
        if (data.activeCampaigns) setActiveCampaigns(data.activeCampaigns);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Messages', value: stats.totalMessages.toLocaleString(), change: 'Live', changeType: 'neutral', icon: MessageSquare },
    { name: 'Connected Devices', value: stats.connectedDevices, change: 'Live', changeType: 'neutral', icon: ShieldCheck },
    { name: 'Bot Auto-Replies', value: stats.botAutoReplies.toLocaleString(), change: 'Live', changeType: 'neutral', icon: Cpu },
    { name: 'Active Leads (CRM)', value: stats.activeLeads.toLocaleString(), change: 'Live', changeType: 'neutral', icon: Users },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-500 animate-pulse font-medium">Loading Real Data...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Quick stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white shadow-sm border border-slate-100 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-200 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{stat.name}</p>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2">{stat.value}</h4>
                </div>
                <div className="w-12 h-12 bg-slate-50 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition-all border border-slate-100">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-xs font-medium">
                {stat.changeType === 'increase' ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {stat.change}
                  </span>
                ) : (
                  <span className="text-slate-400">{stat.change}</span>
                )}
                <span className="text-slate-500">syncing from DB</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-white shadow-sm border border-slate-100 p-6 rounded-3xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-slate-900 font-bold text-lg">Message Flow</h3>
              <p className="text-slate-500 text-xs mt-0.5">Incoming vs Outgoing traffic (Last 7 Days)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-600">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                <span className="text-slate-600">Received</span>
              </div>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#86efac" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#86efac" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#475569', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="received" stroke="#86efac" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel: Active Campaigns */}
        <div className="bg-white shadow-sm border border-slate-100 p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-900 font-bold text-lg mb-4">Active Campaigns</h3>
            <div className="space-y-4">
              {activeCampaigns.length > 0 ? (
                activeCampaigns.map((camp) => (
                  <div key={camp.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm text-slate-900">{camp.name}</h4>
                      <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold px-2 py-0.5 rounded-full">{camp.status}</span>
                    </div>
                    <p className="text-xs text-slate-500">Total sent: {camp.totalSent} messages</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(camp.totalSent / (camp.totalSent + camp.totalFailed || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                  No active campaigns found.
                </div>
              )}
            </div>
          </div>

          <button className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 mt-6 text-sm">
            View Campaigns
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
