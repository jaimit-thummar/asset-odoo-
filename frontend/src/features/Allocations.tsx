import React, { useState, useEffect } from "react";
import { UserCheck, Laptop, Users, Calendar, ArrowRight, ShieldAlert, Sparkles, FolderDown } from "lucide-react";
import { api, Asset, Employee, AssetAllocation } from "../services/api";

export const Allocations: React.FC = () => {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Allocation Modal toggles
  const [showAllocate, setShowAllocate] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [notes, setNotes] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [allocList, assetList, empList, deptList] = await Promise.all([
        api.fetchAllocations(),
        api.fetchAssets(),
        api.fetchEmployees(),
        api.fetchDepartments()
      ]);
      setAllocations(allocList);
      setAssets(assetList);
      setEmployees(empList);
      setDepartments(deptList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedEmployeeId) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.allocateAsset({
        asset_id: parseInt(selectedAssetId),
        employee_id: parseInt(selectedEmployeeId),
        expected_return_date: expectedReturn ? new Date(expectedReturn).toISOString() : undefined,
        notes: notes || undefined
      });
      setSuccessMsg("Asset allocated successfully!");
      setShowAllocate(false);
      setSelectedAssetId("");
      setSelectedEmployeeId("");
      setExpectedReturn("");
      setNotes("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to allocate asset.");
    }
  };

  const handleReturn = async (id: number) => {
    try {
      await api.returnAsset(id, "Returned by holder checkin");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getAssetName = (id: number) => {
    const asset = assets.find(a => a.id === id);
    return asset ? `${asset.name} (${asset.asset_tag})` : `Asset ID #${id}`;
  };

  const getEmployeeName = (id?: number) => {
    if (!id) return "";
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : `Employee ID #${id}`;
  };

  const getEmployeeEmail = (id?: number) => {
    if (!id) return "";
    const emp = employees.find(e => e.id === id);
    return emp ? emp.email : "";
  };

  const getDepartmentName = (id?: number) => {
    if (!id) return "";
    const dept = departments.find(d => d.id === id);
    return dept ? dept.name : `Dept ID #${id}`;
  };

  return (
    <div className="space-y-6 font-sans p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white Outfit">Asset Allocation</h1>
          <p className="text-slate-400 text-xs mt-1">Track physical custody logs and handovers</p>
        </div>

        <button
          onClick={() => setShowAllocate(true)}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-600/10"
        >
          <UserCheck className="w-4 h-4" />
          <span>Allocate Asset</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array(2).fill(null).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-205/50 dark:border-slate-805 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205/50 dark:border-slate-805">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-bold text-slate-450 uppercase tracking-wider">
                  <th className="p-4">Assigned Asset</th>
                  <th className="p-4">Staff Custody</th>
                  <th className="p-4">Allocation Date</th>
                  <th className="p-4">Expected Return</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-350">
                {allocations.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 flex items-center space-x-2">
                      <Laptop className="w-4 h-4 text-slate-400" />
                      <span>{getAssetName(a.asset_id)}</span>
                    </td>
                    <td className="p-4">
                      {a.employee_id ? (
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-205">{getEmployeeName(a.employee_id)}</p>
                          <span className="text-[10px] text-slate-400">{getEmployeeEmail(a.employee_id)}</span>
                        </div>
                      ) : a.department_id ? (
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-205">Department Scope</p>
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{getDepartmentName(a.department_id)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unspecified Target</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(a.allocated_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-500">
                      {a.expected_return_date ? new Date(a.expected_return_date).toLocaleDateString() : "Rolling"}
                    </td>
                    <td className="p-4 max-w-xs truncate text-slate-400 font-normal">
                      {a.notes || "—"}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        a.status === "active" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" :
                        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {a.status === "active" ? (
                        <button
                          onClick={() => handleReturn(a.id)}
                          className="text-[11px] font-bold text-accent-600 dark:text-accent-400 hover:underline px-3 py-1 bg-accent-100/50 dark:bg-accent-950/20 rounded-lg"
                        >
                          Return Asset
                        </button>
                      ) : (
                        <span className="text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}

                {allocations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No active device checkouts found in log registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocate Modal overlay */}
      {showAllocate && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            <h2 className="text-base font-bold Outfit text-slate-800 dark:text-white mb-4">Allocate Operational Asset</h2>
            
            {errorMsg && (
              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-500 text-xs rounded-xl mb-4 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAllocate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Select Available Device *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.filter(a => a.status === "Available").map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Assign to Employee *</label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Expected return date</label>
                <input
                  type="date"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Checkout allocation notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  rows={3}
                  placeholder="Special instructions or physical handover condition..."
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAllocate(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all"
                >
                  Allocate Custody
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
