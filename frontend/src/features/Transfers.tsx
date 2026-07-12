import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Laptop, Calendar, Users, HelpCircle, ShieldAlert, Check, X, ShieldCheck } from "lucide-react";
import { api, Asset, Employee, Department, TransferRequest } from "../services/api";

interface TransfersProps {
  user: Employee;
}

export const Transfers: React.FC<TransfersProps> = ({ user }) => {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Transfer Submit Toggles
  const [showRequest, setShowRequest] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [targetDeptId, setTargetDeptId] = useState("");
  const [targetEmpId, setTargetEmpId] = useState("");
  
  // Approval Actions Modal
  const [reviewItem, setReviewItem] = useState<TransferRequest | null>(null);
  const [approvedRating, setApprovedRating] = useState<boolean | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [transferList, assetList, deptList, empList] = await Promise.all([
        api.fetchTransfers(),
        api.fetchAssets(),
        api.fetchDepartments(),
        api.fetchEmployees()
      ]);
      setTransfers(transferList);
      setAssets(assetList);
      setDepts(deptList);
      setEmployees(empList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !targetDeptId || !targetEmpId) return;
    setErrorMsg("");

    try {
      await api.requestTransfer(
        parseInt(selectedAssetId),
        parseInt(targetDeptId),
        parseInt(targetEmpId),
        user.id
      );
      setShowRequest(false);
      setSelectedAssetId("");
      setTargetDeptId("");
      setTargetEmpId("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit request.");
    }
  };

  const handleReviewAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem || approvedRating === null) return;

    try {
      await api.approveTransfer(
        reviewItem.id,
        approvedRating,
        approvalNotes,
        user.id,
        user.role
      );
      setReviewItem(null);
      setApprovedRating(null);
      setApprovalNotes("");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getAssetName = (id: number) => {
    const asset = assets.find(a => a.id === id);
    return asset ? `${asset.name} (${asset.asset_tag})` : `Asset ID #${id}`;
  };

  const getEmployeeName = (id: number) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : `Employee ID #${id}`;
  };

  const getDeptName = (id: number) => {
    const d = depts.find(dept => dept.id === id);
    return d ? d.name : `Dept ID #${id}`;
  };

  return (
    <div className="space-y-6 font-sans p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white Outfit">Transfer Workflow</h1>
          <p className="text-slate-400 text-xs mt-1">Inter-departmental and personnel asset handovers</p>
        </div>

        <button
          onClick={() => setShowRequest(true)}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-600/10"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Request Transfer</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-205/50 dark:border-slate-805 animate-pulse"></div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205/50 dark:border-slate-805">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-bold text-slate-450 uppercase tracking-wider">
                  <th className="p-4">Requested Asset</th>
                  <th className="p-4">Assigned Holder</th>
                  <th className="p-4">Transfer Target</th>
                  <th className="p-4">Status & Level</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-350">
                {transfers.map(t => {
                  // Determine if active user can sign off this request
                  const canDeptHeadApprove = user.role === "department_head" && t.status === "Pending_Dept_Head";
                  const canAssetManagerApprove = user.role === "asset_manager" && t.status === "Pending_Asset_Manager";
                  const canAdminApprove = user.role === "admin" && (t.status === "Pending_Dept_Head" || t.status === "Pending_Asset_Manager");
                  const currentSignOffAllowed = canDeptHeadApprove || canAssetManagerApprove || canAdminApprove;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Laptop className="w-4 h-4 text-slate-400" />
                          <span>{getAssetName(t.asset_id)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{getEmployeeName(t.requested_by_id)}</p>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{getEmployeeName(t.target_employee_id)}</p>
                          <span className="text-[10px] text-slate-400">{getDeptName(t.target_department_id)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          t.status === "Approved" ? "bg-emerald-105 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                          t.status === "Rejected" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                          t.status === "Pending_Dept_Head" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                          "bg-blue-105 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {currentSignOffAllowed ? (
                          <button
                            onClick={() => setReviewItem(t)}
                            className="bg-primary-600 hover:bg-primary-500 text-white rounded-lg px-3 py-1 font-semibold text-[11px] transition-all"
                          >
                            Review Request
                          </button>
                        ) : (
                          <span className="text-slate-400">Ready-only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No asset transfer requests found in the inbox.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submission Request Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-6 shadow-2xl relative">
            <h2 className="text-base font-bold Outfit text-slate-800 dark:text-white mb-4">Submit Asset Transfer Request</h2>

            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-500 text-xs rounded-xl mb-4 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRequestTransfer} className="space-y-4 text-xs font-semibold text-slate-550">
              <div className="space-y-1">
                <label className="text-slate-400">Select Allocated Asset *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Assigned Device --</option>
                  {assets.filter(a => a.status === "Allocated").map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Target Department *</label>
                <select
                  required
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Department --</option>
                  {depts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Target Custody Employee *</label>
                <select
                  required
                  value={targetEmpId}
                  onChange={(e) => setTargetEmpId(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Team Member --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRequest(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all"
                >
                  File Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Request Modal Actions */}
      {reviewItem && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            <h2 className="text-base font-bold Outfit text-slate-800 dark:text-white mb-4">Review Transfer Request #({reviewItem.id})</h2>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs space-y-2 mb-4">
              <p className="text-slate-500 font-semibold uppercase text-[10px]">Handover description</p>
              <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                <span>Asset:</span>
                <span className="font-bold">{getAssetName(reviewItem.asset_id)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                <span>Transferred To:</span>
                <span className="font-bold">{getEmployeeName(reviewItem.target_employee_id)} ({getDeptName(reviewItem.target_department_id)})</span>
              </div>
            </div>

            <form onSubmit={handleReviewAction} className="space-y-4 text-xs font-semibold text-slate-550">
              <div className="space-y-1">
                <label className="text-slate-400">Approval Decision *</label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      checked={approvedRating === true}
                      onChange={() => setApprovedRating(true)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-1"><Check className="w-3.5 h-3.5 text-emerald-500" /><span>Approve</span></span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      checked={approvedRating === false}
                      onChange={() => setApprovedRating(false)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-1"><X className="w-3.5 h-3.5 text-red-500" /><span>Reject</span></span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Approval Comments / Rejection Reason</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  rows={3}
                  placeholder="Approve signoff or type rejection context..."
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-205 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approvedRating === null}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
