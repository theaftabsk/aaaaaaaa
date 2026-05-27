'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, User, Contact as ContactIcon, X, Upload } from 'lucide-react';
import Papa from 'papaparse';

interface Group {
  id: string;
  name: string;
  color: string | null;
}

interface Label {
  id: string;
  name: string;
  color: string | null;
}

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  groups: Group[];
  labels: Label[];
  createdAt: string;
}

export default function PhonebookContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importGroupIds, setImportGroupIds] = useState<string[]>([]);
  const [importLabelIds, setImportLabelIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number, failed: number } | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string; phone: string; email: string; groupIds: string[]; labelIds: string[]
  }>({
    name: '', phone: '', email: '', groupIds: [], labelIds: []
  });

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [conRes, grpRes, lblRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/groups`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/labels`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (conRes.ok) setContacts(await conRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
      if (lblRes.ok) setLabels(await lblRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (contact?: Contact) => {
    if (contact) {
      setSelectedContact(contact);
      setFormData({
        name: contact.name || '',
        phone: contact.phone,
        email: contact.email || '',
        groupIds: contact.groups.map(g => g.id),
        labelIds: contact.labels.map(l => l.id),
      });
    } else {
      setSelectedContact(null);
      setFormData({ name: '', phone: '', email: '', groupIds: [], labelIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = selectedContact
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/contacts/${selectedContact.id}`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/contacts`;
    const method = selectedContact ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData(); // Reload
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMultiSelect = (e: React.ChangeEvent<HTMLSelectElement>, field: 'groupIds' | 'labelIds') => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, [field]: selected });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const contacts = results.data.map((row: any) => ({
          phone: row.phone || row.Phone || row.PHONE || '',
          name: row.name || row.Name || row.NAME || '',
          email: row.email || row.Email || row.EMAIL || '',
        })).filter(c => c.phone);

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/contacts/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              contacts,
              groupIds: importGroupIds,
              labelIds: importLabelIds
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setImportResult({ imported: data.imported, failed: data.failed });
            fetchData();
          } else {
            alert('Import failed: ' + data.error);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setImporting(false);
        }
      }
    });
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = contact.name?.toLowerCase().includes(query) || false;
    const phoneMatch = contact.phone.includes(query);
    const grpMatch = contact.groups.some(g => g.name.toLowerCase().includes(query));
    const lblMatch = contact.labels.some(l => l.name.toLowerCase().includes(query));
    return nameMatch || phoneMatch || grpMatch || lblMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts, groups, labels..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => { setIsImportModalOpen(true); setImportResult(null); }} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> New Contact
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/55 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Groups</th>
                <th className="px-6 py-4">Labels</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10">Loading contacts...</td></tr>
              ) : filteredContacts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No contacts found.</td></tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          {contact.name ? contact.name[0].toUpperCase() : <ContactIcon className="w-5 h-5"/>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{contact.name || 'Unnamed'}</p>
                          <p className="text-xs text-slate-400 font-normal mt-0.5">+{contact.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.groups.map(g => (
                          <span key={g.id} className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: `${g.color}10`, borderColor: `${g.color}30`, color: g.color || '#000' }}>
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.labels.map(l => (
                          <span key={l.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: `${l.color}15`, borderColor: `${l.color}30`, color: l.color || '#000' }}>
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold uppercase">Active</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(contact)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900">{selectedContact ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleSaveContact} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone (E.164)</label>
                  <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none" placeholder="e.g. 8801700000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Email (Optional)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Assign Groups (Multi-select)</label>
                <select multiple value={formData.groupIds} onChange={(e) => handleMultiSelect(e, 'groupIds')} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none min-h-[80px]">
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <p className="text-[10px] text-slate-400">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Assign Labels (Multi-select)</label>
                <select multiple value={formData.labelIds} onChange={(e) => handleMultiSelect(e, 'labelIds')} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none min-h-[80px]">
                  {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 mt-2">
                {selectedContact ? 'Save Changes' : 'Create Contact'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Import CSV</h3>
              <button onClick={() => setIsImportModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            {importResult ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Import Completed</h4>
                <div className="flex justify-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-xl text-emerald-600">{importResult.imported}</p>
                    <p className="text-slate-500">Success</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xl text-rose-600">{importResult.failed}</p>
                    <p className="text-slate-500">Failed</p>
                  </div>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 mt-4">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleImport} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Upload CSV File</label>
                  <input required type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                  <p className="text-[10px] text-slate-400">CSV must have headers: phone, name, email.</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assign to Groups (Multi-select)</label>
                  <select multiple value={importGroupIds} onChange={(e) => setImportGroupIds(Array.from(e.target.selectedOptions, o => o.value))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none min-h-[80px]">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assign to Labels (Multi-select)</label>
                  <select multiple value={importLabelIds} onChange={(e) => setImportLabelIds(Array.from(e.target.selectedOptions, o => o.value))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none min-h-[80px]">
                    {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <button type="submit" disabled={importing} className="w-full bg-emerald-500 disabled:bg-emerald-300 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 mt-2 flex items-center justify-center gap-2">
                  {importing ? 'Importing...' : <><Upload className="w-4 h-4" /> Start Import</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
