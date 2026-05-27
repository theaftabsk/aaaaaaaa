'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Plus, Copy, ExternalLink, Activity, QrCode, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ShortLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  campaignName: string | null;
  clicks: number;
  createdAt: string;
  _count: {
    analytics: number;
  };
}

export default function ShortLinkPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [originalUrl, setOriginalUrl] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/marketing/links`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLinks(data);
    } catch (error) {
      toast.error('Failed to fetch short links');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/marketing/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ originalUrl, campaignName, customCode })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Short link created!');
        setOriginalUrl('');
        setCampaignName('');
        setCustomCode('');
        fetchLinks();
      } else {
        toast.error(data.error || 'Failed to create link');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      
      {/* Header back button */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
        <Link 
          href="/dashboard/tools" 
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-indigo-500" />
            Short Link Generator
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create short links, track click counts, and monitor your campaign conversions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Link Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-[15px]">
              <Plus className="w-4 h-4 text-indigo-500" /> Create Short Link
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Destination URL *</label>
                <input
                  type="url"
                  required
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/offer"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Custom Short Code (Optional)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-sm">
                    vexo.link/
                  </span>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="eid-promo"
                    className="flex-1 bg-white border border-slate-200 rounded-r-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Campaign Name (Optional)</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="E.g. Broadcast May 2026"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !originalUrl}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Shorten URL
              </button>
            </form>
          </div>
        </div>

        {/* Links List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : links.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                <LinkIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No links created yet</h3>
              <p className="text-sm text-slate-500">Create your first short link to start tracking clicks.</p>
            </div>
          ) : (
            links.map((link) => {
              const shortUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/r/${link.shortCode}`;
              return (
                <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        {link.campaignName || 'Untitled Link'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mt-1">
                        <a href={shortUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          {shortUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                        <button onClick={() => copyToClipboard(shortUrl)} className="p-1 hover:bg-blue-50 rounded text-blue-500" title="Copy Link">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-md mt-2 flex items-center gap-1">
                        <span className="font-semibold text-slate-400">DESTINATION:</span> {link.originalUrl}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xl font-black text-slate-800 flex items-center justify-center gap-1">
                          <Activity className="w-4 h-4 text-blue-500" /> {link.clicks}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clicks</div>
                      </div>
                      <button className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200 transition-colors" title="Generate QR Code">
                        <QrCode className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Created: {new Date(link.createdAt).toLocaleDateString()}</span>
                    <button className="text-blue-600 hover:underline">View Analytics &rarr;</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
