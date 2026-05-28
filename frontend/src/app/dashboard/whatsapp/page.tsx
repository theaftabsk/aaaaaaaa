'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Phone, Wifi, WifiOff, X, AlertTriangle, Loader2,
  MessageSquare, FileText, CheckCircle2, User, Copy, HelpCircle,
  ExternalLink, Key, Smartphone, Star, Zap, Shield,
  Globe, ArrowLeft, Check, Lock, Settings, RefreshCw, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

type DayHours = { enabled: boolean; open: string; close: string };
type WeekHours = Record<string, DayHours>;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const DEFAULT_HOURS: WeekHours = {
  mon: { enabled: true,  open: '09:00', close: '18:00' },
  tue: { enabled: true,  open: '09:00', close: '18:00' },
  wed: { enabled: true,  open: '09:00', close: '18:00' },
  thu: { enabled: true,  open: '09:00', close: '18:00' },
  fri: { enabled: true,  open: '09:00', close: '18:00' },
  sat: { enabled: true,  open: '10:00', close: '16:00' },
  sun: { enabled: false, open: '00:00', close: '00:00' },
};

export default function WhatsAppConnection() {
  const [loading, setLoading] = useState(true);
  const [engine, setEngine] = useState<'QR' | 'API'>('API');
  
  // Settings / API Credentials states
  const [metaToken, setMetaToken] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [userProfileName, setUserProfileName] = useState('');
  const [userProfilePhone, setUserProfilePhone] = useState('');

  const [showApiModal, setShowApiModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // AI Chatbot & Flow Automation states
  const [aiActive, setAiActive] = useState(false);
  const [aiResponseLimit, setAiResponseLimit] = useState(1000);
  const [aiResponseCount, setAiResponseCount] = useState(0);
  const [whatsappFlowId, setWhatsappFlowId] = useState('');
  const [flows, setFlows] = useState<any[]>([]);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [resettingCount, setResettingCount] = useState(false);
  
  // API Connection setup states (Facebook flow / manual setup)
  const [apiSetupStep, setApiSetupStep] = useState<'CHOOSE' | 'MANUAL' | 'FACEBOOK_FLOW'>('CHOOSE');
  const [fbStep, setFbStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFbBusiness, setSelectedFbBusiness] = useState('');
  const [selectedFbProfile, setSelectedFbProfile] = useState('');
  
  // Business Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizStatus, setBizStatus] = useState('');
  const [bizDesc, setBizDesc] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizIndustry, setBizIndustry] = useState('');

  // Calling Settings States
  const [receiveCalls, setReceiveCalls] = useState(false);
  const [showCallIcon, setShowCallIcon] = useState(false);
  const [callbackPermission, setCallbackPermission] = useState(false);

  // Business Hours States
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [hoursConfigured, setHoursConfigured] = useState(false);
  const [businessHours, setBusinessHours] = useState<WeekHours>({ ...DEFAULT_HOURS });
  
  // Syncing State
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [subPlan, setSubPlan] = useState('Free');
  const [activeView, setActiveView] = useState<'LIST' | 'DETAILS'>('LIST');

  // Meta Health States
  const [metaQuality, setMetaQuality] = useState('-');
  const [metaLimit, setMetaLimit] = useState('-');
  const [metaPhoneStatus, setMetaPhoneStatus] = useState('-');
  const [metaConnection, setMetaConnection] = useState('Connected');
  const [metaVerification, setMetaVerification] = useState('-');
  const [metaAccountStatus, setMetaAccountStatus] = useState('-');
  const [metaPayment, setMetaPayment] = useState('-');
  const [metaWebhook, setMetaWebhook] = useState('Active');

  const syncWithMetaAPI = async (token: string, phoneId: string, wabaId: string) => {
    if (!token || !phoneId) return;
    
    // If it's a sandbox/mock token, don't query Meta
    if (token.startsWith('EAAG_fb_oauth_token_')) {
      return;
    }

    setSyncingMeta(true);
    try {
      // 1. Fetch phone number details
      const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}?fields=quality_rating,status,account_status,display_phone_number,name_status,verified_name,messaging_limit_tier`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        const finalName = phoneData.verified_name || phoneData.display_phone_number || '';
        setBizName(finalName);
        setUserProfileName(finalName);
        setUserProfilePhone(phoneData.display_phone_number || '');
        
        setMetaQuality(phoneData.quality_rating || 'UNKNOWN');
        setMetaPhoneStatus(phoneData.status || 'Pending');
        setMetaAccountStatus(phoneData.account_status || 'APPROVED');
        setMetaLimit(phoneData.messaging_limit_tier || '-');
      }

      // 2. Fetch business profile details
      const profileRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.data && profileData.data[0]) {
          const p = profileData.data[0];
          setBizStatus(p.about || '');
          setBizAddress(p.address || '');
          setBizDesc(p.description || '');
          setBizEmail(p.email || '');
          setBizWebsite(p.websites ? p.websites[0] : '');
          setBizIndustry(p.vertical || '');
        }
      }
    } catch (err) {
      console.error('Error syncing with Meta API:', err);
    } finally {
      setSyncingMeta(false);
    }
  };

  const updateMetaProfileAPI = async () => {
    setCreating(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/whatsapp_business_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${metaToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          address: bizAddress,
          description: bizDesc,
          email: bizEmail,
          websites: [bizWebsite ? [bizWebsite] : []],
          vertical: bizIndustry,
          about: bizStatus
        })
      });

      if (res.ok) {
        toast.success('Profile details updated successfully on Meta Cloud API!');
        setIsEditingProfile(false);
      } else {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update profile on Meta.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating Meta business profile.');
    } finally {
      setCreating(false);
    }
  };

  const saveProfileToDatabase = async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappBizName: bizName,
          whatsappBizStatus: bizStatus,
          businessBio: bizDesc,
          whatsappBizAddress: bizAddress,
          whatsappBizEmail: bizEmail,
          whatsappBizWebsite: bizWebsite,
          whatsappBizIndustry: bizIndustry
        })
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to save profile to database:', err);
      return false;
    }
  };

  const saveCallingSettings = async (nextReceive: boolean, nextShowIcon: boolean, nextCallback: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappReceiveCalls: nextReceive,
          whatsappShowCallIcon: nextShowIcon,
          whatsappCallbackPermission: nextCallback
        })
      });
    } catch (err) {
      console.error('Failed to save calling settings:', err);
    }
  };

  const saveHoursToDatabase = async (configured: boolean, hours?: WeekHours) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappHoursConfigured: configured,
          whatsappBusinessHours: hours ?? businessHours,
        })
      });
    } catch (err) {
      console.error('Failed to save business hours:', err);
    }
  };

  const handleSaveProfileDetails = async () => {
    setCreating(true);
    const dbSuccess = await saveProfileToDatabase();
    if (!dbSuccess) {
      toast.error('Failed to save profile details to database.');
      setCreating(false);
      return;
    }

    setUserProfileName(bizName || '');

    if (!metaToken || metaToken.startsWith('EAAG_fb_oauth_token_')) {
      toast.success('Business profile updated successfully!');
      setIsEditingProfile(false);
      setCreating(false);
      return;
    }
    await updateMetaProfileAPI();
  };

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Fetch User Settings (to read engine mode)
      const settingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setEngine('API');
        setSubPlan(settingsData.subscriptionPlan || 'Free');
        
        const accessToken = settingsData.apiAccessToken || '';
        const phoneId = settingsData.apiPhoneNumberId || '';
        const wabaId = settingsData.apiWabaId || '';
        
        setMetaToken(accessToken);
        setMetaPhoneId(phoneId);
        setMetaWabaId(wabaId);

        // Load saved WhatsApp fields from database settings
        setBizName(settingsData.whatsappBizName || '');
        setBizStatus(settingsData.whatsappBizStatus || '');
        setBizDesc(settingsData.businessBio || '');
        setBizAddress(settingsData.whatsappBizAddress || '');
        setBizEmail(settingsData.whatsappBizEmail || '');
        setBizWebsite(settingsData.whatsappBizWebsite || '');
        setBizIndustry(settingsData.whatsappBizIndustry || '');
        
        setReceiveCalls(settingsData.whatsappReceiveCalls || false);
        setShowCallIcon(settingsData.whatsappShowCallIcon || false);
        setCallbackPermission(settingsData.whatsappCallbackPermission || false);
        setHoursConfigured(settingsData.whatsappHoursConfigured || false);
        if (settingsData.whatsappBusinessHours && typeof settingsData.whatsappBusinessHours === 'object') {
          setBusinessHours({ ...DEFAULT_HOURS, ...(settingsData.whatsappBusinessHours as WeekHours) });
        }
        
        setUserProfileName(settingsData.whatsappBizName || '');
        setUserProfilePhone(settingsData.apiPhoneNumberId || '');

        // Load AI Bot & flow automation parameters
        setAiActive(settingsData.aiActive || false);
        setAiResponseLimit(settingsData.aiResponseLimit !== undefined ? settingsData.aiResponseLimit : 1000);
        setAiResponseCount(settingsData.aiResponseCount || 0);
        setWhatsappFlowId(settingsData.whatsappFlowId || '');
        
        if (accessToken) {
          syncWithMetaAPI(accessToken, phoneId, wabaId);
        }
      }
    } catch (err) {
      console.error('Failed to load initial whatsapp data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlows = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFlows(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching flows:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchFlows();
  }, []);



  const saveAutomationSettings = async (nextAiActive?: boolean, nextFlowId?: string, nextLimit?: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingAutomation(true);
    try {
      const activeVal = nextAiActive !== undefined ? nextAiActive : aiActive;
      const flowIdVal = nextFlowId !== undefined ? nextFlowId : whatsappFlowId;
      const limitVal = nextLimit !== undefined ? nextLimit : aiResponseLimit;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          aiActive: activeVal,
          whatsappFlowId: flowIdVal === '' ? null : flowIdVal,
          aiResponseLimit: Number(limitVal)
        })
      });

      if (res.ok) {
        toast.success('AI Chatbot & Flow Automation updated!');
      } else {
        toast.error('Failed to update automation settings.');
      }
    } catch (err) {
      console.error('Failed to save automation settings:', err);
      toast.error('Connection error.');
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleResetCount = async () => {
    if (!confirm('Are you sure you want to reset the AI reply count to 0?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setResettingCount(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          aiResponseCount: 0
        })
      });
      if (res.ok) {
        setAiResponseCount(0);
        toast.success('AI reply count reset to 0!');
      } else {
        toast.error('Failed to reset AI reply count.');
      }
    } catch (err) {
      console.error('Failed to reset AI count:', err);
    } finally {
      setResettingCount(false);
    }
  };

  // Configure Meta API connection details
  const handleSaveApiConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappEngine: 'API',
          apiAccessToken: metaToken.trim(),
          apiPhoneNumberId: metaPhoneId.trim(),
          apiWabaId: metaWabaId.trim()
        })
      });

      if (res.ok) {
        setEngine('API');
        setShowApiModal(false);
        toast.success('WhatsApp Meta API configured & linked successfully!');
        
        // Re-read profile details
        fetchInitialData();
      } else {
        toast.error('Failed to configure Meta API credentials.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection error.');
    } finally {
      setCreating(false);
    }
  };
  
  const openApiModal = () => {
    setApiSetupStep('MANUAL');
    setFbStep(1);
    setShowApiModal(true);
  };

  const handleSyncMeta = async () => {
    if (!metaToken || !metaPhoneId) {
      toast.error('No credentials found. Please configure API settings first.');
      return;
    }
    await syncWithMetaAPI(metaToken, metaPhoneId, metaWabaId);
    if (!syncingMeta) toast.success('Synced with Meta Cloud API!');
  };

  const copyRefId = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Project Reference ID copied!');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Dynamic Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            WhatsApp Manager
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage your official Meta Cloud API WhatsApp connection, business profiles, and automations.</p>
        </div>
        
        {activeView === 'DETAILS' ? (
          <button
            onClick={() => setActiveView('LIST')}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-5 border border-slate-200 rounded-2xl text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
          >
            Back
          </button>
        ) : (
          <button
            onClick={openApiModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center gap-1.5 shadow-md text-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Project
          </button>
        )}
      </div>

      {/* RENDER FOR API ENGINE */}
      {engine === 'API' && !metaToken && (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-slate-250 max-w-xl mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4 border border-blue-100 shadow-sm">
            <Smartphone className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">WhatsApp Meta Cloud API</h3>
          <p className="text-slate-500 text-xs mt-1 mb-6 max-w-sm leading-relaxed">
            Connect your official WhatsApp Business Account using Meta Developer credentials to send campaigns and utilize the AI Chatbot.
          </p>
          <button
            onClick={openApiModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all active:scale-95 text-xs shadow-md shadow-blue-100"
          >
            Connect WhatsApp Account
          </button>
        </div>
      )}

      {engine === 'API' && metaToken && activeView === 'LIST' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Linked API Project Card */}
          <div 
            onClick={() => setActiveView('DETAILS')}
            className="bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col justify-between min-h-[300px] border-t-4 border-t-blue-500 cursor-pointer group"
          >
            {/* Top Tag & Status bar */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform shrink-0">
                  <Smartphone className="w-6 h-6 text-slate-500" />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    {metaLimit}
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
                  {bizName || userProfileName || 'WhatsApp Business'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {userProfilePhone || metaPhoneId || 'Not connected'}
                </p>
              </div>

              {/* WABA ID as reference */}
              {metaWabaId && (
                <div className="mt-4 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2 flex items-center justify-between text-slate-500 font-mono text-[10px]" onClick={e => e.stopPropagation()}>
                  <span className="truncate">WABA: {metaWabaId}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(metaWabaId); toast.success('WABA ID copied!'); }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-650"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Warning Alert banner */}
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-800" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>No Active Plan</span>
                </div>
                <button 
                  onClick={() => window.location.href = '/dashboard/ai-bot/tokens'}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-lg text-[10px] uppercase shadow-sm transition-all"
                >
                  Get Plan
                </button>
              </div>
            </div>

            {/* Bottom Actions tabs */}
            <div className="border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-450" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => window.location.href = '/dashboard/inbox'}
                className="py-3 hover:bg-slate-50 hover:text-slate-700 flex flex-col items-center justify-center gap-1 border-r border-slate-100"
              >
                <MessageSquare className="w-4 h-4 text-slate-550" />
                <span>Chat</span>
              </button>
              <button 
                onClick={() => window.location.href = '/dashboard/whatsapp/broadcast/templates'}
                className="py-3 hover:bg-slate-50 hover:text-slate-700 flex flex-col items-center justify-center gap-1 border-r border-slate-100"
              >
                <FileText className="w-4 h-4 text-slate-550" />
                <span>Templates</span>
              </button>
              <div className="py-3 bg-blue-50 text-blue-700 flex flex-col items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Active</span>
              </div>
            </div>

          </div>

          {/* Add New Project Dotted Box */}
          <div 
            onClick={openApiModal}
            className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group min-h-[300px] bg-emerald-50/10 hover:bg-white"
          >
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform mb-4">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
            </div>
            <h4 className="font-bold text-sm text-slate-800 mb-1">Add New Project</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Link another Meta Cloud API phone number instance to launch broadcasts.
            </p>
          </div>

        </div>
      )}

      {engine === 'API' && metaToken && activeView === 'DETAILS' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Panel: Profile Card & Warning Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left: Profile details with Back Arrow */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="flex items-center gap-4">
                {/* Back Arrow button */}
                <button
                  onClick={() => setActiveView('LIST')}
                  className="p-2 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-xl text-blue-600 shadow-sm shrink-0">
                  {bizName ? bizName.substring(0, 2).toUpperCase() : 'AH'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {bizName || userProfileName || 'WhatsApp Business'}
                </h3>
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      API Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {userProfilePhone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={openApiModal}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 border border-slate-250 rounded-2xl text-xs active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Embed
                </button>
                <button
                  onClick={handleSyncMeta}
                  disabled={syncingMeta}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 px-4 rounded-2xl text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {syncingMeta ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Sync with Meta
                </button>
              </div>
            </div>

            {/* Right: Plan summary */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[110px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-1">Active Plan</h4>
                <p className="text-xs font-bold text-slate-800">{subPlan} Plan</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {subPlan === 'Free' ? 'Upgrade to unlock premium features.' : 'You have active access to premium features.'}
                </p>
              </div>
              {subPlan === 'Free' && (
                <button 
                  onClick={() => window.location.href = '/dashboard/ai-bot/tokens'}
                  className="bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 px-3 rounded-xl text-[10px] mt-4 w-full shadow-md shadow-blue-100 active:scale-95 transition-all text-center uppercase tracking-wide"
                >
                  Upgrade Plan
                </button>
              )}
            </div>

          </div>

          {/* Account Restricted Notification Warning Banner (only shows when Meta reports restriction) */}
          {metaAccountStatus === 'RESTRICTED' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-800 shadow-sm animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="font-extrabold text-sm text-red-900">Account Restricted</h5>
                <p className="text-xs text-red-700 leading-relaxed">
                  Your account is restricted by Meta. Some features may be unavailable. Please check your payment method on Meta.
                </p>
              </div>
            </div>
          )}

          {/* Two Column details dashboard grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Column 1: Account Health */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" /> Account Health
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Monitor WhatsApp status and API settings details.</p>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                
                {/* Quality */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Quality</p>
                    <p className="text-[10px] text-slate-400">Health score</p>
                  </div>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px]">
                    {metaQuality}
                  </span>
                </div>

                {/* Message Limit */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Message Limit</p>
                    <p className="text-[10px] text-slate-400">Daily cap</p>
                  </div>
                  <span className="bg-blue-50 border border-blue-100 text-blue-600 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px]">
                    {metaLimit}
                  </span>
                </div>

                {/* Phone Status */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Phone Status</p>
                    <p className="text-[10px] text-slate-400">OTP verification</p>
                  </div>
                  <span className={`border font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] ${
                    metaPhoneStatus === 'Verified' || metaPhoneStatus === 'APPROVED font-bold'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    {metaPhoneStatus}
                  </span>
                </div>

                {/* Connection */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Connection</p>
                    <p className="text-[10px] text-slate-400">API Link</p>
                  </div>
                  <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[2.5]" /> {metaConnection}
                  </span>
                </div>

                {/* Business Verification */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Business Verification</p>
                    <p className="text-[10px] text-slate-400">Click to verify</p>
                  </div>
                  <button 
                    onClick={() => toast.success('Redirecting to Meta Business Manager verification portal...')}
                    className="hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-900 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {metaVerification}
                  </button>
                </div>

                {/* Account Status */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Account Status</p>
                    <p className="text-[10px] text-slate-400">Policy review</p>
                  </div>
                  <span className={`border font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] ${
                    metaAccountStatus === 'APPROVED' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-rose-50 border-rose-100 text-rose-600'
                  }`}>
                    {metaAccountStatus}
                  </span>
                </div>

                {/* Payment */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Payment</p>
                    <p className="text-[10px] text-slate-400">Meta billing</p>
                  </div>
                  <span className={`border font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] ${
                    metaPayment === 'Issue Detected' 
                      ? 'bg-rose-50 border-rose-100 text-rose-600'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}>
                    {metaPayment}
                  </span>
                </div>

                {/* Webhook */}
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-750">Webhook</p>
                    <p className="text-[10px] text-slate-400">Realtime events</p>
                  </div>
                  <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px]">
                    {metaWebhook}
                  </span>
                </div>

              </div>
            </div>

            {/* Column 2: Business Profile, Calling Settings, Business Hours */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Business Profile Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Business Profile</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Manage details shown on your WhatsApp Profile.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        handleSaveProfileDetails();
                      } else {
                        setIsEditingProfile(true);
                      }
                    }}
                    className={`font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 ${
                      isEditingProfile 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isEditingProfile ? 'Save Details' : 'Edit'}
                  </button>
                </div>

                {isEditingProfile ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Business Name</label>
                        <input 
                          type="text" 
                          value={bizName} 
                          onChange={e => setBizName(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status</label>
                        <input 
                          type="text" 
                          value={bizStatus} 
                          onChange={e => setBizStatus(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Description</label>
                      <textarea 
                        rows={2} 
                        value={bizDesc} 
                        onChange={e => setBizDesc(e.target.value)} 
                        placeholder="Describe your business..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white resize-none text-slate-800 font-medium" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Address</label>
                      <input 
                        type="text" 
                        value={bizAddress} 
                        onChange={e => setBizAddress(e.target.value)} 
                        placeholder="Enter business address"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Email</label>
                        <input 
                          type="email" 
                          value={bizEmail} 
                          onChange={e => setBizEmail(e.target.value)} 
                          placeholder="Email"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Website</label>
                        <input 
                          type="text" 
                          value={bizWebsite} 
                          onChange={e => setBizWebsite(e.target.value)} 
                          placeholder="https://"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Industry / Category</label>
                      <select 
                        value={bizIndustry} 
                        onChange={e => setBizIndustry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium"
                      >
                        <option value="">Select a category</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Shopping & Retail">Shopping & Retail</option>
                        <option value="Education">Education</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Other">Other / Miscellaneous</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Business Name</span>
                      <span className="col-span-2 text-slate-800 font-semibold">{bizName}</span>
                    </div>
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Status</span>
                      <span className="col-span-2 text-slate-800 font-semibold">{bizStatus}</span>
                    </div>
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Description</span>
                      <span className="col-span-2 text-slate-800 font-semibold">{bizDesc || 'Describe your business...'}</span>
                    </div>
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Address</span>
                      <span className="col-span-2 text-slate-800 font-semibold">{bizAddress || 'Enter business address'}</span>
                    </div>
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Email</span>
                      <span className="col-span-2 text-slate-800 font-semibold">{bizEmail || 'Email'}</span>
                    </div>
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Website</span>
                      <span className="col-span-2 text-slate-800 underline font-mono text-[11px] truncate">{bizWebsite || 'https://'}</span>
                    </div>
                    <div className="py-2.5 grid grid-cols-3">
                      <span className="font-bold text-slate-500">Industry</span>
                      <span className="col-span-2 text-slate-800 font-semibold">{bizIndustry || 'Select a category'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Chatbot & Flow Automation Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                      AI Chatbot &amp; Automation
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Configure chatbot flows and AI auto-reply limits for WhatsApp.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Chatbot Flow Connection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        Connect Chatbot Flow
                      </label>
                      <Link 
                        href="/dashboard/builder" 
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-750 flex items-center gap-0.5"
                      >
                        Go to Flow Builder ➔
                      </Link>
                    </div>
                    
                    <div className="relative">
                      <select
                        value={whatsappFlowId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWhatsappFlowId(val);
                          saveAutomationSettings(aiActive, val, aiResponseLimit);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 cursor-pointer pr-10 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="">None - Direct AI or Fallback Only</option>
                        {flows.map((flow) => (
                          <option key={flow.id} value={flow.id}>
                            {flow.name} {!flow.isActive ? '(Inactive)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400 text-[10px]">
                        ▼
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Incoming triggers will initiate the selected chatbot flow on WhatsApp.
                    </p>
                  </div>

                  {/* AI Auto-Responder Toggle */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="max-w-[80%]">
                        <p className="text-xs font-bold text-slate-750 flex items-center gap-1">
                          AI Auto-Responder
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Use AI model context to answer unhandled questions</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={aiActive}
                        onChange={() => {
                          const newVal = !aiActive;
                          setAiActive(newVal);
                          saveAutomationSettings(newVal, whatsappFlowId, aiResponseLimit);
                        }}
                        className="w-8 h-4 rounded-full appearance-none bg-slate-200 checked:bg-blue-600 transition-colors relative before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform cursor-pointer"
                      />
                    </label>

                    {aiActive && (
                      <div className="space-y-4 pt-3 border-t border-slate-200/60 animate-in slide-in-from-top-2 duration-200">
                        
                        {/* AI Counter & Reset */}
                        <div className="bg-white border border-slate-250/80 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Replies Sent</span>
                            <span className="text-sm font-black text-slate-800">
                              {aiResponseCount} / {aiResponseLimit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleResetCount}
                            disabled={resettingCount}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-100 rounded-xl px-2.5 py-1.5 flex items-center gap-1 transition-all"
                          >
                            {resettingCount ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Reset Counter
                          </button>
                        </div>

                        {/* Response Limit */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">AI Response Limit (Messages)</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={aiResponseLimit}
                              onChange={(e) => setAiResponseLimit(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                              min={1}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => saveAutomationSettings(aiActive, whatsappFlowId, aiResponseLimit)}
                              className="bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1"
                            >
                              Update
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Calling Settings Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-800">Calling Settings</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Manage calling options for customers.</p>
                </div>

                <div className="space-y-4">
                  {/* Receive Calls Toggle */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="max-w-[80%]">
                      <p className="text-xs font-bold text-slate-700">Receive Calls</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Allow users to call your business on WhatsApp</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={receiveCalls}
                      onChange={() => {
                        const newVal = !receiveCalls;
                        setReceiveCalls(newVal);
                        let nextShow = showCallIcon;
                        let nextCallback = callbackPermission;
                        if (!newVal) {
                          setShowCallIcon(false);
                          setCallbackPermission(false);
                          nextShow = false;
                          nextCallback = false;
                        }
                        saveCallingSettings(newVal, nextShow, nextCallback);
                      }}
                      className="w-8 h-4 rounded-full appearance-none bg-slate-200 checked:bg-blue-600 transition-colors relative before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform cursor-pointer"
                    />
                  </label>

                  {/* Show Call Icon Toggle (Dependent on Receive Calls) */}
                  <label className={`flex items-center justify-between cursor-pointer group transition-opacity ${receiveCalls ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="max-w-[80%]">
                      <p className="text-xs font-bold text-slate-700">Show Call Icon</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Display phone icon in your WhatsApp business profile</p>
                    </div>
                    <input 
                      type="checkbox" 
                      disabled={!receiveCalls}
                      checked={showCallIcon}
                      onChange={() => {
                        const newVal = !showCallIcon;
                        setShowCallIcon(newVal);
                        saveCallingSettings(receiveCalls, newVal, callbackPermission);
                      }}
                      className="w-8 h-4 rounded-full appearance-none bg-slate-200 checked:bg-blue-600 transition-colors relative before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform cursor-pointer"
                    />
                  </label>

                  {/* Callback Permission Toggle (Dependent on Receive Calls) */}
                  <label className={`flex items-center justify-between cursor-pointer group transition-opacity ${receiveCalls ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="max-w-[80%]">
                      <p className="text-xs font-bold text-slate-700">Callback Permission</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Allow sending call permission requests to users</p>
                    </div>
                    <input 
                      type="checkbox" 
                      disabled={!receiveCalls}
                      checked={callbackPermission}
                      onChange={() => {
                        const newVal = !callbackPermission;
                        setCallbackPermission(newVal);
                        saveCallingSettings(receiveCalls, showCallIcon, newVal);
                      }}
                      className="w-8 h-4 rounded-full appearance-none bg-slate-200 checked:bg-blue-600 transition-colors relative before:content-[''] before:absolute before:h-3 before:w-3 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform cursor-pointer"
                    />
                  </label>
                </div>

                {!receiveCalls && (
                  <p className="text-[10px] text-slate-450 italic mt-2">
                    Enable "Receive Calls" to configure call icon and callback permission settings.
                  </p>
                )}
              </div>

              {/* Business Hours Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Business Hours</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Configure schedule for automated off-hours replies.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditingHours) {
                        setHoursConfigured(true);
                        saveHoursToDatabase(true);
                        toast.success('Business hours saved successfully!');
                      }
                      setIsEditingHours(!isEditingHours);
                    }}
                    className={`font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 ${
                      isEditingHours 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isEditingHours ? 'Save Hours' : 'Edit'}
                  </button>
                </div>

                {isEditingHours ? (
                  <div className="space-y-3 pt-2 text-xs">
                    <p className="text-slate-500 text-[10px]">Toggle days on/off and set work hours.</p>
                    <div className="space-y-2.5">
                      {Object.entries(DAY_LABELS).map(([day, label]) => (
                        <div key={day} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                          <input
                            type="checkbox"
                            checked={businessHours[day]?.enabled ?? false}
                            onChange={() => setBusinessHours(prev => ({
                              ...prev,
                              [day]: { 
                                ...prev[day] || { open: '09:00', close: '18:00' }, 
                                enabled: !prev[day]?.enabled 
                              }
                            }))}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                          />
                          <span className="text-xs font-bold text-slate-700 w-24 shrink-0">{label}</span>
                          {(businessHours[day]?.enabled ?? false) ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input 
                                type="time" 
                                value={businessHours[day]?.open || '09:00'}
                                onChange={e => setBusinessHours(prev => ({ 
                                  ...prev, 
                                  [day]: { ...prev[day], open: e.target.value } 
                                }))}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-800" 
                              />
                              <span className="text-slate-400 text-xs">–</span>
                              <input 
                                type="time" 
                                value={businessHours[day]?.close || '18:00'}
                                onChange={e => setBusinessHours(prev => ({ 
                                  ...prev, 
                                  [day]: { ...prev[day], close: e.target.value } 
                                }))}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-800" 
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-semibold italic">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : hoursConfigured ? (
                  <div className="text-xs text-slate-700 space-y-2">
                    {Object.entries(DAY_LABELS).map(([day, label]) => {
                      const h = businessHours[day];
                      return (
                        <div key={day} className="flex justify-between py-1 border-b border-slate-50 last:border-b-0">
                          <span className="font-semibold text-slate-500">{label}</span>
                          {h?.enabled ? (
                            <span className="font-bold text-slate-850">{h.open} - {h.close}</span>
                          ) : (
                            <span className="text-rose-500 font-semibold italic text-[10px]">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">
                    No business hours configured. Click Edit to set your hours.
                  </p>
                )}
              </div>

            </div>

          </div>

        </div>
      )}



      {/* Setup Meta API Connection Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-slate-100 shadow-2xl rounded-3xl overflow-hidden w-full transition-all duration-300 relative max-w-md">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white relative">
              <button 
                onClick={() => setShowApiModal(false)}
                className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Connect WhatsApp</h3>
                  <p className="text-xs text-white/90 mt-1 max-w-md leading-relaxed">
                    Link your WhatsApp Business Account using your Meta credentials to send broadcasts and utilize the AI Chatbot.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            {apiSetupStep === 'MANUAL' && (
              <div className="p-6">
                <h4 className="text-base font-bold text-slate-800 mb-2">Configure WhatsApp Project</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  Enter your Meta Cloud API details to activate your official connection.
                </p>

                <form onSubmit={handleSaveApiConnection} className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-650">System User Token (Meta Access Token)</label>
                      <textarea 
                        rows={2}
                        required
                        value={metaToken}
                        onChange={e => setMetaToken(e.target.value)}
                        placeholder="EAAGxxxxx..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-700 placeholder:text-slate-450 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-650">App ID / Phone Number ID</label>
                      <input 
                        type="text"
                        required
                        value={metaPhoneId}
                        onChange={e => setMetaPhoneId(e.target.value)}
                        placeholder="e.g. 10984729184"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-700 placeholder:text-slate-450 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-650">WhatsApp Business Account ID (WABA ID)</label>
                      <input 
                        type="text"
                        required
                        value={metaWabaId}
                        onChange={e => setMetaWabaId(e.target.value)}
                        placeholder="e.g. 984029482014"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-700 placeholder:text-slate-450 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm shadow-md flex items-center justify-center gap-1.5"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Linking Account...
                      </>
                    ) : (
                      'Link WhatsApp Project'
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
