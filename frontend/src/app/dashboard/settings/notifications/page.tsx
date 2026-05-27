'use client';

export default function NotificationsPage() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
        <p className="text-sm text-slate-500">Configure email and push alerts.</p>
      </div>
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <p>Coming Soon</p>
        </div>
      </div>
    </div>
  );
}
