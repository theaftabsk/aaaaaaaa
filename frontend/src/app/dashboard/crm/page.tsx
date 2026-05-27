'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, User, Tag, FileText, X } from 'lucide-react';

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
}

export default function CRMContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tags: '',
    notes: '',
  });

  const [errorMessage, setErrorMessage] = useState('');

  // Fetch contacts
  const fetchContacts = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/crm/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({ name: '', phone: '', email: '', tags: '', notes: '' });
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name || '',
      phone: contact.phone,
      email: contact.email || '',
      tags: contact.tags.join(', '),
      notes: contact.notes || '',
    });
    setErrorMessage('');
    setIsEditModalOpen(true);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const tagList = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/crm/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          tags: tagList,
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchContacts();
      } else {
        setErrorMessage(data.error || 'Failed to create contact.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Server connection error.');
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    setErrorMessage('');

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const tagList = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/crm/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          tags: tagList,
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchContacts();
      } else {
        setErrorMessage(data.error || 'Failed to update contact.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Server connection error.');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/crm/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = contact.name?.toLowerCase().includes(query) || false;
    const phoneMatch = contact.phone.includes(query);
    const emailMatch = contact.email?.toLowerCase().includes(query) || false;
    const tagsMatch = contact.tags.some((t) => t.toLowerCase().includes(query));
    return nameMatch || phoneMatch || emailMatch || tagsMatch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by name, phone, tags..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          />
        </div>
        <button
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/55 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-400 text-xs">Loading contacts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                          {contact.name ? contact.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{contact.name || 'Unnamed'}</p>
                          {contact.email && (
                            <p className="text-xs text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {contact.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        +{contact.phone}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length === 0 && (
                          <span className="text-xs text-slate-400 italic font-normal">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title={contact.notes || ''}>
                        {contact.notes || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(contact)}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add & Edit Modals */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-lg">
                {isAddModalOpen ? 'Add New Contact' : 'Edit Contact'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={isAddModalOpen ? handleCreateContact : handleUpdateContact} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-600 text-sm font-semibold rounded-2xl">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone (E.164 format)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 8801700000000"
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags (comma separated)</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="VIP, Lead, Student"
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add extra information"
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {isAddModalOpen ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
