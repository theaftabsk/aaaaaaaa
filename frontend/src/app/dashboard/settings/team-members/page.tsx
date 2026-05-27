'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Trash2, Mail, Lock, User as UserIcon,
  Shield, Loader2, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user`;
function getAuthToken() { return localStorage.getItem('token') || ''; }

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'AGENT';
};

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch Team Members
  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/team`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMembers(data);
        
        // Find if current user is admin/owner
        const currentUserId = localStorage.getItem('userId');
        const currentUser = data.find(m => m.id === currentUserId);
        if (currentUser && currentUser.role !== 'AGENT') {
          setIsAdmin(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/team/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add team member.');
      }

      setSuccess('Agent added successfully!');
      setName('');
      setEmail('');
      setPassword('');
      fetchTeam();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Member
  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    setError(null);
    setSuccess(null);
    setDeletingId(id);

    try {
      const res = await fetch(`${API_BASE}/team/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove team member.');
      }

      setSuccess('Team member removed successfully.');
      fetchTeam();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700 animate-fadeIn">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Invite/Add Form (Visible only to Admin/Owner) */}
        {isAdmin && (
          <div className="lg:col-span-1 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 h-fit space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-800">Add Team Member</h3>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="E.g. Rahim Ali"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="E.g. rahim@business.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding Member...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Agent Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Team Members List */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden`}>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Workspace Agents</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage agents with workspace access</p>
              </div>
            </div>
            <button
              onClick={fetchTeam}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
              title="Refresh List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Loading team members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-bold text-sm">No Team Members</p>
                <p className="text-slate-400 text-xs mt-1">Add agents to help handle your support tickets.</p>
              </div>
            ) : (
              members.map(member => (
                <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-sm shrink-0 border border-slate-200">
                      {member.name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('') || <UserIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                          member.role === 'ADMIN' || member.role === 'USER'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          <Shield className="w-2.5 h-2.5" />
                          {member.role === 'USER' ? 'OWNER' : member.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                  </div>

                  {isAdmin && member.role === 'AGENT' && (
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      disabled={deletingId === member.id}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90 disabled:opacity-40 shrink-0"
                      title="Remove Agent"
                    >
                      {deletingId === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
