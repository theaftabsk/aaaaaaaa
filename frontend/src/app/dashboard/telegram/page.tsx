'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Plus, Bot, Pencil, Trash2, X, Check, Loader2,
  Eye, EyeOff, ToggleLeft, ToggleRight, Copy, ExternalLink,
  Webhook, Info
} from 'lucide-react';

const TG_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

type TelegramBot = {
  id: string;
  name: string;
  token: string;
  username?: string;
  webhookUrl?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
};

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/telegram`;

function getToken() { return localStorage.getItem('token') || ''; }

const emptyForm = { name: '', token: '', description: '' };

export default function TelegramBotsPage() {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBot, setEditBot] = useState<TelegramBot | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/bots`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setBots(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load bots'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBots(); }, [fetchBots]);

  const openCreate = () => { setEditBot(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (bot: TelegramBot) => {
    setEditBot(bot);
    setForm({ name: bot.name, token: bot.token, description: bot.description || '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.token.trim()) return toast.error('Name and token are required.');
    setSaving(true);
    try {
      const method = editBot ? 'PUT' : 'POST';
      const url = editBot ? `${API}/bots/${editBot.id}` : `${API}/bots`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Show webhook status message from backend
      if (data.webhookMessage) {
        if (data.webhookRegistered) {
          toast.success(data.webhookMessage, { duration: 5000 });
        } else {
          toast(data.webhookMessage, { icon: '⚠️', duration: 6000 });
        }
      } else {
        toast.success(editBot ? 'Bot updated!' : 'Bot added!');
      }
      
      setShowModal(false);
      fetchBots();
    } catch (err: any) { toast.error(err.message || 'Error saving bot'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/bots/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Bot deleted');
      setConfirmDelete(null);
      fetchBots();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeletingId(null); }
  };

  const toggleActive = async (bot: TelegramBot) => {
    try {
      await fetch(`${API}/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...bot, isActive: !bot.isActive }),
      });
      fetchBots();
    } catch { toast.error('Failed to toggle bot'); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  const maskToken = (token: string) => token.length > 10 ? `${token.slice(0, 8)}${'•'.repeat(20)}${token.slice(-4)}` : '••••••••';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex items-center justify-center shadow-lg shadow-blue-400/30 text-white">
            {TG_ICON}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Telegram Bots</h1>
            <p className="text-sm text-slate-500">Manage your connected Telegram bots</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#229ED9] hover:to-[#1a8fc4] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-400/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Bot
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Bots', value: bots.length, color: 'from-blue-500 to-cyan-500' },
          { label: 'Active', value: bots.filter(b => b.isActive).length, color: 'from-emerald-500 to-teal-500' },
          { label: 'Inactive', value: bots.filter(b => !b.isActive).length, color: 'from-slate-400 to-slate-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full bg-gradient-to-b ${stat.color}`} />
            <div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bot List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : bots.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No bots yet</h3>
          <p className="text-sm text-slate-400 max-w-xs">Add your first Telegram bot by clicking <b>Add Bot</b>. Get a token from <b>@BotFather</b> on Telegram.</p>
          <button onClick={openCreate} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-400/20">
            Add Bot
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bots.map(bot => (
            <div key={bot.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md ${bot.isActive ? 'bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-blue-300/30' : 'bg-slate-300 shadow-slate-200/50'}`}>
                    {TG_ICON}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/dashboard/telegram/${bot.id}`} className="font-semibold text-slate-900 text-base hover:text-blue-500 transition-colors">
                        {bot.name}
                      </Link>
                      {bot.username && (
                        <a href={`https://t.me/${bot.username}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                          @{bot.username} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bot.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {bot.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {bot.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{bot.description}</p>}

                    {/* Token row */}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 font-mono truncate max-w-xs">
                        {showToken[bot.id] ? bot.token : maskToken(bot.token)}
                      </code>
                      <button onClick={() => setShowToken(p => ({ ...p, [bot.id]: !p[bot.id] }))}
                        className="text-slate-400 hover:text-slate-600 transition-colors">
                        {showToken[bot.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyToClipboard(bot.token, 'Token')}
                        className="text-slate-400 hover:text-blue-500 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {bot.webhookUrl && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Webhook className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400 truncate max-w-sm">{bot.webhookUrl}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(bot)}
                    className={`text-xl transition-colors ${bot.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}
                    title={bot.isActive ? 'Deactivate' : 'Activate'}>
                    {bot.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                  <Link href={`/dashboard/telegram/${bot.id}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button onClick={() => setConfirmDelete(bot.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-600 space-y-1">
          <p><b>How to connect your Telegram bot in 3 steps:</b></p>
          <p>1. Open Telegram → message <b>@BotFather</b> → type <code>/newbot</code></p>
          <p>2. Follow the steps and copy the <b>bot token</b></p>
          <p>3. Paste it here → Vexo will <b>verify &amp; register the webhook automatically</b> ⚡</p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-7 relative animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex items-center justify-center text-white shadow-md">
                {TG_ICON}
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{editBot ? 'Edit Bot' : 'Add New Bot'}</h2>
                <p className="text-xs text-slate-400">{editBot ? 'Update your bot settings' : 'Connect a Telegram bot to Vexo'}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bot Name <span className="text-rose-400">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="e.g. My Support Bot" required />
              </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bot Token <span className="text-rose-400">*</span></label>
                <input value={form.token} onChange={e => setForm(p => ({ ...p, token: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 transition-colors font-mono"
                  placeholder="1234567890:ABCdefGhIjklMnoPQRstuvWXYZ" required />
                <p className="text-xs text-slate-400 mt-1">Get from <span className="text-blue-500">@BotFather</span> → /token · Webhook will be set automatically ✅</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                  placeholder="What does this bot do?" />
              </div>

              {/* Auto-webhook notice */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <span className="text-blue-400 text-lg leading-none">⚡</span>
                <p className="text-xs text-blue-600">
                  <b>Auto-webhook:</b> When you click Add Bot, Vexo will verify your token and automatically register the webhook with Telegram. Your bot will be live instantly — no manual steps needed.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gradient-to-r from-[#2AABEE] to-[#229ED9] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-400/20 hover:shadow-blue-400/30 transition-all disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editBot ? 'Save Changes' : 'Add Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Delete Bot?</h3>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deletingId}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
