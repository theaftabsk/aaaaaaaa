'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GitBranch, Plus, Trash2, FolderOpen, RefreshCw, Key, ToggleLeft, ToggleRight, 
  Eye
} from 'lucide-react';

interface ChatbotFlow {
  id: string;
  name: string;
  triggerKeywords: string[];
  flowJson: {
    nodes?: any[];
    edges?: any[];
  };
  isActive: boolean;
}

export default function BuilderPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);

  const fetchFlows = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoadingFlows(true);
      const resFlows = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const flowsData = await resFlows.json();
      if (Array.isArray(flowsData)) {
        setFlows(flowsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFlows(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleDeleteFlow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chatbot flow?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchFlows();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFlowActive = async (flow: ChatbotFlow) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow/${flow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !flow.isActive,
        }),
      });

      if (res.ok) {
        fetchFlows();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNew = () => {
    router.push('/dashboard/builder/editor');
  };

  const handleLoadFlow = (flow: ChatbotFlow) => {
    router.push(`/dashboard/builder/editor?id=${flow.id}`);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden relative">
        {/* Header Controls Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/75 backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-10">
          <div>
            <h3 className="text-slate-950 font-extrabold text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-emerald-500" />
              Workflow Directory
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">Review, toggle active status, edit, or delete chatbot automation flows.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={fetchFlows}
              className="p-2.5 border border-slate-200 hover:bg-slate-100 rounded-2xl text-slate-500 hover:text-slate-700 transition-all bg-white shadow-sm active:scale-95"
              title="Refresh workflows list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleCreateNew}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Create New Flow
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50/75 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                <th className="px-6 py-4.5">Workflow Name</th>
                <th className="px-6 py-4.5">Trigger Keywords</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold">
              {loadingFlows ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-400 text-xs">Loading flows list...</span>
                    </div>
                  </td>
                </tr>
              ) : flows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-slate-400 italic">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <span>No saved chatbot workflows found. Create one to begin.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{flow.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {flow.triggerKeywords.map((kw, idx) => (
                          <span key={idx} className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Key className="w-2.5 h-2.5" />
                            {kw}
                          </span>
                        ))}
                        {flow.triggerKeywords.length === 0 && (
                          <span className="text-xs text-slate-400 italic font-normal">No triggers</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleFlowActive(flow)}
                        className="flex items-center gap-1.5 transition-all text-xs font-bold text-slate-600 hover:text-slate-800"
                      >
                        {flow.isActive ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide ${flow.isActive ? 'text-emerald-600' : 'text-slate-450'}`}>
                          {flow.isActive ? 'Active' : 'Draft'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleLoadFlow(flow)}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          Edit Canvas
                        </button>
                        <button
                          onClick={() => handleDeleteFlow(flow.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all active:scale-95"
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

    </div>
  );
}
