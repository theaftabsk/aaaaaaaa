'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar, CheckCircle2, XCircle, Clock, MoreVertical, 
  Pause, Trash2, MessageSquare, ShoppingBag, ChevronDown, ChevronLeft, 
  ChevronRight, ArrowUpDown, RefreshCw, Filter, HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalTarget: number;
  totalSent: number;
  totalFailed: number;
  totalRead: number;
  messageBody: string;
  createdAt: string;
  scheduledAt?: string;
}

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [dateFilter, setDateFilter] = useState('All Time');

  // Pagination States
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCampaigns = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/broadcast/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/broadcast/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCampaigns(campaigns.filter(c => c.id !== id));
      } else {
        alert('Failed to delete campaign.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting campaign.');
    }
  };

  // Helper for Status Badge matching screenshot colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': 
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
            <CheckCircle2 className="w-3.5 h-3.5"/> Success
          </span>
        );
      case 'PROCESSING': 
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-150 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
            <Clock className="w-3.5 h-3.5 animate-spin"/> Sending
          </span>
        );
      case 'SCHEDULED': 
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-150 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
            <Calendar className="w-3.5 h-3.5"/> Pending
          </span>
        );
      case 'PAUSED': 
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-150 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
            <Pause className="w-3.5 h-3.5"/> Paused
          </span>
        );
      case 'FAILED': 
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-150 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
            <XCircle className="w-3.5 h-3.5"/> Failed
          </span>
        );
      default: 
        return (
          <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
            Draft
          </span>
        );
    }
  };

  // Filter Logic
  const filteredCampaigns = campaigns.filter(camp => {
    // 1. Search term match (Name or ID)
    const matchesSearch = 
      camp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      camp.id.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status match
    let matchesStatus = true;
    if (statusFilter !== 'All Status') {
      const normalizedFilter = statusFilter === 'Success' ? 'COMPLETED' : statusFilter === 'Sending' ? 'PROCESSING' : statusFilter === 'Pending' ? 'SCHEDULED' : statusFilter.toUpperCase();
      matchesStatus = camp.status === normalizedFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalRecords = filteredCampaigns.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6">
      
      {/* Header section matching apitxt.com */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-slate-800">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-slate-655" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp Campaigns</h1>
          </div>
          <p className="text-[13px] text-slate-500">View history and create new WhatsApp template broadcasts.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[13px] px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
            Catalog Broadcast
          </button>
          <Link
            href="/dashboard/whatsapp/broadcast/new"
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Filters Bar matching layout in screenshot */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Search Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Name or ID..." 
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-700 transition-colors" 
              />
            </div>
          </div>

          {/* Project Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Project</label>
            <div className="relative">
              <select 
                value={projectFilter} 
                onChange={e => setProjectFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-655 cursor-pointer pr-8"
              >
                <option>All Projects</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Status</label>
            <div className="relative">
              <select 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-655 cursor-pointer pr-8"
              >
                <option>All Status</option>
                <option>Success</option>
                <option>Sending</option>
                <option>Pending</option>
                <option>Paused</option>
                <option>Failed</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Source</label>
            <div className="relative">
              <select 
                value={sourceFilter} 
                onChange={e => setSourceFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-655 cursor-pointer pr-8"
              >
                <option>All Sources</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Date Range</label>
            <div className="relative">
              <select 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-655 cursor-pointer pr-8"
              >
                <option>All Time</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>Last 7 Days</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Campaign History Table Card */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-550 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Campaign Info</th>
                <th className="px-6 py-4">Template</th>
                <th className="px-6 py-4">Cost</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Contacts</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-450">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      Loading campaign history...
                    </div>
                  </td>
                </tr>
              ) : paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center max-w-md mx-auto">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-3">
                        <MessageSquare className="w-5 h-5 text-slate-400"/>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No campaigns found</h4>
                      <p className="text-xs text-slate-450 mt-1 mb-5">Try adjusting your filters or create your first campaign to launch WhatsApp broadcasts.</p>
                      <Link href="/dashboard/whatsapp/broadcast/new" className="bg-blue-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        + New Campaign
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map(camp => {
                  const dateStr = new Date(camp.createdAt).toLocaleDateString();
                  const timeStr = new Date(camp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Campaign Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-[13.5px]">{camp.name}</p>
                          <p className="text-[10px] text-slate-450 font-mono tracking-tight">ID: {camp.id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      
                      {/* Template */}
                      <td className="px-6 py-4">
                        <div className="max-w-[200px] truncate text-slate-500 text-[13px]" title={camp.messageBody}>
                          {camp.messageBody}
                        </div>
                      </td>
                      
                      {/* Cost */}
                      <td className="px-6 py-4 text-slate-655 text-[13px]">
                        0.00 credits
                      </td>
                      
                      {/* Schedule */}
                      <td className="px-6 py-4 text-slate-655 text-[13px]">
                        {camp.scheduledAt 
                          ? new Date(camp.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                          : 'Immediately'
                        }
                      </td>
                      
                      {/* Contacts */}
                      <td className="px-6 py-4 text-slate-655 text-[13px]">
                        {camp.totalTarget.toLocaleString()}
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(camp.status)}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDeleteCampaign(camp.id)}
                          title="Delete Campaign"
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching APITxT */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/20">
          <div>
            Page {currentPage} of {totalPages} ({totalRecords} total records)
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>rows per page:</span>
              <select 
                value={rowsPerPage} 
                onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-600 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={55}>50</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
