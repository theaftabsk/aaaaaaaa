'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, ShoppingCart, MessageSquare, Send, CheckCircle2, 
  X, HelpCircle, Loader2, ArrowRight, Key, Link as LinkIcon 
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  type: 'wordpress' | 'shopify' | 'whatsapp_meta' | 'telegram';
  icon: any;
  color: string;
  bg: string;
  badge: string;
  isConnected: boolean;
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form Fields
  const [wordpressUrl, setWordpressUrl] = useState('');
  const [wordpressToken, setWordpressToken] = useState('');

  const [shopifyUrl, setShopifyUrl] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');

  const [metaToken, setMetaToken] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');

  const [telegramToken, setTelegramToken] = useState('');

  // Connection status states
  const [connections, setConnections] = useState({
    wordpress: false,
    shopify: false,
    whatsapp_meta: false,
    telegram: false
  });

  // Fetch initial connection data from backend & localStorage
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          
          setWordpressUrl(data.wordpressStoreUrl || '');
          setWordpressToken(data.wordpressAccessToken || '');
          
          setShopifyUrl(data.shopifyStoreUrl || '');
          setShopifyToken(data.shopifyAccessToken || '');
          
          setMetaToken(data.apiAccessToken || '');
          setMetaPhoneId(data.apiPhoneNumberId || '');
          setMetaWabaId(data.apiWabaId || '');

          setConnections(prev => ({
            ...prev,
            wordpress: !!(data.wordpressStoreUrl && data.wordpressAccessToken),
            shopify: !!(data.shopifyStoreUrl && data.shopifyAccessToken),
            whatsapp_meta: !!(data.apiAccessToken && data.apiPhoneNumberId && data.apiWabaId)
          }));
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      } finally {
        // Load Telegram connection from local storage
        const tgToken = localStorage.getItem('telegram_bot_token');
        if (tgToken) {
          setTelegramToken(tgToken);
          setConnections(prev => ({ ...prev, telegram: true }));
        }
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveIntegration = async (type: 'wordpress' | 'shopify' | 'whatsapp_meta' | 'telegram') => {
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      if (type === 'telegram') {
        if (!telegramToken.trim()) {
          alert('Please enter a valid Telegram Bot Token');
          setSaving(false);
          return;
        }
        localStorage.setItem('telegram_bot_token', telegramToken.trim());
        setConnections(prev => ({ ...prev, telegram: true }));
        alert('Telegram integration configured successfully!');
        setActiveModal(null);
        setSaving(false);
        return;
      }

      // Prepare payload for backend
      const payload: any = {};
      if (type === 'wordpress') {
        payload.wordpressStoreUrl = wordpressUrl.trim();
        payload.wordpressAccessToken = wordpressToken.trim();
      } else if (type === 'shopify') {
        payload.shopifyStoreUrl = shopifyUrl.trim();
        payload.shopifyAccessToken = shopifyToken.trim();
      } else if (type === 'whatsapp_meta') {
        payload.apiAccessToken = metaToken.trim();
        payload.apiPhoneNumberId = metaPhoneId.trim();
        payload.apiWabaId = metaWabaId.trim();
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setConnections(prev => ({
          ...prev,
          [type]: true
        }));
        alert(`${type.toUpperCase().replace('_', ' ')} integration saved successfully!`);
        setActiveModal(null);
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (type: 'wordpress' | 'shopify' | 'whatsapp_meta' | 'telegram') => {
    if (!confirm(`Are you sure you want to disconnect ${type.toUpperCase().replace('_', ' ')}?`)) return;
    
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      if (type === 'telegram') {
        localStorage.removeItem('telegram_bot_token');
        setTelegramToken('');
        setConnections(prev => ({ ...prev, telegram: false }));
        alert('Telegram disconnected.');
        setSaving(false);
        return;
      }

      const payload: any = {};
      if (type === 'wordpress') {
        payload.wordpressStoreUrl = '';
        payload.wordpressAccessToken = '';
        setWordpressUrl('');
        setWordpressToken('');
      } else if (type === 'shopify') {
        payload.shopifyStoreUrl = '';
        payload.shopifyAccessToken = '';
        setShopifyUrl('');
        setShopifyToken('');
      } else if (type === 'whatsapp_meta') {
        payload.apiAccessToken = '';
        payload.apiPhoneNumberId = '';
        payload.apiWabaId = '';
        setMetaToken('');
        setMetaPhoneId('');
        setMetaWabaId('');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setConnections(prev => ({
          ...prev,
          [type]: false
        }));
        alert(`${type.toUpperCase().replace('_', ' ')} disconnected.`);
      }
    } catch (err) {
      console.error(err);
      alert('Error disconnecting integration.');
    } finally {
      setSaving(false);
    }
  };

  const apps: Integration[] = [
    {
      id: 'wordpress',
      name: 'WordPress / WooCommerce',
      description: 'Automatically trigger notifications on purchase, status updates, or custom customer action.',
      type: 'wordpress',
      icon: Globe,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      badge: 'CMS / Commerce',
      isConnected: connections.wordpress
    },
    {
      id: 'shopify',
      name: 'Shopify Store',
      description: 'Sync customer shopping carts, send invoice pdfs, and configure auto chat bots for abandoned checkouts.',
      type: 'shopify',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      badge: 'E-commerce',
      isConnected: connections.shopify
    },
    {
      id: 'whatsapp_meta',
      name: 'WhatsApp Meta Cloud API',
      description: 'Official API integration with high rate limits, direct catalog sync, and verified green badge.',
      type: 'whatsapp_meta',
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      badge: 'Official API',
      isConnected: connections.whatsapp_meta
    },
    {
      id: 'telegram',
      name: 'Telegram Bot Account',
      description: 'Configure interactive Telegram Bot replies, broadcast messages, and unified team inbox conversations.',
      type: 'telegram',
      icon: Send,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      badge: 'Messenger Bot',
      isConnected: connections.telegram
    }
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Integrations & Channels</h2>
          <p className="text-sm text-slate-500 mt-1">Connect e-commerce platforms, customer messengers, and official APIs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apps.map((app) => (
          <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${app.bg} ${app.color} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <app.icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
                    {app.badge}
                  </span>
                  {app.isConnected && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="font-bold text-base text-slate-800 mb-2">{app.name}</h3>
              <p className="text-[13px] leading-relaxed text-slate-500 mb-6">{app.description}</p>
            </div>
            
            <div className="flex gap-3">
              {app.isConnected ? (
                <>
                  <button 
                    onClick={() => setActiveModal(app.type)}
                    className="flex-1 text-center bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-colors"
                  >
                    Edit Config
                  </button>
                  <button 
                    onClick={() => handleDisconnect(app.type)}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setActiveModal(app.type)}
                  className="w-full text-center bg-blue-50 text-blue-700 font-semibold py-2 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all text-xs"
                >
                  Setup Integration
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connection Modal Overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-850 text-base">
                Configure {activeModal === 'whatsapp_meta' ? 'WhatsApp Meta Cloud API' : activeModal.charAt(0).toUpperCase() + activeModal.slice(1)}
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Setup Instruction Alert */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-blue-700">
                <HelpCircle className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                <div>
                  {activeModal === 'wordpress' && (
                    <p>Enter your WooCommerce site url and credentials. Make sure WooCommerce REST API is enabled with Read/Write keys in Settings &gt; Advanced &gt; REST API.</p>
                  )}
                  {activeModal === 'shopify' && (
                    <p>Provide your store Shopify URL (e.g. mystore.myshopify.com) and the Admin API Access Token created under Custom Apps in your Shopify Admin panel.</p>
                  )}
                  {activeModal === 'whatsapp_meta' && (
                    <p>Copy your Meta developer configurations. Setup WhatsApp Business Platform on developers.facebook.com and get your permanent Access Token.</p>
                  )}
                  {activeModal === 'telegram' && (
                    <p>Get a bot token by messaging <strong>@BotFather</strong> on Telegram, type /newbot, follow the prompts, and copy the HTTP API Access Token here.</p>
                  )}
                </div>
              </div>

              {/* Form Input fields */}
              {activeModal === 'wordpress' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">WooCommerce Store URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="url"
                        placeholder="https://example.com"
                        value={wordpressUrl}
                        onChange={e => setWordpressUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">REST API App Password / Access Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        placeholder="ck_xxxxx..."
                        value={wordpressToken}
                        onChange={e => setWordpressToken(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'shopify' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Shopify Store URL (.myshopify.com)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="mystore.myshopify.com"
                        value={shopifyUrl}
                        onChange={e => setShopifyUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Admin API Access Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        placeholder="shpat_xxxxx..."
                        value={shopifyToken}
                        onChange={e => setShopifyToken(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'whatsapp_meta' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Permanent Access Token</label>
                    <textarea 
                      rows={2}
                      placeholder="EAAGxxxxx..."
                      value={metaToken}
                      onChange={e => setMetaToken(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone Number ID</label>
                    <input 
                      type="text"
                      placeholder="e.g. 10984729184"
                      value={metaPhoneId}
                      onChange={e => setMetaPhoneId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">WhatsApp Business Account ID (WABA ID)</label>
                    <input 
                      type="text"
                      placeholder="e.g. 984029482014"
                      value={metaWabaId}
                      onChange={e => setMetaWabaId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                    />
                  </div>
                </div>
              )}

              {activeModal === 'telegram' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Telegram Bot HTTP API Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsT..."
                        value={telegramToken}
                        onChange={e => setTelegramToken(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-450"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSaveIntegration(activeModal as any)}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    Save Configuration <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
