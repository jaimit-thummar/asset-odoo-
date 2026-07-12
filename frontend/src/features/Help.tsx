import React from "react";
import { BookOpen, Shield, ClipboardCheck, ArrowLeftRight, CheckCircle2 } from "lucide-react";

export const Help: React.FC = () => {
  return (
    <div className="space-y-6 font-sans p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold dark:text-white Outfit">Documentation Portal</h1>
        <p className="text-slate-400 text-xs mt-1">Operational user guides and RBAC clearance definitions</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-205/50 dark:border-slate-805 space-y-6">
        {/* Intro */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-primary-500" />
            <span>Platform Overview</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            AssetFlow Pro is a integrated SaaS ERP designed to manages physical corporate items, employee allocation checkouts, room calendars, damage tickets, and webcam/QR scan auditing loops.
          </p>
        </div>

        {/* Roles Matrix */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Access Control Matrix (RBAC)</span>
          </h3>
          
          <div className="border border-slate-200/50 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3">Role</th>
                  <th className="p-3">Allocations</th>
                  <th className="p-3">Transfers</th>
                  <th className="p-3">Audits</th>
                  <th className="p-3">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">Admin</td>
                  <td className="p-3">Manage all</td>
                  <td className="p-3">Full Override</td>
                  <td className="p-3">Create & Close</td>
                  <td className="p-3">Manage All</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-805 dark:text-slate-200">Asset Manager</td>
                  <td className="p-3">Manage all</td>
                  <td className="p-3">Sign off (Level 2)</td>
                  <td className="p-3">Inspect tags</td>
                  <td className="p-3">Read-only</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-805 dark:text-slate-200">Department Head</td>
                  <td className="p-3">Read-only</td>
                  <td className="p-3">Approve (Level 1)</td>
                  <td className="p-3">Read-only</td>
                  <td className="p-3">None</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-805 dark:text-slate-200">Employee</td>
                  <td className="p-3">My Custody</td>
                  <td className="p-3">File requests</td>
                  <td className="p-3">None</td>
                  <td className="p-3">None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Instructions */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center space-x-1.5">
            <ClipboardCheck className="w-4 h-4 text-purple-500" />
            <span>How to Conduct Audits Checklist</span>
          </h3>
          <ul className="list-disc pl-5 text-xs text-slate-500 space-y-2 leading-relaxed font-medium">
            <li>
              <strong>Initiate Project:</strong> Administrators click "Start Audit Cycle" to specify department filters.
            </li>
            <li>
              <strong>Scan tags:</strong> Asset managers use the "Simulate QR Tag Scan" viewfinder mockup, entering tag IDs (like AST-1001, AST-1002) and selecting tags conditions.
            </li>
            <li>
              <strong>Lock Records:</strong> Once all active items are verified, click "Close Cycle" to compute metrics reports.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
