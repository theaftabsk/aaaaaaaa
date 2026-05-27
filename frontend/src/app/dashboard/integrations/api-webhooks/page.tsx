'use client';

import { Webhook, Copy, KeySquare, CheckCircle2, RotateCcw } from 'lucide-react';

export default function APIWebhooksPage() {
  const apiKey = 'sk_live_vX9zQw2...';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Webhook className="w-5 h-5" />
            </div>
            API & Webhooks
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage API keys and developer webhooks.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <KeySquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Secret API Key</h3>
            <p className="text-sm text-slate-500">Use this key to authenticate with the Vexo CRM API.</p>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input 
              type="password" 
              readOnly 
              value={apiKey} 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 outline-none"
            />
            <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2">
              <Copy className="w-4 h-4" /> <span className="text-sm font-bold hidden sm:inline">Copy</span>
            </button>
            <button className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> <span className="text-sm font-bold hidden sm:inline">Revoke</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Key is active and ready to use
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Webhook className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Custom Webhooks</h3>
        <p className="text-sm text-slate-500 mt-1 mb-6 max-w-md mx-auto">
          Send real-time updates from Vexo CRM to your own servers when a message is received or a contact is created.
        </p>
        <button className="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
          Add Webhook Endpoint
        </button>
      </div>

    </div>
  );
}
