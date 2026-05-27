'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '@/lib/socket';
import {
  Send, Search, CheckCheck, Clock, Loader2,
  ChevronDown, User, Users, Bot, RefreshCw, MessageSquare,
  Shield, ToggleLeft, ToggleRight, Phone, MessageCircle, HelpCircle
} from 'lucide-react';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;
function getAuthToken() { return localStorage.getItem('token') || ''; }
function getUserId() { return localStorage.getItem('userId') || ''; }

type TeamMember = { id: string; name: string; email: string; role: string };

type UnifiedConversation = {
  id: string; // phone for WhatsApp/Web, chatId for Telegram
  displayName: string;
  username?: string | null; // Telegram username
  channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB';
  lastMessage: string | null;
  lastMessageTime: string | Date;
  lastMessageDirection: 'INCOMING' | 'OUTGOING' | null;
  unreadCount: number;
  assignedTo: string | null;
  isBotPaused: boolean;
  botSessionId?: string; // e.g. "TELEGRAM:botId"
};

type ChatMessage = {
  id: string;
  sessionId: string;
  from: string;
  to: string;
  body: string;
  direction: 'INCOMING' | 'OUTGOING';
  createdAt: string | Date;
};

const CHANNEL_ICONS = {
  WHATSAPP: (
    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white border border-white shadow-sm" title="WhatsApp">
      <MessageCircle className="w-2.5 h-2.5" />
    </div>
  ),
  TELEGRAM: (
    <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-white border border-white shadow-sm" title="Telegram">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    </div>
  ),
  WEB: (
    <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white border border-white shadow-sm" title="Web Chat Widget">
      <MessageSquare className="w-2.5 h-2.5" />
    </div>
  )
};

const CHANNEL_COLORS = {
  WHATSAPP: 'from-emerald-400 to-teal-500',
  TELEGRAM: 'from-[#2AABEE] to-[#229ED9]',
  WEB: 'from-indigo-400 to-indigo-600',
};

function formatTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffHrs = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffHrs < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffHrs < 48) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  if (/^[\d\s+\-()]+$/.test(name.trim())) return '';
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-indigo-500', 'bg-amber-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];
function avatarColor(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function UnifiedTeamInbox() {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [filteredConvs, setFilteredConvs] = useState<UnifiedConversation[]>([]);
  const [teamMembers, setTeamMembers]     = useState<TeamMember[]>([]);
  const [activeChannelFilter, setActiveChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'TELEGRAM' | 'WEB'>('ALL');
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedConv, setSelectedConv]   = useState<UnifiedConversation | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [messageText, setMessageText]     = useState('');
  
  // Loading and action states
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [isAtBottom, setIsAtBottom]       = useState(true);
  const [newMsgCount, setNewMsgCount]     = useState(0);
  const [role, setRole]                   = useState<string>('USER');

  // UI state toggles
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef  = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ─── Resolve Current User & Load Team ─────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setRole(decoded.role || 'USER');
    } catch {}

    // Load team members
    fetch(`${API_BASE}/user/team`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTeamMembers(data); })
      .catch(console.error);
  }, []);

  // ─── Socket.io Connection & Listening ──────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let userId = '';
    try { userId = JSON.parse(atob(token.split('.')[1])).id; } catch {}

    socket.connect();
    socket.emit('join', userId);

    return () => {
      socket.disconnect();
    };
  }, []);

  // ─── Fetch Conversations from backend ──────────────────────────────────────
  const fetchAllConversations = useCallback(async () => {
    setLoadingConvs(true);
    const token = getAuthToken();
    try {
      // 1. Fetch WhatsApp & Web Widget contacts
      const resWhatsApp = await fetch(`${API_BASE}/inbox/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataWhatsApp = await resWhatsApp.json();

      // 2. Fetch Telegram conversations
      const resTelegram = await fetch(`${API_BASE}/telegram/inbox/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataTelegram = await resTelegram.json();

      // 3. Map WhatsApp & Web
      const mappedWaWeb: UnifiedConversation[] = Array.isArray(dataWhatsApp)
        ? dataWhatsApp.map(c => ({
            id: c.phone,
            displayName: c.name || c.phone,
            channel: c.channel || 'WHATSAPP',
            lastMessage: c.lastMessage,
            lastMessageTime: c.lastMessageTime,
            lastMessageDirection: c.lastMessageDirection,
            unreadCount: 0, // In backend MVP, unread is computed, default here 0
            assignedTo: c.assignedTo || null,
            isBotPaused: c.isBotPaused || false,
          }))
        : [];

      // 4. Map Telegram
      const mappedTg: UnifiedConversation[] = Array.isArray(dataTelegram)
        ? dataTelegram.map(t => ({
            id: t.chatId,
            displayName: t.displayName || t.chatId,
            username: t.username,
            channel: 'TELEGRAM',
            lastMessage: t.lastMessage,
            lastMessageTime: t.lastMessageTime,
            lastMessageDirection: t.lastMessageDirection,
            unreadCount: t.unreadCount || 0,
            assignedTo: t.assignedTo || null,
            isBotPaused: t.isBotPaused || false,
            botSessionId: t.botSessionId,
          }))
        : [];

      // 5. Combine and Sort by last message time
      const combined = [...mappedWaWeb, ...mappedTg];
      combined.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      
      setConversations(combined);
    } catch (e) {
      console.error('Failed to load unified conversations:', e);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    fetchAllConversations();
  }, [fetchAllConversations]);

  // ─── Real-Time Socket Updates ──────────────────────────────────────────────
  useEffect(() => {
    // 1. WhatsApp messages
    socket.off('whatsapp:message');
    socket.on('whatsapp:message', (msg: any) => {
      const phone = msg.direction === 'INCOMING' ? msg.from : msg.to;
      handleIncomingLiveMessage(phone, 'WHATSAPP', msg);
    });

    // 2. Telegram messages
    socket.off('telegram:message');
    socket.on('telegram:message', (msg: any) => {
      handleIncomingLiveMessage(msg.chatId, 'TELEGRAM', msg);
    });

    // 3. Web Widget messages
    socket.off('widget:message');
    socket.on('widget:message', (msg: any) => {
      handleIncomingLiveMessage(msg.customerId, 'WEB', msg);
    });

    // 4. Manual Assignment updates
    socket.off('inbox:assigned');
    socket.on('inbox:assigned', (data: { phone: string; channel: string; assignedTo: string | null }) => {
      updateConversationState(data.phone, data.channel as any, { assignedTo: data.assignedTo });
    });

    socket.off('telegram:assigned');
    socket.on('telegram:assigned', (data: { botId: string; chatId: string; assignedTo: string | null }) => {
      updateConversationState(data.chatId, 'TELEGRAM', { assignedTo: data.assignedTo });
    });

    // 5. Takeover / Bot Pause updates
    socket.off('inbox:takeover');
    socket.on('inbox:takeover', (data: { phone: string; channel: string; isBotPaused: boolean }) => {
      updateConversationState(data.phone, data.channel as any, { isBotPaused: data.isBotPaused });
    });

    socket.off('telegram:takeover');
    socket.on('telegram:takeover', (data: { botId: string; chatId: string; isBotPaused: boolean }) => {
      updateConversationState(data.chatId, 'TELEGRAM', { isBotPaused: data.isBotPaused });
    });

    return () => {
      socket.off('whatsapp:message');
      socket.off('telegram:message');
      socket.off('widget:message');
      socket.off('inbox:assigned');
      socket.off('telegram:assigned');
      socket.off('inbox:takeover');
      socket.off('telegram:takeover');
    };
  }, [selectedConv]);

  // Helper to process real-time incoming messages from any channel
  const handleIncomingLiveMessage = (customerId: string, channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB', msg: any) => {
    const formattedMsg: ChatMessage = {
      id: msg.id || Date.now().toString(),
      sessionId: msg.sessionId || (channel === 'TELEGRAM' ? `TELEGRAM:${msg.botId}` : channel === 'WEB' ? 'web_session' : 'API'),
      from: msg.from,
      to: msg.direction === 'INCOMING' ? 'Bot' : customerId,
      body: msg.body || msg.text,
      direction: msg.direction,
      createdAt: msg.createdAt || new Date(),
    };

    // Update active stream if conversation is open
    setSelectedConv(sel => {
      if (sel && sel.id === customerId && sel.channel === channel) {
        setMessages(prev => {
          // Prevent duplicates
          const last = prev[prev.length - 1];
          if (last?.body === formattedMsg.body && last?.direction === formattedMsg.direction) return prev;
          return [...prev, formattedMsg];
        });
        setIsAtBottom(atBottom => {
          if (!atBottom) setNewMsgCount(n => n + 1);
          return atBottom;
        });
      }
      return sel;
    });

    // Update list entry and bubble it to the top
    setConversations(prev => {
      const exists = prev.find(c => c.id === customerId && c.channel === channel);
      const updated: UnifiedConversation = {
        id: customerId,
        displayName: exists?.displayName || (channel === 'WEB' ? `Web Visitor (${customerId.slice(-4)})` : customerId),
        username: exists?.username || msg.username || null,
        channel,
        lastMessage: formattedMsg.body,
        lastMessageTime: formattedMsg.createdAt,
        lastMessageDirection: formattedMsg.direction,
        unreadCount: msg.direction === 'INCOMING' ? (exists?.unreadCount || 0) + 1 : (exists?.unreadCount || 0),
        assignedTo: exists?.assignedTo || null,
        isBotPaused: exists?.isBotPaused || false,
        botSessionId: exists?.botSessionId || (channel === 'TELEGRAM' ? `TELEGRAM:${msg.botId}` : undefined),
      };
      
      const rest = prev.filter(c => !(c.id === customerId && c.channel === channel));

      // Security check: if current user is agent, and they just assigned to someone else, do they still see it?
      const isAgent = role === 'AGENT';
      const isAssignedToMe = updated.assignedTo === getUserId();
      if (isAgent && !isAssignedToMe && msg.direction === 'INCOMING') {
        // If not assigned to me, agents shouldn't see it bubble
        return rest;
      }

      return [updated, ...rest];
    });
  };

  const updateConversationState = (id: string, channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB', fields: Partial<UnifiedConversation>) => {
    setConversations(prev =>
      prev.map(c => (c.id === id && c.channel === channel) ? { ...c, ...fields } : c)
    );
    setSelectedConv(sel => {
      if (sel && sel.id === id && sel.channel === channel) {
        return { ...sel, ...fields };
      }
      return sel;
    });
  };

  // ─── Filter & Search ───────────────────────────────────────────────────────
  useEffect(() => {
    let list = conversations;
    
    // Apply Channel Filter
    if (activeChannelFilter !== 'ALL') {
      list = list.filter(c => c.channel === activeChannelFilter);
    }

    // Apply Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.displayName.toLowerCase().includes(q) ||
        c.id.includes(q) ||
        (c.username && c.username.toLowerCase().includes(q))
      );
    }

    setFilteredConvs(list);
  }, [conversations, activeChannelFilter, searchQuery]);

  // ─── Fetch Messages when conversation changes ──────────────────────────────
  useEffect(() => {
    if (!selectedConv) { setMessages([]); return; }
    setLoadingMsgs(true);
    setNewMsgCount(0);

    const token = getAuthToken();
    let url = '';

    if (selectedConv.channel === 'TELEGRAM') {
      const botId = selectedConv.botSessionId?.replace('TELEGRAM:', '') || '';
      url = `${API_BASE}/telegram/inbox/messages/${selectedConv.id}?botId=${botId}`;
    } else {
      url = `${API_BASE}/inbox/messages/${selectedConv.id}`;
    }

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(console.error)
      .finally(() => setLoadingMsgs(false));

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedConv]);

  // ─── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setNewMsgCount(0);
    }
  }, [messages, isAtBottom]);

  const handleScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMsgCount(0);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setNewMsgCount(0);
  };

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConv || sending) return;

    const body = messageText.trim();
    setMessageText('');
    setSending(true);

    const botId = selectedConv.channel === 'TELEGRAM'
      ? selectedConv.botSessionId?.replace('TELEGRAM:', '')
      : undefined;

    // Optimistic UI update
    const optimistic: ChatMessage = {
      id: Date.now().toString(),
      sessionId: selectedConv.botSessionId || 'API',
      from: 'Bot',
      to: selectedConv.id,
      body,
      direction: 'OUTGOING',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setIsAtBottom(true);

    // Optimistic list update
    setConversations(prev =>
      prev.map(c =>
        (c.id === selectedConv.id && c.channel === selectedConv.channel)
          ? { ...c, lastMessage: body, lastMessageTime: new Date().toISOString(), lastMessageDirection: 'OUTGOING', isBotPaused: true }
          : c
      )
    );

    try {
      await fetch(`${API_BASE}/inbox/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({
          to: selectedConv.id,
          channel: selectedConv.channel,
          text: body,
          botId,
        }),
      });
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ─── Manual Assignment Handler ──────────────────────────────────────────────
  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedConv) return;
    setShowAssignDropdown(false);

    const endpoint = selectedConv.channel === 'TELEGRAM'
      ? `${API_BASE}/telegram/inbox/assign`
      : `${API_BASE}/inbox/assign`;

    const botId = selectedConv.channel === 'TELEGRAM'
      ? selectedConv.botSessionId?.replace('TELEGRAM:', '')
      : undefined;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({
          phone: selectedConv.channel !== 'TELEGRAM' ? selectedConv.id : undefined,
          chatId: selectedConv.channel === 'TELEGRAM' ? selectedConv.id : undefined,
          botId,
          agentId,
        }),
      });

      if (res.ok) {
        updateConversationState(selectedConv.id, selectedConv.channel, { assignedTo: agentId });
      }
    } catch (err) {
      console.error('Assignment failed:', err);
    }
  };

  // ─── Human Takeover / Bot Toggle Handler ────────────────────────────────────
  const handleToggleTakeover = async () => {
    if (!selectedConv) return;
    const targetState = !selectedConv.isBotPaused;

    const endpoint = selectedConv.channel === 'TELEGRAM'
      ? `${API_BASE}/telegram/inbox/takeover`
      : `${API_BASE}/inbox/takeover`;

    const botId = selectedConv.channel === 'TELEGRAM'
      ? selectedConv.botSessionId?.replace('TELEGRAM:', '')
      : undefined;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({
          phone: selectedConv.channel !== 'TELEGRAM' ? selectedConv.id : undefined,
          chatId: selectedConv.channel === 'TELEGRAM' ? selectedConv.id : undefined,
          botId,
          pause: targetState,
        }),
      });

      if (res.ok) {
        updateConversationState(selectedConv.id, selectedConv.channel, { isBotPaused: targetState });
      }
    } catch (err) {
      console.error('Takeover toggle failed:', err);
    }
  };

  // ─── Group messages by date ────────────────────────────────────────────────
  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const dateLabel = new Date(msg.createdAt).toLocaleDateString([], {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const last = acc[acc.length - 1];
    if (last?.date === dateLabel) { last.msgs.push(msg); }
    else { acc.push({ date: dateLabel, msgs: [msg] }); }
    return acc;
  }, []);

  const assignedAgent = teamMembers.find(t => t.id === selectedConv?.assignedTo);

  return (
    <div className="flex h-[calc(100vh-9rem)] bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden animate-fadeIn">

      {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
      <div className="w-[340px] shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/70">

        {/* Header and filters */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow shadow-indigo-200">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-slate-900 font-extrabold text-lg tracking-tight">Unified Inbox</h2>
            </div>
            <button onClick={fetchAllConversations} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all" title="Refresh Inbox">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Channel Filters */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl">
            {(['ALL', 'WHATSAPP', 'TELEGRAM', 'WEB'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => { setActiveChannelFilter(ch); setSelectedConv(null); }}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider ${
                  activeChannelFilter === ch
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {ch === 'ALL' ? 'All' : ch === 'WEB' ? 'Web' : ch.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 bg-slate-100 border-0 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold text-sm">Empty Inbox</p>
              <p className="text-slate-400 text-xs mt-1">
                {searchQuery ? 'No chats match your query.' : 'No active customer chats on WhatsApp, Telegram, or Web.'}
              </p>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const isSelected = selectedConv?.id === conv.id && selectedConv?.channel === conv.channel;
              const color = avatarColor(conv.id);
              const initials = getInitials(conv.displayName);
              const assignedToName = teamMembers.find(t => t.id === conv.assignedTo)?.name;

              return (
                <button
                  key={`${conv.channel}-${conv.id}`}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full px-4 py-3.5 flex gap-3 items-center text-left transition-all border-b border-slate-100/60 relative ${
                    isSelected ? 'bg-indigo-50/50' : 'hover:bg-white'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-600 rounded-full" />}
                  
                  {/* Avatar wrapper */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {initials || <User className="w-5 h-5 text-white/90" />}
                    </div>
                    {/* Small channel icon badge at bottom right */}
                    <div className="absolute -bottom-1 -right-1">
                      {CHANNEL_ICONS[conv.channel]}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {conv.displayName}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {conv.unreadCount > 0 && (
                          <span className="bg-indigo-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                            {conv.unreadCount}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400">{formatTime(conv.lastMessageTime)}</span>
                      </div>
                    </div>

                    {conv.username && (
                      <p className="text-[10px] text-sky-400 truncate mb-0.5">@{conv.username}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-400 truncate flex-1 flex items-center gap-1">
                        {conv.lastMessageDirection === 'OUTGOING' && <CheckCheck className="w-3 h-3 text-blue-400 shrink-0" />}
                        {conv.lastMessage || <span className="italic text-slate-300">No messages</span>}
                      </p>
                      
                      {assignedToName && (
                        <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100/50 shrink-0 ml-2">
                          {assignedToName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {selectedConv ? (
          <>
            {/* Unified Chat Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full ${avatarColor(selectedConv.id)} flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                    {getInitials(selectedConv.displayName) || <User className="w-5 h-5 text-white/90" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    {CHANNEL_ICONS[selectedConv.channel]}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{selectedConv.displayName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {selectedConv.channel === 'WEB' ? 'Web Widget' : selectedConv.channel}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] text-slate-400">ID: {selectedConv.id}</span>
                  </div>
                </div>
              </div>

              {/* Assignment Selector & Takeover Toggle */}
              <div className="flex items-center gap-3">
                
                {/* Manual Assign Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowAssignDropdown(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {assignedAgent ? `Assigned: ${assignedAgent.name}` : 'Unassigned'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showAssignDropdown && (
                    <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-48 overflow-hidden">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase">
                        Assign Agent
                      </div>
                      <button
                        onClick={() => handleAssignAgent(null)}
                        className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 transition-colors font-medium border-b border-slate-100"
                      >
                        Unassign Conversation
                      </button>
                      <div className="max-h-40 overflow-y-auto">
                        {teamMembers.map(member => (
                          <button
                            key={member.id}
                            onClick={() => handleAssignAgent(member.id)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                              selectedConv.assignedTo === member.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
                            }`}
                          >
                            <span>{member.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-semibold">{member.role === 'USER' ? 'OWNER' : member.role}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Human Takeover Toggle */}
                <button
                  onClick={handleToggleTakeover}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedConv.isBotPaused
                      ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-50'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-50'
                  }`}
                  title={selectedConv.isBotPaused ? 'Click to resume chatbot replies' : 'Click to pause bot (Agent takeover)'}
                >
                  {selectedConv.isBotPaused ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>👤 Handover Active (Bot Paused)</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>🤖 Chatbot Active</span>
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* Message Stream */}
            <div
              ref={chatScrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scroll-smooth"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #f1f5f9 1px, transparent 0)', backgroundSize: '20px 20px' }}
            >
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="text-sm">Loading message history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3 text-indigo-500">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">No messages yet</p>
                  <p className="text-slate-300 text-xs mt-1">Send a message to start the conversation.</p>
                </div>
              ) : (
                groupedMessages.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2">{group.date}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      {group.msgs.map((msg, i) => {
                        const isMe = msg.direction === 'OUTGOING';
                        const prevMsg = group.msgs[i - 1];
                        const nextMsg = group.msgs[i + 1];
                        const isFirst = !prevMsg || prevMsg.direction !== msg.direction;
                        const isLast  = !nextMsg || nextMsg.direction !== msg.direction;
                        return (
                          <div
                            key={msg.id || i}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${!isLast ? 'mb-0.5' : 'mb-2'}`}
                          >
                            {!isMe && isFirst && (
                              <div className={`w-6 h-6 rounded-full ${avatarColor(selectedConv.id)} flex items-center justify-center text-white font-bold text-[9px] shrink-0 mr-2 mt-1 self-end`}>
                                {getInitials(selectedConv.displayName) || <User className="w-3.5 h-3.5" />}
                              </div>
                            )}
                            {!isMe && !isFirst && <div className="w-8 shrink-0" />}

                            <div
                              className={`max-w-[70%] px-3.5 py-2.5 text-sm leading-relaxed ${
                                isMe
                                  ? `bg-indigo-600 text-white shadow-sm ${isFirst ? 'rounded-2xl rounded-tr-md' : isLast ? 'rounded-2xl rounded-br-md' : 'rounded-lg rounded-r-md'}`
                                  : `bg-white border border-slate-200 text-slate-800 shadow-sm ${isFirst ? 'rounded-2xl rounded-tl-md' : isLast ? 'rounded-2xl rounded-bl-md' : 'rounded-lg rounded-l-md'}`
                              }`}
                            >
                              <p className="break-words">{msg.body}</p>
                              <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <Clock className={`w-2.5 h-2.5 ${isMe ? 'text-indigo-200' : 'text-slate-300'}`} />
                                <span className={`text-[9px] ${isMe ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isMe && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom notifier */}
            {!isAtBottom && (
              <div className="absolute bottom-24 right-8 z-20">
                <button
                  onClick={scrollToBottom}
                  className="bg-white border border-slate-200 shadow-lg rounded-full p-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                >
                  {newMsgCount > 0 && (
                    <span className="bg-indigo-600 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {newMsgCount}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Send Form */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e as any); }}
                  placeholder={`Send a reply to ${selectedConv.displayName} (${selectedConv.channel})...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-400/20 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat Area State */
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-gradient-to-b from-white to-slate-50 p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-400/30 mb-5 text-white">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-slate-900 font-bold text-xl mb-2">Unified Shared Inbox</h3>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">
              Welcome to the centralized team inbox. Connect with your customers across WhatsApp, Telegram, and Web Chat from a single interface.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200/60 px-4 py-2 rounded-2xl">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Role: <span className="font-bold text-slate-700 uppercase">{role === 'USER' ? 'Owner' : role}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
