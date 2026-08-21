import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Platform configuration and preferences.</p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center">
        <SettingsIcon size={40} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Settings panel coming soon</p>
      </div>
    </div>
  );
}
