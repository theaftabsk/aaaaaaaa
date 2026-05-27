'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Send, Settings, Users, MessageSquare, ChevronDown, 
  Globe, AlertTriangle, X, HelpCircle, FileSpreadsheet, Check, Loader2,
  Smartphone
} from 'lucide-react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  body: string;
}

export default function NewCampaignBuilder() {
  // Database Data States
  const [sessions, setSessions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [dbContacts, setDbContacts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedProject, setSelectedProject] = useState('Default Project');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Dropdown Open States
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);

  // Phone Number Format State
  const [phoneFormat, setPhoneFormat] = useState<'with_country' | 'without_country'>('with_country');
  const [countryCode, setCountryCode] = useState('');
  const [manualNumbers, setManualNumbers] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const COUNTRIES = [
    { code: '+880', name: '🇧🇩 Bangladesh (+880)' },
    { code: '+91',  name: '🇮🇳 India (+91)' },
    { code: '+92',  name: '🇵🇰 Pakistan (+92)' },
    { code: '+1',   name: '🇺🇸 USA (+1)' },
    { code: '+44',  name: '🇬🇧 UK (+44)' },
    { code: '+971', name: '🇦🇪 UAE (+971)' },
    { code: '+966', name: '🇸🇦 Saudi Arabia (+966)' },
    { code: '+60',  name: '🇲🇾 Malaysia (+60)' },
    { code: '+65',  name: '🇸🇬 Singapore (+65)' },
    { code: '+61',  name: '🇦🇺 Australia (+61)' },
    { code: '+81',  name: '🇯🇵 Japan (+81)' },
    { code: '+49',  name: '🇩🇪 Germany (+49)' },
    { code: '+33',  name: '🇫🇷 France (+33)' },
    { code: '+55',  name: '🇧🇷 Brazil (+55)' },
    { code: '+7',   name: '🇷🇺 Russia (+7)' },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsGroupDropdownOpen(false);
        setIsLabelDropdownOpen(false);
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Available Templates (from templates hub)
  const templates: Template[] = [
    {
      id: '1',
      name: 'eid_mubarak_marketing',
      body: 'ঈদ মোবারক {{name}}! ✨ আমাদের বিশেষ ঈদ অফারে আপনার জন্য রয়েছে ২৫% ডিসকাউন্ট। এখনই অর্ডার করুন: {{company_link}}'
    },
    {
      id: '2',
      name: 'order_confirmation_utility',
      body: 'Hello {{name}}, your order has been confirmed! 📦 We will notify you once it ships. Thank you for shopping with us!'
    },
    {
      id: '3',
      name: 'otp_verification_auth',
      body: 'Your Vexo verification OTP is 5849. This code is valid for 5 minutes. Please do not share it with anyone.'
    },
    {
      id: '4',
      name: 'black_friday_promo',
      body: 'Hey {{name}}! Early access to Black Friday deals is live now. Get up to 60% OFF: {{company_link}}'
    }
  ];

  // Fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whatsapp/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
          const connected = data.find((s: any) => s.status === 'CONNECTED');
          if (connected) {
            setSelectedSessionId(connected.sessionId);
          } else if (data.length > 0) {
            setSelectedSessionId(data[0].sessionId);
          }
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    };

    const fetchGroups = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };

    const fetchLabels = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/labels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLabels(data);
        }
      } catch (err) {
        console.error('Error fetching labels:', err);
      }
    };

    const fetchContacts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDbContacts(data);
          setContacts(data); // Set default active contact list to DB contacts
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
      }
    };

    fetchSessions();
    fetchGroups();
    fetchLabels();
    fetchContacts();
  }, []);

  // Update message body when template changes
  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const selected = templates.find(t => t.id === id);
    if (selected) {
      setMessageBody(selected.body);
    } else {
      setMessageBody('');
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => {
      let next;
      if (prev.includes(groupId)) {
        next = prev.filter(id => id !== groupId);
      } else {
        next = [...prev, groupId];
      }
      if (contacts.some(c => c.id.startsWith('csv-'))) setContacts(dbContacts);
      return next;
    });
  };

  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabelIds(prev => {
      let next;
      if (prev.includes(labelId)) {
        next = prev.filter(id => id !== labelId);
      } else {
        next = [...prev, labelId];
      }
      if (contacts.some(c => c.id.startsWith('csv-'))) setContacts(dbContacts);
      return next;
    });
  };

  // CSV file uploader and parser (100% real client-side parse)
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      // Assume CSV has headers or format: name,phone or phone
      const parsed = lines.map((line, index) => {
        const parts = line.split(',');
        const nameVal = parts.length > 1 ? parts[0] : `CSV Contact ${index + 1}`;
        const phoneVal = parts.length > 1 ? parts[1] : parts[0];
        
        return {
          id: `csv-${index}-${Date.now()}`,
          name: nameVal.replace(/['"]/g, ''),
          phone: phoneVal.replace(/['"]/g, '').trim(),
          groups: [],
          labels: []
        };
      });

      setContacts(parsed);
      alert(`Successfully loaded ${parsed.length} contacts from Excel/CSV!`);
    };
    reader.readAsText(file);
  };

  // Filter contacts based on selected groups & labels (when not using CSV upload override)
  const getFilteredContacts = () => {
    // If the contact list has been replaced by CSV parser, return that
    const isCsvMode = contacts.some(c => c.id.startsWith('csv-'));
    if (isCsvMode) return contacts;

    let list = [...dbContacts];
    if (selectedGroupIds.length > 0 || selectedLabelIds.length > 0) {
      list = list.filter(contact => {
        const inGroup = selectedGroupIds.length > 0 && contact.groups?.some((g: any) => selectedGroupIds.includes(g.id));
        const inLabel = selectedLabelIds.length > 0 && contact.labels?.some((l: any) => selectedLabelIds.includes(l.id));
        return inGroup || inLabel;
      });
    }
    return list;
  };

  const filteredContacts = getFilteredContacts();
  const targetCount = filteredContacts.length;

  // Live countries breakdown
  const getCountriesBreakdown = () => {
    const counts: Record<string, number> = {};
    filteredContacts.forEach(c => {
      const phone = c.phone.replace(/\D/g, '');
      let country = 'Other';
      if (phone.startsWith('880')) country = 'Bangladesh';
      else if (phone.startsWith('91')) country = 'India';
      else if (phone.startsWith('92')) country = 'Pakistan';
      else if (phone.startsWith('1')) country = 'USA';
      else if (phone.startsWith('44')) country = 'UK';
      
      counts[country] = (counts[country] || 0) + 1;
    });

    const total = filteredContacts.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      let code = 'Globe';
      let flag = '🌐';
      if (name === 'Bangladesh') { code = 'BD'; flag = '🇧🇩'; }
      else if (name === 'India') { code = 'IN'; flag = '🇮🇳'; }
      else if (name === 'Pakistan') { code = 'PK'; flag = '🇵🇰'; }
      else if (name === 'USA') { code = 'US'; flag = '🇺🇸'; }
      else if (name === 'UK') { code = 'GB'; flag = '🇬🇧'; }

      return {
        name,
        code,
        flag,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1))
      };
    }).sort((a, b) => b.count - a.count).slice(0, 3);
  };

  const countriesBreakdown = getCountriesBreakdown();

  // Submit Campaign
  const handleSendCampaign = async () => {
    if (!campaignName) {
      alert('Please enter a campaign name');
      return;
    }
    if (!selectedSessionId) {
      alert('Please select an active WhatsApp session');
      return;
    }
    if (targetCount === 0) {
      alert('No target contacts found. Select groups, labels, or upload a CSV file.');
      return;
    }
    if (!messageBody) {
      alert('Please select a template to populate campaign message');
      return;
    }

    setIsSending(true);
    const token = localStorage.getItem('token');

    const isCsvMode = contacts.some(c => c.id.startsWith('csv-'));
    const csvNumbers = isCsvMode
      ? contacts
          .map(c => c.phone.replace(/\D/g, ''))
          .map(n => phoneFormat === 'without_country' && countryCode ? `${countryCode.replace('+', '')}${n}` : n)
      : [];

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/broadcast/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: campaignName,
          messageBody: messageBody,
          sessionId: selectedSessionId,
          targetGroupIds: selectedGroupIds,
          targetLabelIds: selectedLabelIds,
          manualNumbers: [
            ...(manualNumbers
              ? manualNumbers
                  .split(/[,\s\n]+/)
                  .map(n => n.trim().replace(/\D/g, ''))
                  .filter(n => n.length > 5)
                  .map(n => phoneFormat === 'without_country' && countryCode ? `${countryCode.replace('+', '')}${n}` : n)
              : []),
            ...csvNumbers
          ],
          status: 'PROCESSING',
          scheduledAt: scheduleTime ? new Date(scheduleTime).toISOString() : null
        })
      });

      if (res.ok) {
        alert('Campaign created successfully!');
        window.location.href = '/dashboard/whatsapp/broadcast';
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || 'Failed to create campaign'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error creating campaign.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header matching apitxt.com/whatsapp/broadcast/create */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/whatsapp/broadcast" 
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-655 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-slate-600 transform rotate-45" />
            New WhatsApp Campaign
          </h1>
          <p className="text-[13px] text-slate-500">Send WhatsApp template messages to groups, labels, or file uploads.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form Steps Card */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">1</span>
              <h2 className="font-bold text-slate-800 text-[15px]">Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Campaign Name</label>
                <input 
                  type="text" 
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g. Diwali Sale" 
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 transition-colors placeholder:text-slate-400" 
                />
              </div>

              {/* Select Project */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Select Project</label>
                <div className="relative">
                  <select 
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-600 cursor-pointer pr-8"
                  >
                    <option value="No projects available">No projects available</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Select Template */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Select Template</label>
                  <Link 
                    href="/dashboard/whatsapp/broadcast/templates" 
                    target="_blank"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                  >
                    + Create Template
                  </Link>
                </div>
                <div className="relative">
                  <select 
                    value={selectedTemplateId}
                    onChange={e => handleTemplateChange(e.target.value)}
                    disabled={selectedProject === 'No projects available'}
                    className="w-full bg-white border border-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-600 cursor-pointer pr-8"
                  >
                    {selectedProject === 'No projects available' ? (
                      <option value="">Please select a project first...</option>
                    ) : (
                      <>
                        <option value="">Please select a template...</option>
                        {templates.map(t => (
                           <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Schedule Optional */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Schedule (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-600 transition-colors" 
                />
                <p className="text-[10px] text-slate-400 mt-1">Must be at least 5 minutes in the future.</p>
              </div>

              {/* WhatsApp Session Selector */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">WhatsApp Session</label>
                <div className="relative">
                  <select 
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 appearance-none text-slate-600 cursor-pointer pr-16"
                  >
                    {sessions.length === 0 ? (
                      <option value="">No sessions configured</option>
                    ) : (
                      sessions.map((s: any) => (
                        <option key={s.id} value={s.sessionId}>
                          {s.name || s.sessionId} ({s.status})
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                      sessions.find((s: any) => s.sessionId === selectedSessionId)?.status === 'CONNECTED'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-350'
                    }`}></span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Target Audience */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">2</span>
              <h2 className="font-bold text-slate-800 text-[15px]">Target Audience</h2>
            </div>
            
            <div className="space-y-6 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Contact Groups Dropdown */}
                <div className="space-y-1.5 relative">
                  <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Contact Groups</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupDropdownOpen(!isGroupDropdownOpen);
                      setIsLabelDropdownOpen(false);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm flex items-center justify-between text-left text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <span className={selectedGroupIds.length === 0 ? "text-slate-400" : "text-slate-700 truncate mr-2"}>
                      {selectedGroupIds.length === 0 
                        ? "Select groups..." 
                        : selectedGroupIds.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')
                      }
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                  
                  {isGroupDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {groups.length === 0 ? (
                        <div className="p-3 text-xs text-slate-450 text-center">No groups found</div>
                      ) : (
                        <div className="p-1.5 space-y-0.5">
                          {groups.map(g => {
                            const isSelected = selectedGroupIds.includes(g.id);
                            return (
                              <label 
                                key={g.id}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer select-none"
                              >
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleGroupSelection(g.id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="font-medium text-slate-800">{g.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Labels Dropdown */}
                <div className="space-y-1.5 relative">
                  <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Contact Labels</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLabelDropdownOpen(!isLabelDropdownOpen);
                      setIsGroupDropdownOpen(false);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm flex items-center justify-between text-left text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <span className={selectedLabelIds.length === 0 ? "text-slate-400" : "text-slate-700 truncate mr-2"}>
                      {selectedLabelIds.length === 0 
                        ? "Select labels..." 
                        : selectedLabelIds.map(id => labels.find(l => l.id === id)?.name).filter(Boolean).join(', ')
                      }
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                  
                  {isLabelDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {labels.length === 0 ? (
                        <div className="p-3 text-xs text-slate-450 text-center">No labels found</div>
                      ) : (
                        <div className="p-1.5 space-y-0.5">
                          {labels.map(l => {
                            const isSelected = selectedLabelIds.includes(l.id);
                            return (
                              <label 
                                key={l.id}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer select-none"
                              >
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleLabelSelection(l.id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="font-medium text-slate-800">{l.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* OR Separator */}
              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative px-3.5 bg-white text-xs font-black text-slate-400 tracking-wider">OR</span>
              </div>

              {/* CSV Upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Upload Excel / CSV</span>
                </div>
                
                <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors relative cursor-pointer">
                  <input 
                    type="file" 
                    accept=".csv, .txt"
                    onChange={handleCsvUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <p className="text-xs text-slate-600 font-semibold">Click to select or drag your CSV/Text file here</p>
                  <p className="text-[10px] text-slate-400 mt-1">Format: name,phone or just phone numbers</p>
                </div>
              </div>

              {/* Phone Number Format */}
              <div className="space-y-3 pt-1">
                <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Phone Number Format</label>
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      phoneFormat === 'with_country'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300 group-hover:border-slate-400'
                    }`}>
                      {phoneFormat === 'with_country' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <input
                      type="radio"
                      name="phoneFormat"
                      value="with_country"
                      checked={phoneFormat === 'with_country'}
                      onChange={() => setPhoneFormat('with_country')}
                      className="sr-only"
                    />
                    <span className="text-sm text-slate-700 font-medium">Numbers include country code</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      phoneFormat === 'without_country'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300 group-hover:border-slate-400'
                    }`}>
                      {phoneFormat === 'without_country' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <input
                      type="radio"
                      name="phoneFormat"
                      value="without_country"
                      checked={phoneFormat === 'without_country'}
                      onChange={() => setPhoneFormat('without_country')}
                      className="sr-only"
                    />
                    <span className="text-sm text-slate-700 font-medium">Numbers without country code</span>
                  </label>
                </div>

                {/* Country Code Selector - visible only when without_country */}
                {phoneFormat === 'without_country' && (
                  <div className="ml-6 space-y-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Country Code:</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm flex items-center justify-between text-left cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <span className={countryCode ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          {countryCode
                            ? COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode
                            : 'Select country...'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isCountryDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          <div className="p-1">
                            {COUNTRIES.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => { setCountryCode(c.code); setIsCountryDropdownOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                  countryCode === c.code
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {countryCode && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                        Will be prepended to all numbers
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Numbers */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-slate-550 uppercase tracking-wider">Manual Numbers <span className="text-slate-400 font-normal normal-case text-[11px]">(Optional)</span></label>
                  {manualNumbers && (
                    <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                      {manualNumbers.split(/[,\s\n]+/).filter(n => n.trim().length > 4).length} numbers
                    </span>
                  )}
                </div>
                <textarea
                  value={manualNumbers}
                  onChange={e => setManualNumbers(e.target.value)}
                  placeholder={`e.g. 7418529630, 9876543210\n8801712345678\n+15551234567`}
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 transition-colors placeholder:text-slate-400 resize-none font-mono"
                />
                <p className="text-[11px] text-slate-400">Accepts numbers separated by comma, space, or new line.</p>
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3.5 pt-2">
            <Link 
              href="/dashboard/whatsapp/broadcast" 
              className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </Link>
            
            <button
              onClick={handleSendCampaign}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Campaign
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Audience Preview Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            
            <div className="flex items-center gap-2 text-slate-800 pb-2 border-b border-slate-100">
              <Users className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-[14.5px]">Audience Preview</h3>
            </div>

            {targetCount === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed py-2">
                Select groups, labels, upload file, or add manual numbers to see preview
              </p>
            ) : (
              <div className="space-y-4 pt-1">
                
                {/* Total Counter */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Targeted Recipients:</span>
                  <span className="font-black text-blue-600 text-sm">{targetCount} Contacts</span>
                </div>

                {/* Avatar Initial Lists */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {filteredContacts.slice(0, 10).map((contact, i) => {
                    const initials = contact.name 
                      ? contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : '#';
                    return (
                      <div 
                        key={contact.id || i}
                        title={`${contact.name || 'No Name'} (${contact.phone})`}
                        className="w-7 h-7 rounded-full bg-slate-800 text-white border border-white flex items-center justify-center text-[9px] font-black shadow-sm shrink-0 cursor-help"
                      >
                        {initials}
                      </div>
                    );
                  })}
                  {targetCount > 10 && (
                    <span className="text-[10px] text-slate-400 font-extrabold pl-1">+{targetCount - 10} others</span>
                  )}
                </div>

                {/* Country breakdown list */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Countries distribution</p>
                  <div className="space-y-2">
                    {countriesBreakdown.map(c => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="text-xs" title={c.name}>{c.flag}</span>
                        <span className="text-[10px] font-bold text-slate-500 w-5 uppercase">{c.code}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.percentage}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-655 w-9 text-right">{c.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Simple Live WhatsApp simulator card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-slate-400"/> WhatsApp Preview</h3>
            <div className="bg-[#efeae2] rounded-xl p-3 h-[240px] shadow-inner border border-slate-200 relative overflow-hidden flex flex-col justify-between">
              
              <div className="h-8 bg-[#075e54] flex items-center px-3 gap-2 rounded-t shrink-0">
                <div className="w-5.5 h-5.5 rounded-full bg-slate-305 shrink-0"></div>
                <div className="text-white font-semibold text-[11px] truncate">Customer Preview</div>
              </div>

              <div className="flex-1 overflow-y-auto py-2.5 px-2 flex flex-col justify-end scrollbar-hide">
                <div className="bg-white p-2.5 rounded-xl rounded-tr-none shadow-sm text-[11px] text-slate-800 whitespace-pre-wrap ml-4 relative">
                  {messageBody 
                    ? messageBody
                        .replace(/{{name}}/g, filteredContacts[0]?.name || 'Customer')
                        .replace(/{{company_link}}/g, 'vexo.link/deal')
                    : 'Select a message template to view simulation...'
                  }
                  <div className="text-[8px] text-slate-400 text-right mt-1">11:30 AM <Check className="w-2.5 h-2.5 inline text-blue-500 font-bold"/></div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
