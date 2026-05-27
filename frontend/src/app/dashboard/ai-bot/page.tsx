'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, Coins, ToggleLeft, ToggleRight, Upload, Globe, 
  MessageSquare, FileText, CheckCircle2, Loader2, Plus, Settings,
  Activity, Trash2, Edit3, RefreshCw, AlertCircle, Sparkles,
  MessageCircle, HelpCircle, History, Landmark, ShieldAlert, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface KnowledgeItem {
  id: string;
  type: 'FAQ' | 'URL' | 'FILE';
  title: string;
  content: string;
  metadata?: string;
  createdAt: string;
}

interface AiLogItem {
  id: string;
  channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB';
  prompt: string;
  response: string;
  tokensUsed: number;
  status: string;
  createdAt: string;
}

interface PricingRule {
  id: string;
  service: string;
  tokenCost: number;
  label: string;
}

interface RechargeOrder {
  id: string;
  orderId: string;
  amount: number;
  tokensToAdd: number;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  tokens: number;
  description: string;
  createdAt: string;
}

export default function AiBotHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [recharging, setRecharging] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'train' | 'channels' | 'logs' | 'tokens'>('overview');

  // AI Active state and settings
  const [aiActive, setAiActive] = useState(false);
  const [aiResponseLimit, setAiResponseLimit] = useState(1000);
  const [aiResponseCount, setAiResponseCount] = useState(0);

  const [aiActiveTelegram, setAiActiveTelegram] = useState(false);
  const [aiResponseLimitTelegram, setAiResponseLimitTelegram] = useState(1000);
  const [aiResponseCountTelegram, setAiResponseCountTelegram] = useState(0);

  const [aiActiveWeb, setAiActiveWeb] = useState(false);
  const [aiResponseLimitWeb, setAiResponseLimitWeb] = useState(1000);
  const [aiResponseCountWeb, setAiResponseCountWeb] = useState(0);

  const [aiPersonality, setAiPersonality] = useState('Professional');
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiTakeoverKeywords, setAiTakeoverKeywords] = useState('human,support,agent');
  const [chatbotFallback, setChatbotFallback] = useState("Sorry, I didn't catch that. Please type option number.");
  const [businessBio, setBusinessBio] = useState('');

  // Profile metadata
  const [userName, setUserName] = useState('Aftab Hossain');
  const [userPhone, setUserPhone] = useState('+8801700000000');

  // Lists
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLogItem[]>([]);
  
  // Wallet states
  const [tokenBalance, setTokenBalance] = useState(0);
  const [totalRecharged, setTotalRecharged] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rechargeAmount, setRechargeAmount] = useState('500');

  // Modal States
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqTitle, setFaqTitle] = useState('');
  const [faqContent, setFaqContent] = useState('');
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    // Read pre-selected tab from query search params
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'train', 'channels', 'logs', 'tokens'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    fetchInitialData();
  }, [searchParams]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Fetch User Settings
      const settingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAiActive(settingsData.aiActive || false);
        setAiResponseLimit(settingsData.aiResponseLimit || 1000);
        setAiResponseCount(settingsData.aiResponseCount || 0);

        setAiActiveTelegram(settingsData.aiActiveTelegram || false);
        setAiResponseLimitTelegram(settingsData.aiResponseLimitTelegram || 1000);
        setAiResponseCountTelegram(settingsData.aiResponseCountTelegram || 0);

        setAiActiveWeb(settingsData.aiActiveWeb || false);
        setAiResponseLimitWeb(settingsData.aiResponseLimitWeb || 1000);
        setAiResponseCountWeb(settingsData.aiResponseCountWeb || 0);

        setAiPersonality(settingsData.aiPersonality || 'Professional');
        setAiInstructions(settingsData.aiInstructions || '');
        setAiTakeoverKeywords(settingsData.aiTakeoverKeywords || 'human,support,agent');
        setChatbotFallback(settingsData.chatbotFallback || "Sorry, I didn't catch that. Please type option number.");
        setBusinessBio(settingsData.businessBio || '');
        
        // Populate token balances from User model
        setTokenBalance(settingsData.aiTokensRemaining !== undefined ? settingsData.aiTokensRemaining : 1000);
        setTotalRecharged(settingsData.aiTokensPurchased !== undefined ? settingsData.aiTokensPurchased : 0);
        setTotalSpent(settingsData.aiTokensUsed !== undefined ? settingsData.aiTokensUsed : 0);
      }

      // 2. Fetch Profile Info
      const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whatsapp/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const sessionsData = await profileRes.json();
        const activeSession = sessionsData.find((s: any) => s.status === 'CONNECTED') || sessionsData[0];
        if (activeSession) {
          setUserName(activeSession.name || 'Aftab Hossain');
          setUserPhone(activeSession.phone || '+8801700000000');
        }
      }

      // 3. Fetch Knowledge Base Items
      const kbRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/knowledge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (kbRes.ok) {
        const kbData = await kbRes.json();
        setKnowledgeItems(kbData);
      }

      // 4. Fetch AI Logs
      const logsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/ai-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAiLogs(logsData);
      }

      // 5. Fetch Wallet Balance details
      const walletRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        // Fallback only if settingsData did not populate
        setTokenBalance(prev => prev > 0 ? prev : (walletData.wallet?.tokenBalance || 0));
        setTotalRecharged(prev => prev > 0 ? prev : (walletData.wallet?.totalRecharged || 0));
        setTotalSpent(prev => prev > 0 ? prev : (walletData.wallet?.totalSpent || 0));
      }

      // 6. Fetch Wallet pricing rates
      const pricingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/wallet/pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setPricingRules(pricingData.rules || []);
      }

      // 7. Fetch wallet transactions list
      const txRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }

    } catch (err) {
      console.error('Failed to load AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save Settings handler
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          aiActive,
          aiResponseLimit: Number(aiResponseLimit),
          aiActiveTelegram,
          aiResponseLimitTelegram: Number(aiResponseLimitTelegram),
          aiActiveWeb,
          aiResponseLimitWeb: Number(aiResponseLimitWeb),
          aiPersonality,
          aiInstructions,
          aiTakeoverKeywords,
          chatbotFallback
        })
      });

      if (res.ok) {
        toast.success('AI Bot configuration settings saved successfully!');
        fetchInitialData();
      } else {
        toast.error('Failed to save configurations.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection error.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Save FAQ Knowledge item
  const handleSaveFaq = async () => {
    if (!faqTitle || !faqContent) {
      toast.error('Please enter both Question (Title) and Answer (Content)');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      if (editingFaqId) {
        // Edit mode
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/knowledge/${editingFaqId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title: faqTitle, content: faqContent })
        });
        if (res.ok) {
          toast.success('FAQ Knowledge item updated!');
          setIsFaqModalOpen(false);
          fetchInitialData();
        } else {
          toast.error('Failed to update FAQ');
        }
      } else {
        // Add mode
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/knowledge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ type: 'FAQ', title: faqTitle, content: faqContent })
        });
        if (res.ok) {
          toast.success('FAQ Knowledge item added successfully!');
          setIsFaqModalOpen(false);
          fetchInitialData();
        } else {
          toast.error('Failed to add FAQ');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save FAQ');
    }
  };

  // Trigger web scraping
  const handleScrapeUrl = async () => {
    if (!urlInput) {
      toast.error('Please enter a website URL');
      return;
    }
    setScrapingUrl(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'URL', title: urlInput })
      });

      if (res.ok) {
        toast.success('Website content scraped and trained successfully!');
        setIsUrlModalOpen(false);
        setUrlInput('');
        fetchInitialData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to scrape URL.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to connect and scrape page.');
    } finally {
      setScrapingUrl(false);
    }
  };

  // Upload file knowledge
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please choose a file to upload');
      return;
    }
    setUploadingFile(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/knowledge/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        toast.success('File uploaded and text content trained!');
        setIsFileModalOpen(false);
        setSelectedFile(null);
        fetchInitialData();
      } else {
        toast.error('Failed to upload file.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network file upload error.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete Knowledge item
  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge source?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/knowledge/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Knowledge source deleted successfully.');
        fetchInitialData();
      } else {
        toast.error('Failed to delete item.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item.');
    }
  };

  // Clear AI logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all AI Logs history?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/ai-logs`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('AI logs cleared successfully.');
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Buy tokens simulated payment
  const handleTokenRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid recharge amount.');
      return;
    }

    setRecharging(true);
    try {
      const token = localStorage.getItem('token');
      
      // Step 1: Initiate Order
      const initRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/wallet/recharge/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      
      if (!initRes.ok) {
        toast.error('Failed to initiate recharge order.');
        setRecharging(false);
        return;
      }
      
      const initData = await initRes.json();
      const orderId = initData.orderId;

      // Step 2: Verify / Approve immediately
      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/wallet/recharge/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        setTokenBalance(verifyData.newBalance);
        toast.success(`Successfully recharged ₹${amount}! ${verifyData.tokensAdded.toLocaleString()} tokens credited.`);
        fetchInitialData();
      } else {
        toast.error('Payment verification failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Recharge failed.');
    } finally {
      setRecharging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">AI Bot Hub</h1>
            <p className="text-xs text-slate-500 mt-0.5">Train your AI with your company knowledge base, control channels, personality, and view real usage logs.</p>
          </div>
        </div>

        {/* Profile Info Bar with Token info */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
          <div className="flex items-center gap-2 pl-2">
            <span className="text-xs font-bold text-slate-500">Wallet:</span>
            <span className="text-xs font-black text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
              ₹{tokenBalance.toLocaleString()} / {(tokenBalance * 100).toLocaleString()} Tokens
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('tokens')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
          >
            <Coins className="w-3.5 h-3.5" /> Buy Tokens
          </button>
        </div>
      </div>

      {/* Main Container: Full Width Active Tab Panel */}
      <div className="space-y-6">
        
        {/* Active Tab Panel */}
        <div className="space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* AI Toggles Status Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Active Channels</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">🟢 WhatsApp AI:</span>
                      <span className={aiActive ? 'text-emerald-600' : 'text-slate-400'}>{aiActive ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">🔵 Telegram AI:</span>
                      <span className={aiActiveTelegram ? 'text-blue-600' : 'text-slate-400'}>{aiActiveTelegram ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">⚪ Web Chat AI:</span>
                      <span className={aiActiveWeb ? 'text-slate-700' : 'text-slate-400'}>{aiActiveWeb ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>
                </div>

                {/* Knowledge Base statistics */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Knowledge Base</span>
                  <div className="text-3xl font-black text-slate-800">{knowledgeItems.length}</div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Trained FAQ documents & Website links</span>
                </div>

                {/* AI Replies Logged */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Total AI Replies</span>
                  <div className="text-3xl font-black text-indigo-650">{aiLogs.length}</div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Replies captured in AI database logs</span>
                </div>

              </div>

              {/* Channel Stats Overview */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Channel Auto-Reply Counter</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  {/* WhatsApp */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-xs text-emerald-800">WhatsApp</h4>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Response limit usage</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-emerald-700">{aiResponseCount} / {aiResponseLimit}</div>
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-xs text-blue-800">Telegram</h4>
                      <p className="text-[10px] text-blue-600 mt-0.5">Response limit usage</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-blue-700">{aiResponseCountTelegram} / {aiResponseLimitTelegram}</div>
                    </div>
                  </div>

                  {/* Web */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">Web Widget</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Response limit usage</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-slate-700">{aiResponseCountWeb} / {aiResponseLimitWeb}</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bot Persona Quick Preview */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} /> Active AI Personality
                  </h3>
                  <span className="px-3 py-1 bg-yellow-50 border border-yellow-250 text-yellow-750 font-bold text-[10px] uppercase rounded-full">
                    {aiPersonality}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Custom Prompt Instructions</span>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold italic">
                      {aiInstructions ? `"${aiInstructions}"` : 'No custom instructions defined. The bot will act as a standard professional sales and support executive.'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Takeover keywords: {aiTakeoverKeywords}</span>
                    <span>Fallback: {chatbotFallback}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TRAIN AI */}
          {activeTab === 'train' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Training Action Cards */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">+ ADD KNOWLEDGE SOURCE</h2>
                  <p className="text-[11px] text-slate-400 mt-1">Provide information about your business to train the chatbot engine dynamically.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Upload File */}
                  <div 
                    onClick={() => setIsFileModalOpen(true)}
                    className="border border-slate-200 hover:border-blue-300 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-white group"
                  >
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-sm">
                      <Upload className="w-5.5 h-5.5" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">Upload Text Document</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">Train using TXT, CSV, Markdown, or JSON files.</p>
                  </div>

                  {/* Add URL */}
                  <div 
                    onClick={() => setIsUrlModalOpen(true)}
                    className="border border-slate-200 hover:border-purple-300 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-white group"
                  >
                    <div className="w-11 h-11 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-sm">
                      <Globe className="w-5.5 h-5.5" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">Scrape Website URL</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">Provide a link (e.g. FAQ page) to extract web text.</p>
                  </div>

                  {/* Add FAQ */}
                  <div 
                    onClick={() => {
                      setEditingFaqId(null);
                      setFaqTitle('');
                      setFaqContent('');
                      setIsFaqModalOpen(true);
                    }}
                    className="border border-slate-200 hover:border-amber-300 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-white group"
                  >
                    <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-sm">
                      <MessageSquare className="w-5.5 h-5.5" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">Add FAQ Entry</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">Manually create question-answer contexts.</p>
                  </div>

                </div>
              </div>

              {/* Documents List */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-800 text-xs tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" /> TRAINING SOURCE DOCUMENTS
                  </h3>
                  <span className="text-[10px] bg-slate-150 text-slate-600 font-extrabold px-2 py-0.5 rounded-full">
                    {knowledgeItems.length} total
                  </span>
                </div>

                {knowledgeItems.length > 0 ? (
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {knowledgeItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between bg-slate-50/40 hover:bg-slate-50 transition-colors gap-4"
                      >
                        <div className="flex gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            item.type === 'FAQ' ? 'bg-amber-50 text-amber-600' :
                            item.type === 'URL' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {item.type === 'FAQ' ? <MessageSquare className="w-4.5 h-4.5" /> :
                             item.type === 'URL' ? <Globe className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                item.type === 'FAQ' ? 'bg-amber-100/50 text-amber-700' :
                                item.type === 'URL' ? 'bg-purple-100/50 text-purple-700' : 'bg-blue-100/50 text-blue-700'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal max-w-2xl">{item.content}</p>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-2">
                              Trained on {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {item.type === 'FAQ' && (
                            <button
                              onClick={() => {
                                setEditingFaqId(item.id);
                                setFaqTitle(item.title);
                                setFaqContent(item.content);
                                setIsFaqModalOpen(true);
                              }}
                              className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 rounded-lg shadow-sm transition-all"
                              title="Edit FAQ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKnowledge(item.id)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 rounded-lg shadow-sm transition-all"
                            title="Delete Source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                    No custom training source files or FAQ items found. Use buttons above to train your AI.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: CHANNELS & PERSONA */}
          {activeTab === 'channels' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Channels toggles */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Multi-Channel AI Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* WhatsApp Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> WhatsApp AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiActive(!aiActive)}
                        className="transition-transform active:scale-90"
                      >
                        {aiActive ? (
                          <ToggleRight className="w-11 h-11 text-emerald-500 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-11 h-11 text-slate-350 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Limit count</label>
                      <input
                        type="number"
                        value={aiResponseLimit}
                        onChange={e => setAiResponseLimit(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Telegram Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Telegram AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiActiveTelegram(!aiActiveTelegram)}
                        className="transition-transform active:scale-90"
                      >
                        {aiActiveTelegram ? (
                          <ToggleRight className="w-11 h-11 text-blue-500 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-11 h-11 text-slate-350 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Limit count</label>
                      <input
                        type="number"
                        value={aiResponseLimitTelegram}
                        onChange={e => setAiResponseLimitTelegram(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Web Chat Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-650"></span> Web Chat AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiActiveWeb(!aiActiveWeb)}
                        className="transition-transform active:scale-90"
                      >
                        {aiActiveWeb ? (
                          <ToggleRight className="w-11 h-11 text-slate-700 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-11 h-11 text-slate-350 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Limit count</label>
                      <input
                        type="number"
                        value={aiResponseLimitWeb}
                        onChange={e => setAiResponseLimitWeb(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Bot Persona, instructions and Takeover */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Persona & Custom Prompt Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Select AI Personality */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Personality Style</label>
                    <select
                      value={aiPersonality}
                      onChange={e => setAiPersonality(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Professional">Professional (Formal & Polite)</option>
                      <option value="Friendly">Friendly (Casual & Welcoming)</option>
                      <option value="Sales">Sales-Driven (Persuasive)</option>
                      <option value="Support">Support Agent (Empathetic)</option>
                      <option value="Custom">Custom Instructions Only</option>
                    </select>
                  </div>

                  {/* Takeover keywords */}
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Human Takeover Trigger Keywords (Comma-separated)</label>
                    <input
                      type="text"
                      value={aiTakeoverKeywords}
                      onChange={e => setAiTakeoverKeywords(e.target.value)}
                      placeholder="e.g. human,agent,support,talk to staff"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[9px] text-slate-400 block leading-normal mt-1">If the customer type matches any word, the bot auto-pauses so you can reply from the unified inbox.</span>
                  </div>

                  {/* Custom System Prompt Instructions */}
                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom System Prompt Instructions</label>
                    <textarea
                      rows={4}
                      value={aiInstructions}
                      onChange={e => setAiInstructions(e.target.value)}
                      placeholder="e.g. You are the Vexo support bot. Always offer free shipping above 2000 BDT. Suggest the client details about our return policies."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* Chatbot Fallback Message */}
                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chatbot Fallback Message (If AI is off or flow doesn't match)</label>
                    <input
                      type="text"
                      value={chatbotFallback}
                      onChange={e => setChatbotFallback(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save AI Configurations'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* logs list card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-800 text-xs tracking-wider flex items-center gap-2">
                    <History className="w-4.5 h-4.5 text-slate-500" /> AI AUTO-REPLY CHATBOT LOGS
                  </h3>
                  <button 
                    onClick={handleClearLogs}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 bg-red-50/50 hover:bg-red-50 border border-red-100/50 rounded-xl px-3 py-1.5 transition-all"
                  >
                    Clear History
                  </button>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Channel</th>
                        <th className="px-5 py-3">User Prompt</th>
                        <th className="px-5 py-3">AI Response</th>
                        <th className="px-5 py-3">Tokens</th>
                        <th className="px-5 py-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                      {aiLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              log.channel === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              log.channel === 'TELEGRAM' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {log.channel}
                            </span>
                          </td>
                          <td className="px-5 py-3 max-w-[200px] truncate" title={log.prompt}>{log.prompt}</td>
                          <td className="px-5 py-3 max-w-[260px] truncate text-slate-500" title={log.response}>{log.response}</td>
                          <td className="px-5 py-3 font-mono font-bold text-indigo-650">{log.tokensUsed} tokens</td>
                          <td className="px-5 py-3 text-right text-slate-400">
                            {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}

                      {aiLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                            No auto-reply AI logs recorded yet. Incoming messages parsed by AI will log details here.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: TOKENS */}
          {activeTab === 'tokens' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Total Balance */}
                <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
                    <Coins className="w-24 h-24" />
                  </div>
                  <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded uppercase tracking-wider w-fit">
                    TOKEN BALANCE
                  </span>
                  <div>
                    <div className="text-3xl font-black tracking-tight mt-2">
                      {tokenBalance.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-200">Available AI Tokens</span>
                  </div>
                </div>

                {/* Rates Info */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-36">
                  <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                    <Check className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-800 mt-2">1 INR (₹) = 100 Tokens</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Conversion Rate</span>
                  </div>
                </div>

                {/* Pricing Rules Count */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-36">
                  <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-800 mt-2">{transactions.length}</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Ledger Deductions</span>
                  </div>
                </div>

              </div>

              {/* Purchase and rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Recharge form */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="font-black text-slate-800 text-xs tracking-wider uppercase">Purchase AI Tokens</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount to Recharge (₹ / INR)</label>
                      <input 
                        type="number"
                        value={rechargeAmount}
                        onChange={e => setRechargeAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleTokenRecharge}
                      disabled={recharging}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95"
                    >
                      {recharging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                      Recharge Tokens (Simulated Instant Approval)
                    </button>
                    <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                      Payment approval is simulated automatically. Credits balance instantly.
                    </p>
                  </div>
                </div>

                {/* Rate card matrix */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="font-black text-slate-800 text-xs tracking-wider uppercase">AI Token Cost Matrix</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl px-4 py-1 bg-slate-50/20">
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-650 flex items-center gap-1.5">🟢 WhatsApp AI Reply</span>
                      <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">2 tokens</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-650 flex items-center gap-1.5">🔵 Telegram AI Reply</span>
                      <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">2 tokens</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-650 flex items-center gap-1.5">⚪ Web Chat AI Reply</span>
                      <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">2 tokens</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-650 flex items-center gap-1.5">⚡ Standard Flow Node</span>
                      <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">0.5 tokens</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Transactions logs */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="font-black text-slate-800 text-xs tracking-wider uppercase">Token Recharge & Usage Ledger</h4>
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 text-slate-900">{tx.description}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              tx.type === 'RECHARGE' || tx.type === 'ADMIN_ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-rose-50 text-rose-700 border border-rose-105'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`px-5 py-3 font-bold ${
                            tx.tokens >= 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}>
                            {tx.tokens >= 0 ? `+${tx.tokens.toLocaleString()}` : `${tx.tokens.toLocaleString()}`} tokens
                          </td>
                          <td className="px-5 py-3 text-right text-slate-400">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}

                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                            No ledger logs recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: ADD / EDIT FAQ */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden relative animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm tracking-wider flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" /> {editingFaqId ? 'EDIT FAQ ENTRY' : 'ADD NEW FAQ ENTRY'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Question / Prompt Keyword</label>
                <input
                  type="text"
                  value={faqTitle}
                  onChange={e => setFaqTitle(e.target.value)}
                  placeholder="e.g. What are your store business hours?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:border-blue-500 outline-none text-slate-800 font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Answer / Knowledge Content Details</label>
                <textarea
                  rows={5}
                  value={faqContent}
                  onChange={e => setFaqContent(e.target.value)}
                  placeholder="e.g. Vexo Store is open Monday through Friday, 10 AM to 8 PM. Closed on weekends."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs focus:border-blue-500 outline-none text-slate-800 leading-normal"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setIsFaqModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFaq}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {editingFaqId ? 'Update & Train' : 'Add FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: URL SCRAPING */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden relative animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm tracking-wider flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" /> SCRAPE KNOWLEDGE FROM WEBSITE URL
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-100 p-3.5 rounded-2xl text-[10px] leading-relaxed text-purple-800 font-semibold">
                Provide a public webpage URL (like your store homepage, info page, or FAQs page). Our engine will crawl the URL, strip HTML tags, and train the AI on the extracted text.
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Website URL Link</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://yourstore.com/faqs"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:border-blue-500 outline-none text-slate-800 font-semibold"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => {
                  setIsUrlModalOpen(false);
                  setUrlInput('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleScrapeUrl}
                disabled={scrapingUrl}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {scrapingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                {scrapingUrl ? 'Scraping URL...' : 'Scrape Webpage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FILE UPLOAD */}
      {isFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden relative animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm tracking-wider flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> UPLOAD TRAINING DOCUMENT FILE
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl text-[10px] leading-relaxed text-blue-800 font-semibold">
                Upload a structured file containing knowledge contexts. Supported text-based file formats: .txt, .csv, .md, .json.
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Choose File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.csv,.md,.json"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-kb-upload"
                  />
                  <label htmlFor="file-kb-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <span className="text-xs font-bold text-slate-600 block">
                      {selectedFile ? selectedFile.name : 'Click here to choose file'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Limit 50MB per file'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => {
                  setIsFileModalOpen(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleFileUpload}
                disabled={uploadingFile}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingFile ? 'Uploading file...' : 'Upload & Train'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
