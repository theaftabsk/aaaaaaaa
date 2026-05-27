'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Search, Users } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  color: string | null;
  _count: { contacts: number };
  createdAt: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#10b981' });

  const fetchGroups = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = editingGroup 
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/groups/${editingGroup.id}`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/groups`;
    
    const method = editingGroup ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/phonebook/groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) fetchGroups();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({ name: group.name, color: group.color || '#10b981' });
    } else {
      setEditingGroup(null);
      setFormData({ name: '', color: '#10b981' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Contact Groups
          </h2>
          <p className="text-slate-500 text-sm mt-1">Organize your contacts into groups for targeted broadcasting.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/55 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-4">Group Name</th>
              <th className="px-6 py-4">Contacts Count</th>
              <th className="px-6 py-4">Created At</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10">Loading...</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400">No groups found.</td></tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color || '#10b981' }} />
                    <span className="font-semibold text-slate-900">{group.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      {group._count.contacts} contacts
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(group)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(group.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{editingGroup ? 'Edit Group' : 'Create Group'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Group Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Group Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                  className="w-full h-12 mt-1 rounded-xl cursor-pointer"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600">
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
