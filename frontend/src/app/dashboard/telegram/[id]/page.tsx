'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Bot, Save, Loader2, Play, Pause, RefreshCw,
  Cpu, LayoutGrid, Info, ShieldAlert, Sparkles, HelpCircle,
  ExternalLink, Eye, EyeOff, Copy
} from 'lucide-react';

type ChatbotFlow = {
  id: string;
  name: string;
  isActive: boolean;
};

type TelegramBot = {
  id: string;
  name: string;
  token: string;
  username?: string;
  webhookUrl?: string;
  isActive: boolean;
  description?: string;
  chatbotFlowId?: string | null;
  aiActive: boolean;
  aiResponseLimit: number;
  aiResponseCount: number;
};

const BOTS_API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/telegram/bots`;
const FLOWS_API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow`;

function getToken() {
  return localStorage.getItem('token') || '';
}

export default function TelegramBotDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [bot, setBot] = useState<TelegramBot | null>(null);
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingCount, setResettingCount] = useState(false);

  // Form settings state
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [description, setDescription] = useState('');
  const [chatbotFlowId, setChatbotFlowId] = useState('');
  const [aiActive, setAiActive] = useState(false);
  const [aiResponseLimit, setAiResponseLimit] = useState(1000);
  const [showToken, setShowToken] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch bot details
      const botRes = await fetch(`${BOTS_API}/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!botRes.ok) throw new Error('Failed to load bot details');
      const botData: TelegramBot = await botRes.json();
      
      setBot(botData);
      setName(botData.name);
      setToken(botData.token);
      setDescription(botData.description || '');
      setChatbotFlowId(botData.chatbotFlowId || '');
      setAiActive(botData.aiActive);
      setAiResponseLimit(botData.aiResponseLimit);

      // 2. Fetch chatbot flows
      const flowsRes = await fetch(FLOWS_API, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        setFlows(Array.isArray(flowsData) ? flowsData : []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id, fetchDetails]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token.trim()) {
      return toast.error('Name and token are required.');
    }

    setSaving(true);
    try {
      const res = await fetch(`${BOTS_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name,
          token,
          description,
          chatbotFlowId: chatbotFlowId === '' ? '' : chatbotFlowId,
          aiActive,
          aiResponseLimit: Number(aiResponseLimit),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      if (data.webhookMessage) {
        toast.success(data.webhookMessage, { duration: 5000 });
      } else {
        toast.success('Bot settings saved successfully!');
      }

      fetchDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    if (!confirm('Are you sure you want to reset the AI reply counter to 0?')) return;
    setResettingCount(true);
    try {
      const res = await fetch(`${BOTS_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          aiResponseCount: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to reset counter');
      toast.success('AI reply counter reset!');
      fetchDetails();
    } catch (err: any) {
      toast.error(err.message || 'Error resetting counter');
    } finally {
      setResettingCount(false);
    }
  };

  const toggleActiveStatus = async () => {
    if (!bot) return;
    try {
      const res = await fetch(`${BOTS_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          isActive: !bot.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
      toast.success(bot.isActive ? 'Bot deactivated' : 'Bot activated');
      fetchDetails();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading bot settings...</p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center mt-12 bg-white border border-slate-200 rounded-3xl">
        <Bot className="w-12 h-12 text-slate-350 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Bot Not Found</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">The Telegram bot you are trying to view does not exist or you do not have permission.</p>
        <Link href="/dashboard/telegram" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
          Back to Telegram Bots
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20 p-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8 pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/telegram"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-655 rounded-xl shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg ${bot.isActive ? 'bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-blue-400/30' : 'bg-slate-300 shadow-slate-200/50'}`}>
              <Bot className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{bot.name}</h1>
                {bot.username && (
                  <a href={`https://t.me/${bot.username}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5 bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-100 font-medium">
                    @{bot.username} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">Configure chatbot flows and AI automation settings for this bot</p>
            </div>
          </div>
        </div>

        {/* Quick status actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleActiveStatus}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm border transition-all ${
              bot.isActive
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {bot.isActive ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Deactivate Bot
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Activate Bot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: General Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bot className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-800 text-[15px]">General Configuration</h2>
            </div>

            <div className="space-y-4">
              {/* Bot Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bot Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Support Assistant Bot"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-400 transition-all font-medium"
                  required
                />
              </div>

              {/* Bot Token */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bot Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="e.g. 1234567890:ABCdef..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-24 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-400 transition-all font-mono"
                    required
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showToken ? 'Hide Token' : 'Show Token'}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(token, 'Bot Token')}
                      className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                      title="Copy Token"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the purpose of this bot?"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-400 transition-all resize-none font-medium"
                />
              </div>

              {/* Webhook URL */}
              {bot.webhookUrl && (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Active Webhook URL</span>
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-xs text-slate-600 font-mono truncate select-all">{bot.webhookUrl}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bot.webhookUrl || '', 'Webhook URL')}
                      className="text-xs text-blue-600 font-bold hover:text-blue-700 flex-shrink-0"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chatbot & AI settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 text-[15px]">Chatbot &amp; AI Integration</h2>
            </div>

            <div className="space-y-5">
              
              {/* Chatbot Flow Connection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-450" /> Connect Chatbot Flow
                  </label>
                  <Link href="/dashboard/builder" className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
                    Go to Flow Builder ➔
                  </Link>
                </div>
                
                <div className="relative">
                  <select
                    value={chatbotFlowId}
                    onChange={(e) => setChatbotFlowId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 appearance-none text-slate-700 cursor-pointer pr-10 font-medium"
                  >
                    <option value="">None - Direct AI or Fallback Only</option>
                    {flows.map((flow) => (
                      <option key={flow.id} value={flow.id}>
                        {flow.name} {!flow.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-3.5 pointer-events-none border-l pl-2 border-slate-200 text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">If connected, incoming triggers in this bot will initiate the selected chatbot flow.</p>
              </div>

              {/* AI Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> AI Auto-Responder</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Use OpenAI/Gemini to reply to queries</span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiActive}
                      onChange={(e) => setAiActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {aiActive && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-in slide-in-from-top-2 duration-200">
                    
                    {/* Response Limit */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Response Limit (Messages)</label>
                      <input
                        type="number"
                        value={aiResponseLimit}
                        onChange={(e) => setAiResponseLimit(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-400 font-bold"
                        min={1}
                        required
                      />
                    </div>

                    {/* AI Response Counter & Reset */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Replies Sent</span>
                        <span className="text-base font-black text-slate-800">
                          {bot.aiResponseCount} / {aiResponseLimit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetCounter}
                        disabled={resettingCount}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-all"
                      >
                        {resettingCount ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Reset
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* Status Warning if inactive */}
              {!bot.isActive && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <p><b>Notice:</b> This bot is inactive. It will not listen to webhook triggers or execute chatbot flows until you activate it.</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Submit Bar at bottom */}
        <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-4 flex justify-between items-center shadow-sm">
          <Link href="/dashboard/telegram" className="text-slate-500 hover:text-slate-800 text-sm font-semibold pl-2">
            Discard changes
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>

      </form>
    </div>
  );
}
