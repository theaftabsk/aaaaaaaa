'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, StickyNote, Pencil, Trash2, X, Check,
  Loader2, Pin, PinOff, Search
} from 'lucide-react';

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/telegram`;
function getToken() { return localStorage.getItem('token') || ''; }

const NOTE_COLORS = [
  { label: 'Blue',   value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Emerald',value: '#10B981' },
  { label: 'Amber',  value: '#F59E0B' },
  { label: 'Rose',   value: '#F43F5E' },
  { label: 'Slate',  value: '#64748B' },
];

const emptyForm = { title: '', content: '', color: '#3B82F6', pinned: false };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TelegramNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/notes`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load notes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const openCreate = () => { setEditNote(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (note: Note) => {
    setEditNote(note);
    setForm({ title: note.title, content: note.content, color: note.color, pinned: note.pinned });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required.');
    setSaving(true);
    try {
      const method = editNote ? 'PUT' : 'POST';
      const url = editNote ? `${API}/notes/${editNote.id}` : `${API}/notes`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editNote ? 'Note updated!' : 'Note created!');
      setShowModal(false);
      fetchNotes();
    } catch (err: any) { toast.error(err.message || 'Error saving note'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Note deleted');
      setConfirmDelete(null);
      fetchNotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeletingId(null); }
  };

  const togglePin = async (note: Note) => {
    try {
      await fetch(`${API}/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...note, pinned: !note.pinned }),
      });
      fetchNotes();
    } catch { toast.error('Failed to update pin'); }
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-400/30 text-white">
            <StickyNote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Telegram Notes</h1>
            <p className="text-sm text-slate-500">Quick notes for your Telegram bot management</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-400/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-violet-400 transition-colors shadow-sm"
          placeholder="Search notes..."
        />
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-400">
            <StickyNote className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">{search ? 'No notes found' : 'No notes yet'}</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            {search ? 'Try a different search term.' : 'Add your first note to keep track of bot configurations, credentials, or important reminders.'}
          </p>
          {!search && (
            <button onClick={openCreate} className="mt-2 bg-violet-500 hover:bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-400/20">
              Create Note
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map(note => (
            <div
              key={note.id}
              className="break-inside-avoid bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative"
              style={{ borderColor: `${note.color}40`, borderLeftWidth: '3px', borderLeftColor: note.color }}
            >
              {/* Pin indicator */}
              {note.pinned && (
                <div className="absolute top-3 right-3 text-amber-400">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-slate-900 text-sm leading-snug pr-4">{note.title}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap mb-4">{note.content}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">{formatDate(note.updatedAt)}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => togglePin(note)}
                    className={`p-1.5 rounded-lg transition-all ${note.pinned ? 'text-amber-400 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`}
                    title={note.pinned ? 'Unpin' : 'Pin'}>
                    {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(note)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-violet-500 hover:bg-violet-50 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(note.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Color dot */}
              <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full" style={{ backgroundColor: note.color }} />
            </div>
          ))}
        </div>
      )}

      {/* Note count */}
      {notes.length > 0 && (
        <p className="text-xs text-slate-400 text-center mt-6">
          {filtered.length} of {notes.length} notes · {notes.filter(n => n.pinned).length} pinned
        </p>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-7 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <StickyNote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{editNote ? 'Edit Note' : 'New Note'}</h2>
                <p className="text-xs text-slate-400">{editNote ? 'Update your note' : 'Write something important'}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title <span className="text-rose-400">*</span></label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-violet-400 transition-colors"
                  placeholder="Note title" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Content <span className="text-rose-400">*</span></label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-violet-400 transition-colors resize-none"
                  placeholder="Write your note here..." required />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {NOTE_COLORS.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setForm(p => ({ ...p, color: c.value }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c.value ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label} />
                  ))}
                </div>
              </div>

              {/* Pin toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div onClick={() => setForm(p => ({ ...p, pinned: !p.pinned }))}
                  className={`w-10 h-6 rounded-full transition-colors ${form.pinned ? 'bg-amber-400' : 'bg-slate-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-all shadow ${form.pinned ? 'ml-5' : 'ml-1'}`} />
                </div>
                <span className="text-sm text-slate-600 font-medium">Pin this note</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Delete Note?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deletingId}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
