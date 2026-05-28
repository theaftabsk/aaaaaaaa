'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Loader2, Sparkles, Globe, 
  HelpCircle, CheckCircle2, AlertCircle, Phone, ExternalLink, 
  MessageSquare, User, Smile, PlusCircle, Smartphone
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface ButtonItem {
  id: string;
  type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
  text: string;
  phone_number?: string;
  url?: string;
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  const uniqueVars = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, ''))));
  return uniqueVars.sort((a, b) => parseInt(a) - parseInt(b));
}

function TemplateBuilderComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');
  const isEditMode = !!templateId;

  // Loading and Error state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<ButtonItem[]>([]);
  const [variablesSamples, setVariablesSamples] = useState<Record<string, string>>({});

  // Fetch template details if editing
  useEffect(() => {
    if (!isEditMode) return;

    const fetchTemplateDetails = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whatsapp/meta/templates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const templatesList = await res.json();
          const target = templatesList.find((t: any) => t.id === templateId);
          if (target) {
            setName(target.name || '');
            setCategory(target.category || 'MARKETING');
            setLanguage(target.language || 'en_US');
            
            // Extract components
            const components = target.components || [];
            
            const headerComp = components.find((c: any) => c.type === 'HEADER');
            if (headerComp) {
              setHeaderType(headerComp.format === 'TEXT' ? 'TEXT' : 'NONE');
              setHeaderText(headerComp.text || '');
              // Import header variable samples
              if (headerComp.example?.header_text?.[0]) {
                setVariablesSamples(prev => ({
                  ...prev,
                  'h_1': headerComp.example.header_text[0]
                }));
              }
            }

            const bodyComp = components.find((c: any) => c.type === 'BODY');
            if (bodyComp) {
              setBodyText(bodyComp.text || '');
              // Import body variable samples
              if (bodyComp.example?.body_text?.[0]) {
                const bodyVars = extractVariables(bodyComp.text || '');
                const samples = bodyComp.example.body_text[0];
                const newSamples: Record<string, string> = {};
                bodyVars.forEach((v, index) => {
                  if (samples[index]) {
                    newSamples[`b_${v}`] = samples[index];
                  }
                });
                setVariablesSamples(prev => ({ ...prev, ...newSamples }));
              }
            }

            const footerComp = components.find((c: any) => c.type === 'FOOTER');
            if (footerComp) {
              setFooterText(footerComp.text || '');
            }

            const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');
            if (buttonsComp && buttonsComp.buttons) {
              const mappedButtons = buttonsComp.buttons.map((btn: any, index: number) => {
                const btnId = `btn_${index}`;
                // Check if button has URL variables and import samples
                if (btn.type === 'URL' && btn.example?.[0]) {
                  const urlVars = extractVariables(btn.url || '');
                  if (urlVars.length > 0) {
                    setVariablesSamples(prev => ({
                      ...prev,
                      [`btn_${btnId}_${urlVars[0]}`]: btn.example[0]
                    }));
                  }
                }
                return {
                  id: btnId,
                  type: btn.type,
                  text: btn.text,
                  phone_number: btn.phone_number,
                  url: btn.url
                };
              });
              setButtons(mappedButtons);
            }
          } else {
            setErrorMessage('Template not found or has been deleted.');
          }
        } else {
          setErrorMessage('Failed to fetch template details from server.');
        }
      } catch (err: any) {
        console.error('Error fetching template details:', err);
        setErrorMessage(err.message || 'Error fetching template details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplateDetails();
  }, [templateId, isEditMode]);

  // Extract variables
  const headerVariables = useMemo(() => {
    return headerType === 'TEXT' ? extractVariables(headerText) : [];
  }, [headerText, headerType]);

  const bodyVariables = useMemo(() => {
    return extractVariables(bodyText);
  }, [bodyText]);

  // Sync state for variables samples to make sure they exist
  useEffect(() => {
    const updated = { ...variablesSamples };
    let changed = false;

    // Header variable h_1
    if (headerVariables.length > 0 && !updated['h_1']) {
      updated['h_1'] = 'Sample Header';
      changed = true;
    }

    // Body variables
    bodyVariables.forEach(v => {
      if (!updated[`b_${v}`]) {
        updated[`b_${v}`] = `Sample ${v}`;
        changed = true;
      }
    });

    // Buttons variables
    buttons.forEach(btn => {
      if (btn.type === 'URL' && btn.url) {
        const btnVars = extractVariables(btn.url);
        btnVars.forEach(v => {
          const key = `btn_${btn.id}_${v}`;
          if (!updated[key]) {
            updated[key] = 'SampleParam';
            changed = true;
          }
        });
      }
    });

    if (changed) {
      setVariablesSamples(updated);
    }
  }, [headerVariables, bodyVariables, buttons, variablesSamples]);

  // Live preview replacement helpers
  const previewHeaderText = useMemo(() => {
    let output = headerText;
    headerVariables.forEach(v => {
      const val = variablesSamples['h_1'] || `{{${v}}}`;
      output = output.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
    });
    return output;
  }, [headerText, headerVariables, variablesSamples]);

  const previewBodyText = useMemo(() => {
    let output = bodyText;
    bodyVariables.forEach(v => {
      const val = variablesSamples[`b_${v}`] || `{{${v}}}`;
      output = output.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
    });
    return output || 'Body text placeholder...';
  }, [bodyText, bodyVariables, variablesSamples]);

  const previewButtonUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    buttons.forEach(btn => {
      if (btn.type === 'URL' && btn.url) {
        let output = btn.url;
        const btnVars = extractVariables(btn.url);
        btnVars.forEach(v => {
          const val = variablesSamples[`btn_${btn.id}_${v}`] || `{{${v}}}`;
          output = output.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
        });
        urls[btn.id] = output;
      }
    });
    return urls;
  }, [buttons, variablesSamples]);

  // Button builder actions
  const addButton = (type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL') => {
    // Validate restrictions
    const quickReplies = buttons.filter(b => b.type === 'QUICK_REPLY');
    const phones = buttons.filter(b => b.type === 'PHONE_NUMBER');
    const urls = buttons.filter(b => b.type === 'URL');

    if (type === 'QUICK_REPLY' && quickReplies.length >= 10) {
      alert('You can add a maximum of 10 Quick Reply buttons.');
      return;
    }
    if (type === 'PHONE_NUMBER' && phones.length >= 1) {
      alert('You can add a maximum of 1 Phone Number button.');
      return;
    }
    if (type === 'URL' && urls.length >= 2) {
      alert('You can add a maximum of 2 URL buttons.');
      return;
    }

    const newBtn: ButtonItem = {
      id: `btn_${Date.now()}`,
      type,
      text: type === 'QUICK_REPLY' ? 'Quick Reply' : type === 'PHONE_NUMBER' ? 'Call Us' : 'Visit Website',
      phone_number: type === 'PHONE_NUMBER' ? '+1' : undefined,
      url: type === 'URL' ? 'https://example.com/{{1}}' : undefined
    };
    setButtons([...buttons, newBtn]);
  };

  const removeButton = (id: string) => {
    setButtons(buttons.filter(b => b.id !== id));
    // Clean up variables state for this button
    const cleanVars = { ...variablesSamples };
    Object.keys(cleanVars).forEach(key => {
      if (key.startsWith(`btn_${id}_`)) {
        delete cleanVars[key];
      }
    });
    setVariablesSamples(cleanVars);
  };

  const updateButton = (id: string, fields: Partial<ButtonItem>) => {
    setButtons(buttons.map(b => b.id === id ? { ...b, ...fields } : b));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Clean name formatting to lower_snake_case
    const formattedName = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!bodyText.trim()) {
      alert('Body text is required.');
      return;
    }

    // Build components array
    const components: any[] = [];

    // Header Component
    if (headerType === 'TEXT' && headerText.trim()) {
      const headerComp: any = {
        type: 'HEADER',
        format: 'TEXT',
        text: headerText.trim()
      };
      if (headerVariables.length > 0) {
        headerComp.example = {
          header_text: [variablesSamples['h_1'] || 'Sample Header']
        };
      }
      components.push(headerComp);
    }

    // Body Component
    const bodyComp: any = {
      type: 'BODY',
      text: bodyText.trim()
    };
    if (bodyVariables.length > 0) {
      const bodySamples = bodyVariables.map(v => variablesSamples[`b_${v}`] || `Sample`);
      bodyComp.example = {
        body_text: [bodySamples]
      };
    }
    components.push(bodyComp);

    // Footer Component
    if (footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: footerText.trim()
      });
    }

    // Buttons Component
    if (buttons.length > 0) {
      const buttonsPayload = buttons.map(btn => {
        if (btn.type === 'QUICK_REPLY') {
          return {
            type: 'QUICK_REPLY',
            text: btn.text.trim()
          };
        } else if (btn.type === 'PHONE_NUMBER') {
          return {
            type: 'PHONE_NUMBER',
            text: btn.text.trim(),
            phone_number: (btn.phone_number || '').trim().replace(/\s+/g, '')
          };
        } else {
          // URL
          const btnComp: any = {
            type: 'URL',
            text: btn.text.trim(),
            url: (btn.url || '').trim()
          };
          const btnVars = extractVariables(btn.url || '');
          if (btnVars.length > 0) {
            btnComp.example = [variablesSamples[`btn_${btn.id}_${btnVars[0]}`] || 'Sample'];
          }
          return btnComp;
        }
      });
      components.push({
        type: 'BUTTONS',
        buttons: buttonsPayload
      });
    }

    setIsSaving(true);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication session not found.');
      setIsSaving(false);
      return;
    }

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whatsapp/meta/templates${isEditMode ? `/${templateId}` : ''}`;
      const method = isEditMode ? 'POST' : 'POST'; // Wait, edit uses POST to templateId as registered in routes: router.post('/meta/templates/:id', editMetaTemplate)
      
      const payload = isEditMode 
        ? { components } 
        : { name: formattedName, category, language, components };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(isEditMode ? 'Template updated successfully!' : 'Template submitted for Meta approval successfully!');
        router.push('/dashboard/whatsapp/broadcast/templates');
      } else {
        const errorData = await res.json();
        alert(`Failed to save template: ${errorData.error || 'Meta API returned an error.'}`);
      }
    } catch (err: any) {
      console.error('Error saving template:', err);
      alert(`Error saving template: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = () => {
    const nextNum = bodyVariables.length + 1;
    setBodyText(prev => prev + ` {{${nextNum}}}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading template details...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-center max-w-lg mx-auto my-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-black text-rose-800">Error Loading Template</h3>
        <p className="text-sm text-rose-600">{errorMessage}</p>
        <Link href="/dashboard/whatsapp/broadcast/templates" className="inline-block bg-slate-900 text-white font-bold text-sm px-6 py-2.5 rounded-2xl">
          Back to Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/whatsapp/broadcast/templates" 
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-sm transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEditMode ? 'Edit Template' : 'New Template'}
          </h1>
          <p className="text-sm text-slate-400">
            {isEditMode 
              ? 'Update message content for this WhatsApp template' 
              : 'Create standard message structures for automation'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Form Builder */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          
          {/* Card: Basic Info */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Template Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Template Name *</label>
                <input 
                  type="text"
                  required
                  disabled={isEditMode}
                  value={name}
                  onChange={(e) => {
                    const cleanName = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    setName(cleanName);
                  }}
                  placeholder="e.g. shipping_notification"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:border-emerald-500 outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium text-slate-800"
                />
                {!isEditMode && (
                  <p className="text-[10px] text-slate-400">Use lower_snake_case containing letters, numbers, and underscores only.</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                <select
                  disabled={isEditMode}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:border-emerald-500 outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Language</label>
                <select
                  disabled={isEditMode}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:border-emerald-500 outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="bn">Bengali (bn)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="pt_BR">Portuguese (Brazil)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="ar">Arabic (ar)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                  <option value="id">Indonesian (id)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Card: Header & Body */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            
            {/* Header Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Header (Optional)
              </h3>
              
              <div className="flex gap-4">
                {['NONE', 'TEXT'].map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="headerType"
                      checked={headerType === type}
                      onChange={() => setHeaderType(type as any)}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    {type === 'NONE' ? 'None' : 'Text'}
                  </label>
                ))}
              </div>

              {headerType === 'TEXT' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input 
                    type="text"
                    maxLength={60}
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="Enter header text (e.g. Order Confirmed!)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-colors"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Supports 1 variable like `{"{{1}}"}`. Max 60 characters.</span>
                    <span>{headerText.length}/60</span>
                  </div>

                  {headerVariables.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2 space-y-2">
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Smile className="w-3.5 h-3.5 text-blue-500" /> Header Variable Sample Value
                      </p>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Order #1042"
                        value={variablesSamples['h_1'] || ''}
                        onChange={(e) => setVariablesSamples(prev => ({ ...prev, 'h_1': e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Body Configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Body *
                </h3>
                <button 
                  type="button"
                  onClick={insertVariable}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Variable
                </button>
              </div>

              <div className="relative">
                <textarea
                  required
                  rows={6}
                  maxLength={1024}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Enter your message template body here. e.g. Hello {{1}}, your booking for {{2}} is confirmed."
                  className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-4 text-sm focus:border-emerald-500 outline-none resize-none transition-colors"
                ></textarea>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
                  <span>Body variables must start at 1 and be consecutive (e.g. `{"{{1}}"}`, `{"{{2}}"}`).</span>
                  <span>{bodyText.length}/1024</span>
                </div>
              </div>

              {/* Dynamic Body Variable Input Fields */}
              {bodyVariables.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-purple-500" /> Body Variable Samples (Required by Meta)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bodyVariables.map(v => (
                      <div key={v} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Sample for `{"{{" + v + "}}"}` *</label>
                        <input 
                          type="text"
                          required
                          value={variablesSamples[`b_${v}`] || ''}
                          onChange={(e) => setVariablesSamples(prev => ({ ...prev, [`b_${v}`]: e.target.value }))}
                          placeholder={`e.g. Sample ${v}`}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <hr className="border-slate-100" />

            {/* Footer Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Footer (Optional)
              </h3>
              <input 
                type="text"
                maxLength={60}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Enter footer text (e.g. Reply STOP to opt-out)"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:border-emerald-500 outline-none transition-colors"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                <span>Displays in small muted text at the very bottom of the chat bubble.</span>
                <span>{footerText.length}/60</span>
              </div>
            </div>

          </div>

          {/* Card: Buttons */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Buttons (Optional)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Add buttons for quick user interaction. Max 10 buttons total.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addButton('QUICK_REPLY')}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                  + Quick Reply
                </button>
                <button
                  type="button"
                  onClick={() => addButton('URL')}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                  + Website Link
                </button>
                <button
                  type="button"
                  onClick={() => addButton('PHONE_NUMBER')}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                  + Phone Call
                </button>
              </div>
            </div>

            {buttons.length === 0 ? (
              <div className="border-2 border-dashed border-slate-100 rounded-3xl py-8 text-center text-slate-400 text-xs">
                No buttons added yet. Click one of the options above to add one.
              </div>
            ) : (
              <div className="space-y-4">
                {buttons.map((btn, index) => {
                  const urlVars = btn.type === 'URL' ? extractVariables(btn.url || '') : [];
                  return (
                    <div key={btn.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-3 relative group">
                      
                      <button
                        type="button"
                        onClick={() => removeButton(btn.id)}
                        className="absolute right-4 top-4 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove Button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-sm uppercase">
                          Button {index + 1}: {btn.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Button Text */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Button Label *</label>
                          <input 
                            type="text"
                            required
                            maxLength={25}
                            value={btn.text}
                            onChange={(e) => updateButton(btn.id, { text: e.target.value })}
                            placeholder="e.g. Learn More"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                          />
                        </div>

                        {/* Phone Specific input */}
                        {btn.type === 'PHONE_NUMBER' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Phone Number *</label>
                            <input 
                              type="text"
                              required
                              value={btn.phone_number || ''}
                              onChange={(e) => updateButton(btn.id, { phone_number: e.target.value })}
                              placeholder="e.g. +15551234567"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                            />
                          </div>
                        )}

                        {/* URL Specific input */}
                        {btn.type === 'URL' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Website URL *</label>
                            <input 
                              type="text"
                              required
                              value={btn.url || ''}
                              onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                              placeholder="e.g. https://example.com/{{1}}"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                            />
                          </div>
                        )}

                      </div>

                      {/* URL Dynamic variable parameter support */}
                      {btn.type === 'URL' && urlVars.length > 0 && (
                        <div className="bg-white border border-slate-100 rounded-xl p-3 mt-2 space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Smile className="w-3.5 h-3.5 text-rose-500" /> URL Variable Sample Value
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. track-12394"
                            value={variablesSamples[`btn_${btn.id}_${urlVars[0]}`] || ''}
                            onChange={(e) => setVariablesSamples(prev => ({
                              ...prev,
                              [`btn_${btn.id}_${urlVars[0]}`]: e.target.value
                            }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 outline-none"
                          />
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Submit Button Row */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Link
              href="/dashboard/whatsapp/broadcast/templates"
              className="border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-bold text-sm px-6 py-3.5 rounded-2xl transition-colors shadow-sm bg-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Template...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {isEditMode ? 'Save Template Changes' : 'Submit Template for Meta Approval'}
                </>
              )}
            </button>
          </div>

        </form>

        {/* Right: Live Preview Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs px-1">
            <Smartphone className="w-4 h-4" /> Live WhatsApp Preview
          </div>

          {/* Phone Frame Wrapper */}
          <div className="w-full max-w-[390px] mx-auto bg-slate-950 border-[10px] border-slate-900 rounded-[50px] shadow-2xl overflow-hidden aspect-[9/18.5] flex flex-col relative ring-1 ring-slate-850">
            
            {/* Phone Notch/Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-end px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-950"></div>
            </div>

            {/* Phone Header Bar */}
            <div className="bg-[#005e54] text-white pt-8 pb-3 px-4 flex items-center justify-between shadow-md relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-white rotate-[-45deg] mr-0.5 cursor-pointer"></div>
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shadow-inner">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="-space-y-0.5">
                  <div className="font-extrabold text-sm flex items-center gap-1">
                    Vexo Support
                    <span className="inline-block w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white" title="Verified Account">✓</span>
                  </div>
                  <div className="text-[10px] text-emerald-100/70">Online</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold opacity-90">
                <Phone className="w-4 h-4" />
                <div className="flex flex-col space-y-0.5 leading-none">
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                </div>
              </div>
            </div>

            {/* Chat Area Background */}
            <div className="flex-1 bg-[#efeae2] p-4 relative overflow-y-auto flex flex-col justify-end">
              
              {/* Message Bubble Container */}
              <div className="space-y-2 max-w-[85%] self-start animate-in fade-in slide-in-from-bottom-3 duration-300">
                
                {/* Bubble */}
                <div className="bg-white rounded-3xl rounded-tl-none shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] border-b border-r border-slate-200/50 p-3 space-y-2 text-slate-800 text-xs font-sans relative">
                  
                  {/* Bubble Tail */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-[8px] border-transparent border-t-white border-r-white"></div>

                  {/* Header text if present */}
                  {headerType === 'TEXT' && previewHeaderText && (
                    <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5 mb-1.5 break-words">
                      {previewHeaderText}
                    </div>
                  )}

                  {/* Body text */}
                  <div className="leading-relaxed whitespace-pre-wrap break-words text-slate-700">
                    {previewBodyText}
                  </div>

                  {/* Footer text if present */}
                  {footerText && (
                    <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-50 font-medium">
                      {footerText}
                    </div>
                  )}

                  {/* Message timestamp metadata */}
                  <div className="text-[9px] text-slate-400 text-right -mt-1 -mr-1 flex items-center justify-end gap-0.5 select-none font-medium">
                    <span>9:41 AM</span>
                    <span className="text-emerald-500 font-extrabold">✓✓</span>
                  </div>
                </div>

                {/* Inline Buttons under bubble */}
                {buttons.length > 0 && (
                  <div className="space-y-1.5">
                    {buttons.map(btn => (
                      <button
                        key={btn.id}
                        type="button"
                        className="w-full bg-white hover:bg-slate-50 text-sky-600 hover:text-sky-700 font-bold py-2.5 px-4 rounded-2xl shadow-[0_1px_1px_rgba(0,0,0,0.08)] border border-slate-200/50 flex items-center justify-center gap-1.5 text-xs transition-colors"
                      >
                        {btn.type === 'PHONE_NUMBER' && <Phone className="w-3.5 h-3.5 text-sky-500" />}
                        {btn.type === 'URL' && <ExternalLink className="w-3.5 h-3.5 text-sky-500" />}
                        {btn.text}
                      </button>
                    ))}
                  </div>
                )}

              </div>

            </div>

            {/* Input Bar (Static Decoration) */}
            <div className="bg-[#f0f2f5] p-3 flex items-center gap-2 border-t border-slate-200 relative z-10">
              <div className="flex-1 bg-white rounded-full py-2 px-4 text-xs text-slate-400 flex items-center justify-between border border-slate-200">
                <span>Type a message</span>
                <span className="text-base">😊</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold shadow-md">
                🎤
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading template builder...</p>
      </div>
    }>
      <TemplateBuilderComponent />
    </Suspense>
  );
}
