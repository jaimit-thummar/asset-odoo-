import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, Key } from "lucide-react";

export const Settings: React.FC = () => {
  const [dark, setDark] = useState(() => document.body.classList.contains("dark"));
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlert0] = useState(true);
  const [scanSounds, setScanSounds] = useState(false);

  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [dark]);

  return (
    <div className="space-y-6 font-sans p-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white Outfit">System Settings</h1>
        <p className="text-slate-400 text-xs mt-1">Configure your dashboard interface and authorization settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visual Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center space-x-2">
            <span>Visual Customization</span>
          </h3>

          <div className="flex justify-between items-center text-xs">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-205">Dark Mode Backdrop</p>
              <span className="text-slate-400 text-[10px]">Enable low contrast dark environment theme</span>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-xl bg-slate-105 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-350 transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Notif Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center space-x-2">
            <Bell className="w-4 h-4 text-primary-500" />
            <span>Alert Preferences</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-205">Email Alerts</p>
                <span className="text-slate-400 text-[10px]">Receive checkin and checkout notification receipts</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-205">Push Desktop Notifications</p>
                <span className="text-slate-400 text-[10px]">Realtime sound alerts for transfer requests</span>
              </div>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlert0(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-205">Scan Confirmation Tone</p>
                <span className="text-slate-400 text-[10px]">Play synthetic chime on QR scanner tag detection</span>
              </div>
              <input
                type="checkbox"
                checked={scanSounds}
                onChange={(e) => setScanSounds(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
            </label>
          </div>
        </div>

        {/* Security Profile Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Identity & Token Signatures</span>
          </h3>

          <div className="text-xs text-slate-400 leading-relaxed space-y-2">
            <p>
              Your session token signature check has active RBAC restrictions. Under regular operations, your browser holds encrypted JWT secrets to make API calls to the core backend.
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-950 font-mono text-[10px] rounded-lg word-break-all text-slate-600 dark:text-slate-400 max-w-lg">
              JWT_SECRET: super-secured-enterprise-secret-key-328957239
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
