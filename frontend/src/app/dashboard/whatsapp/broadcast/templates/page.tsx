'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, CheckCircle2, Clock, XCircle, FileText, 
  Trash2, Globe, Sparkles, MessageSquare, Copy, Eye, X, ArrowLeft, Loader2, Pencil
} from 'lucide-react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  body: string;
  lastUsed?: string;
}

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetched, setIsFetched] = useState(false);

  // Start with empty — only real Meta templates will populate this
  const [templates, setTemplates] = useState<Template[]>([]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      setIsFetched(true);
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whatsapp/meta/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data || []).map((t: any) => {
          const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
          return {
            id: t.id,
            name: t.name,
            category: t.category || 'MARKETING',
            language: t.language || 'en_US',
            status: t.status || 'APPROVED',
            body: bodyComponent?.text || 'Template message',
          };
        });
        setTemplates(mapped);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Error fetching Meta templates:', err);
      setTemplates([]);
    } finally {
      setIsLoading(false);
      setIsFetched(true);
    }
  };

  // Fetch templates on initial load
  useEffect(() => {
    fetchTemplates();
  }, []);

  const getStatusBadge = (status: Template['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
    }
  };

  const getCategoryColor = (category: Template['category']) => {
    switch (category) {
      case 'MARKETING': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'UTILITY': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'AUTHENTICATION': return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}" from Meta? This action cannot be undone.`)) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whatsapp/meta/templates/${name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Template deleted successfully from Meta.');
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(`Failed to delete template: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error deleting template:', err);
      alert(`Error deleting template: ${err.message}`);
    }
  };

  const filteredTemplates = templates.filter(tpl => {
    const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tpl.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || tpl.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate Stats
  const totalCount = templates.length;
  const approvedCount = templates.filter(t => t.status === 'APPROVED').length;
  const pendingCount = templates.filter(t => t.status === 'PENDING').length;
  const rejectedCount = templates.filter(t => t.status === 'REJECTED').length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-semibold">
            <Link href="/dashboard/whatsapp/broadcast" className="flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5"/> Back to Campaigns</Link>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-500"/> Message Templates
          </h1>
          <p className="text-sm text-slate-500">Create, test, and sync official WhatsApp templates for your marketing broadcasts</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchTemplates}
            disabled={isLoading}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm px-5 py-3.5 rounded-2xl flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync with Meta'
            )}
          </button>
          <Link 
            href="/dashboard/whatsapp/broadcast/templates/new"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Template
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Templates</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Approved</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Approval</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-500">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rejected</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-500">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Category Tabs */}
        <div className="flex overflow-x-auto w-full md:w-auto gap-1 pb-1 md:pb-0 scrollbar-hide border-b md:border-b-0 border-slate-100">
          {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-white border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 py-20 text-center shadow-sm">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-700">Syncing with Meta...</h3>
            <p className="text-sm text-slate-400 mt-1">Fetching your approved WhatsApp templates</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No templates found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || activeCategory !== 'ALL'
                ? 'Try adjusting your filters or search keywords.'
                : 'No approved templates found in your Meta WABA. Click "Sync with Meta" to refresh.'}
            </p>
            {!searchQuery && activeCategory === 'ALL' && (
              <button
                onClick={fetchTemplates}
                className="mt-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-5 py-2.5 rounded-2xl transition-all"
              >
                Sync with Meta
              </button>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group">
              
              {/* Header Info */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  {getStatusBadge(template.status)}
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 break-all select-all flex items-center gap-1.5" title="Double click to copy name">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Globe className="w-3 h-3"/> {template.language}
                  </p>
                </div>

                {/* Body Preview */}
                <div className="bg-[#efeae2]/40 rounded-2xl p-4 border border-slate-100 relative">
                  <div className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap break-words">
                    {template.body}
                  </div>
                  {template.lastUsed && (
                    <span className="text-[10px] text-slate-400 block mt-2 text-right">
                      Last used: {template.lastUsed}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(template.body);
                      alert('Template body copied to clipboard!');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors" 
                    title="Copy Body"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <Link 
                    href={`/dashboard/whatsapp/broadcast/templates/new?id=${template.id}`}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors" 
                    title="Edit Template"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleDeleteTemplate(template.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" 
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {template.status === 'APPROVED' && (
                  <Link 
                    href={`/dashboard/whatsapp/broadcast/new?templateId=${template.id}`}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl px-3 py-1.5 flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5"/> Use Template
                  </Link>
                )}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
