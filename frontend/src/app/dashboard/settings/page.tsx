'use client';

export default function GeneralSettingsPage() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">General Settings</h2>
        <p className="text-sm text-slate-500">Manage your basic workspace preferences.</p>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <p>General settings will go here (Workspace Name, Timezone, etc.)</p>
        </div>
      </div>
    </div>
  );
}
