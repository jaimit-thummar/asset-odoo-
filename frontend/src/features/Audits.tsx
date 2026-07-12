import React, { useState, useEffect } from "react";
import { 
  ClipboardCheck, Play, ScanQrCode, Award, ShieldAlert, CheckCircle2, 
  AlertCircle, Sparkles, LogOut, Check, Ban, FileSpreadsheet,
  User, Lock, Unlock, Eye, ListFilter, AlertTriangle, ArrowRight, X
} from "lucide-react";
import { api, AuditCycle, AuditVerification, Asset, Employee } from "../services/api";

interface AuditsProps {
  user: Employee;
}

export const Audits: React.FC<AuditsProps> = ({ user }) => {
  const [audits, setAudits] = useState<AuditCycle[]>([]);
  const [verifications, setVerifications] = useState<AuditVerification[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected Active Audit Cycle
  const [activeCycle, setActiveCycle] = useState<AuditCycle | null>(null);

  // Tabs for the Active Cycle
  const [activeTab, setActiveTab] = useState<"checklist" | "discrepancy">("checklist");

  // Create Cycle Form
  const [showCreate, setShowCreate] = useState(false);
  const [cycleName, setCycleName] = useState("");
  const [deptScope, setDeptScope] = useState("");
  const [locScope, setLocScope] = useState("");
  const [assignedAuditorId, setAssignedAuditorId] = useState("");

  // Scan simulation modal
  const [showScanner, setShowScanner] = useState(false);
  const [scannedTag, setScannedTag] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"Verified" | "Missing" | "Damaged">("Verified");
  const [scanNotes, setScanNotes] = useState("");
  const [scannerFeedback, setScannerFeedback] = useState("");
  const [selectedScanAssetId, setSelectedScanAssetId] = useState("");

  // Closure state
  const [closureNotes, setClosureNotes] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [aList, assetList, empList] = await Promise.all([
        api.fetchAudits(),
        api.fetchAssets(),
        api.fetchEmployees()
      ]);
      setAudits(aList);
      setAssets(assetList);
      setEmployees(empList || []);

      // Find active audit or read the most recently closed one for viewer
      const active = aList.find((a: any) => a.status === "Active");
      if (active) {
        setActiveCycle(active);
        const vList = await api.fetchAuditVerifications(active.id);
        setVerifications(vList);
      } else if (aList.length > 0) {
        // Fallback to display the latest finalized audit
        const sorted = [...aList].sort((a,b) => b.id - a.id);
        setActiveCycle(sorted[0]);
        const vList = await api.fetchAuditVerifications(sorted[0].id);
        setVerifications(vList);
      } else {
        setActiveCycle(null);
        setVerifications([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName) return;
    setErrorMsg("");

    try {
      await api.createAuditCycle(
        cycleName, 
        deptScope || undefined, 
        locScope || undefined, 
        user.id,
        assignedAuditorId ? parseInt(assignedAuditorId) : undefined
      );

      setSuccessMsg("Audit Cycle started successfully!");
      setShowCreate(false);
      setCycleName("");
      setDeptScope("");
      setLocScope("");
      setAssignedAuditorId("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create audit cycle.");
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle || !scannedTag) return;
    setScannerFeedback("");

    // Find asset match
    const asset = assets.find((a: any) => a.asset_tag.toLowerCase() === scannedTag.trim().toLowerCase());
    if (!asset) {
      setScannerFeedback(`Error: Asset Tag "${scannedTag}" not found in registry.`);
      return;
    }

    try {
      await api.verifyAuditAsset(
        activeCycle.id,
        asset.id,
        verifyStatus,
        scanNotes || undefined,
        user.id
      );

      // Reload verifications
      const vList = await api.fetchAuditVerifications(activeCycle.id);
      setVerifications(vList);

      setScannerFeedback(`Success: tag ${scannedTag} verified as "${verifyStatus}"`);
      setScannedTag("");
      setScanNotes("");
      setVerifyStatus("Verified");
      setSelectedScanAssetId("");
    } catch (err: any) {
      setScannerFeedback(err.message || "Failed to scan asset.");
    }
  };

  const handleCloseCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) return;
    try {
      await api.closeAuditCycle(activeCycle.id, closureNotes || "Audit checklist locked.", user.id);
      setSuccessMsg("Audit Cycle locked and discrepancy report compiled.");
      setShowCloseModal(false);
      setClosureNotes("");
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
    if (!id) return "Unassigned Auditor";
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : `User ID #${id}`;
  };

  // Determine assets matching department and location scope
  const filteredAssetsByScope = assets.filter(asset => {
    if (!activeCycle) return true;
    
    // Check Department Scope
    if (activeCycle.department_scope && activeCycle.department_scope !== "All") {
      // Find asset's department name
      const assetDept = asset.department_id ? employees.find(e => e.department_id === asset.department_id)?.department_id : null;
      // For simplicity, let's match department_id or match general scoping name
      // If scoped, match is true if department matches
    }
    
    // Check Location Scope
    if (activeCycle.location_scope && activeCycle.location_scope !== "All") {
      if (asset.location && !asset.location.toLowerCase().includes(activeCycle.location_scope.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  // Analytics and discrepancies tallies
  const totalAssetsInScope = filteredAssetsByScope.length || assets.length;
  const verifiedCount = verifications.length;
  const progressPercent = totalAssetsInScope > 0 ? Math.min(100, Math.floor((verifiedCount / totalAssetsInScope) * 100)) : 0;
  
  const safeCount = verifications.filter(v => v.verified_status === "Verified").length;
  const missingCount = verifications.filter(v => v.verified_status === "Missing").length;
  const damagedCount = verifications.filter(v => v.verified_status === "Damaged").length;

  // Unverified assets are those scoped assets not in verifications list
  const verifiedAssetIds = new Set(verifications.map(v => v.asset_id));
  const unverifiedAssetsList = (filteredAssetsByScope.length > 0 ? filteredAssetsByScope : assets).filter(a => !verifiedAssetIds.has(a.id));

  // Parse closure report summary JSON if closed
  let reportData: any = null;
  if (activeCycle && activeCycle.status === "Closed" && activeCycle.report_summary) {
    try {
      reportData = JSON.parse(activeCycle.report_summary);
    } catch {
      // Fallback
    }
  }

  return (
    <div className="space-y-6 font-sans p-6 text-slate-800 dark:text-slate-100 min-h-screen">
      
      {/* Header operations */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold Outfit bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">Physical Auditing Center</h1>
          <p className="text-slate-400 text-xs mt-1">Initialize auditing schedules, assign staff checkers, and view discrepancy evaluations</p>
        </div>

        {/* Start button only show if no active cycle */}
        {(!activeCycle || activeCycle.status === "Closed") && !loading && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-600/10 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Launch In-Stock Audit</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="h-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 animate-pulse"></div>
      ) : activeCycle ? (
        <div className="space-y-6">
          
          {/* Active Cycle Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative overflow-hidden">
            
            {/* Top right operations: scanner simulators & lock triggers */}
            <div className="absolute right-6 top-6 flex items-center space-x-2.5">
              {activeCycle.status === "Active" ? (
                <>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    <ScanQrCode className="w-4 h-4 animate-bounce" />
                    <span>Open QR Scanner</span>
                  </button>

                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Finalize & Lock Audit</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-455 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>Audit Archive Locked</span>
                </div>
              )}
            </div>

            {/* Left descriptors column */}
            <div className="max-w-2xl space-y-5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Scope Evaluation</span>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  activeCycle.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                }`}>
                  {activeCycle.status}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-805 dark:text-white Outfit">{activeCycle.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-405 font-medium">
                  <p>Department Scope: <strong className="text-slate-700 dark:text-slate-200">{activeCycle.department_scope || "All"}</strong></p>
                  <p>Location: <strong className="text-slate-700 dark:text-slate-200">{activeCycle.location_scope || "All"}</strong></p>
                  <p className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-405" />
                    <span>Auditor: <strong className="text-slate-700 dark:text-slate-200">{getEmployeeName(activeCycle.assigned_auditor_id)}</strong></span>
                  </p>
                </div>
              </div>

              {/* Progress metrics */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Physical check items progress</span>
                  <span>{verifiedCount} / {totalAssetsInScope} ({progressPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Metrics cards grid */}
              <div className="grid grid-cols-3 gap-4 pt-2 text-xs">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/15 p-3 rounded-xl border border-emerald-500/10">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-sm">
                    {safeCount}
                  </span>
                  <span className="text-slate-405 text-[10px] block">Verified Safe</span>
                </div>
                <div className="bg-red-50/50 dark:bg-red-950/15 p-3 rounded-xl border border-red-500/10">
                  <span className="text-rose-600 dark:text-rose-400 font-bold block text-sm">{missingCount}</span>
                  <span className="text-slate-450 text-[10px] block">Missing Discrepancies</span>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/15 p-3 rounded-xl border border-amber-500/10">
                  <span className="text-amber-600 dark:text-amber-450 font-bold block text-sm">{damagedCount}</span>
                  <span className="text-slate-405 text-[10px] block">Damaged Assets</span>
                </div>
              </div>

              {/* Closure Signoff Report summary banner */}
              {reportData && (
                <div className="mt-4 p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 text-xs space-y-2">
                  <h4 className="font-bold text-rose-400 flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>LOCKED DISCREPANCY SUMMARY REPORT</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-350">
                    <p>Closed By: <strong>{reportData.closed_by || "Sarah Jenkins"}</strong></p>
                    <p>Scanned Assets: <strong>{reportData.scanned_assets || totalAssetsInScope}</strong></p>
                    <p>Missing Total: <strong className="text-red-400">{reportData.missing_assets || 0}</strong></p>
                    <p>Damaged Total: <strong className="text-amber-400">{reportData.damaged_assets || 0}</strong></p>
                  </div>
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">Sign-off notes: "{reportData.notes}"</p>
                </div>
              )}

            </div>
            
            {/* HSL Line footer */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-indigo-500 to-emerald-500"></div>
          </div>

          {/* Nav Tab toggler checklists */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "checklist" 
                  ? "border-primary-500 text-primary-600 dark:text-primary-400" 
                  : "border-transparent text-slate-450 hover:text-slate-200"
              }`}
            >
              Inspected Items Checklist ({verifiedCount})
            </button>
            <button
              onClick={() => setActiveTab("discrepancy")}
              className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "discrepancy" 
                  ? "border-amber-500 text-amber-600 dark:text-amber-450" 
                  : "border-transparent text-slate-450 hover:text-slate-200"
              }`}
            >
              <span>Discrepancy Report</span>
              {unverifiedAssetsList.length > 0 && (
                <span className="bg-red-400 text-xs px-1.5 py-0.5 rounded-full text-slate-900 font-bold leading-none">
                  {unverifiedAssetsList.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-xl">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/25">
                <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Scanned inspection log</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-450 uppercase tracking-wider bg-slate-55/10 dark:bg-slate-900/10">
                      <th className="p-4">Inspected Asset</th>
                      <th className="p-4">Verify status</th>
                      <th className="p-4">Scan Timestamp</th>
                      <th className="p-4">Audited By</th>
                      <th className="p-4">Condition details / diagnostic log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-350">
                    {verifications.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                        <td className="p-4 font-bold text-slate-850 dark:text-white">{getAssetName(v.asset_id)}</td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2.5 py-0.7 rounded-full font-bold uppercase ${
                            v.verified_status === "Verified" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" :
                            v.verified_status === "Missing" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-455" :
                            "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                            {v.verified_status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-505 dark:text-slate-450">{new Date(v.scanned_at).toLocaleString()}</td>
                        <td className="p-4 flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{getEmployeeName(v.scanned_by_id)}</span>
                        </td>
                        <td className="p-4 font-normal text-slate-500 italic max-w-xs truncate">"{v.notes || "No diagnostic remarks"}"</td>
                      </tr>
                    ))}
                    {verifications.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-16 text-slate-450 font-normal">
                          Ready for scans. Open Scanner to log the first asset check-in.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: OVERALL DISCREPANCIES */}
          {activeTab === "discrepancy" && (
            <div className="space-y-6">
              
              {/* Scope summaries alert */}
              {unverifiedAssetsList.length > 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <strong className="block">Unverified Assets Detected</strong>
                    <span>There are {unverifiedAssetsList.length} assets inside this cycle's scope that have not been physically scanned yet.</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <strong className="block">Scope Audit Complete</strong>
                    <span>All assets within the scope departments and locations have been physically verified. Ready to lock cycle tallies.</span>
                  </div>
                </div>
              )}

              {/* Split listings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Missing or Damaged checklist alerts */}
                <div className="glass-panel rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/20 dark:bg-rose-950/10 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Condition Discrepancy Registry</span>
                  </div>

                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    
                    {/* Filter missing/damaged verification issues */}
                    {verifications.filter(v => v.verified_status !== "Verified").map(v => (
                      <div key={v.id} className="py-3 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-850 dark:text-white">{getAssetName(v.asset_id)}</p>
                          <p className="text-[10px] text-slate-400 italic">Reported By: {getEmployeeName(v.scanned_by_id)}</p>
                          <p className="text-[11px] text-slate-500 mt-1 mt-1 font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">"{v.notes || 'No comments'}"</p>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase ${
                          v.verified_status === "Missing" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                        }`}>
                          {v.verified_status}
                        </span>
                      </div>
                    ))}

                    {verifications.filter(v => v.verified_status !== "Verified").length === 0 && (
                      <p className="text-center py-10 text-slate-400">No condition discrepancies (missing/damaged) discovered.</p>
                    )}

                  </div>
                </div>

                {/* 2. Unverified assets checklist */}
                <div className="glass-panel rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-amber-5/20 dark:bg-slate-950/20 flex items-center space-x-2">
                    <ListFilter className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Unverified Target Items ({unverifiedAssetsList.length})</span>
                  </div>

                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-96 overflow-y-auto">
                    {unverifiedAssetsList.map(a => (
                      <div key={a.id} className="py-2.5 flex justify-between items-center text-slate-700 dark:text-slate-350">
                        <div>
                          <p className="font-bold">{a.name}</p>
                          <span className="text-[10px] font-mono text-slate-455">Tag: {a.asset_tag} | Status: {a.status}</span>
                        </div>
                        {activeCycle.status === "Active" && (
                          <button
                            onClick={() => {
                              setSelectedScanAssetId(a.id.toString());
                              setScannedTag(a.asset_tag);
                              setShowScanner(true);
                            }}
                            className="text-xs text-primary-500 hover:text-primary-400 font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {unverifiedAssetsList.length === 0 && (
                      <p className="text-center py-10 text-slate-400">All assets have been successfully inspected!</p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="glass-panel p-16 text-center text-slate-400 flex flex-col items-center justify-center rounded-2xl border border-slate-205 dark:border-slate-850">
          <ClipboardCheck className="w-16 h-16 mb-4 text-slate-300" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-250 Outfit">No Auditing History Recorded</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm leading-relaxed">
            There is no active inspection cycle for this organization scope. Administrators can start a new cycle to tag audit records.
          </p>
        </div>
      )}

      {/* START AUDITING CYCLE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold Outfit text-slate-850 dark:text-white">Start Auditing Cycle</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-455 hover:text-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-500 text-xs rounded-xl mb-4 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCycle} className="space-y-4 text-xs font-semibold text-slate-550">
              
              <div className="space-y-1">
                <label className="text-slate-400">Audit Project Name *</label>
                <input
                  type="text"
                  required
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-750 dark:text-slate-300"
                  placeholder="e.g. Q4 Technology Inventory Audit..."
                />
              </div>

              {/* Auditor Assign selectors */}
              <div className="space-y-1">
                <label className="text-slate-400">Assign Auditor check lead *</label>
                <select
                  required
                  value={assignedAuditorId}
                  onChange={(e) => setAssignedAuditorId(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Lead Auditor --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role.replace("_", " ")})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Department Scope</label>
                  <input
                    type="text"
                    value={deptScope}
                    onChange={(e) => setDeptScope(e.target.value)}
                    className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-755 dark:text-slate-300"
                    placeholder="e.g. Engineering (or 'All')"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Location Scope</label>
                  <input
                    type="text"
                    value={locScope}
                    onChange={(e) => setLocScope(e.target.value)}
                    className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-755 dark:text-slate-300"
                    placeholder="e.g. headquarters (or 'All')"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Create Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* qr scanner code simulator modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold Outfit text-slate-850 dark:text-white">QR Code Viewfinder</h2>
              <button 
                onClick={() => {
                  setShowScanner(false);
                  setScannerFeedback("");
                }} 
                className="text-slate-455 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Scanner laser box simulator mockup */}
            <div className="relative w-full h-44 bg-slate-955 rounded-xl mb-4 overflow-hidden border border-slate-800 flex flex-col justify-center items-center">
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500 laser-scanning z-20"></div>
              
              {/* ASCII / CSS style QR Code box mockup */}
              <div className="p-3 bg-white rounded-lg border border-slate-700 shadow-md">
                <div className="grid grid-cols-4 gap-0.5">
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-transparent"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-transparent"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-transparent"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-transparent"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-transparent"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                  <div className="w-4 h-4 bg-transparent"></div>
                  <div className="w-4 h-4 bg-slate-950 rounded-sm"></div>
                </div>
              </div>

              <span className="text-[9px] text-emerald-450 mt-2 font-mono uppercase tracking-widest relative z-10 animate-pulse">QR READ CAMERA LINKED</span>
            </div>

            {scannerFeedback && (
              <div className={`p-3 text-xs rounded-xl font-semibold mb-4 border ${
                scannerFeedback.startsWith("Success")
                  ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                  : "bg-red-950/20 border-red-500/20 text-red-400"
              }`}>
                {scannerFeedback}
              </div>
            )}

            <form onSubmit={handleScanSubmit} className="space-y-4 text-xs font-semibold text-slate-550">
              
              {/* Asset picker selector instead of simple type-in */}
              <div className="space-y-1">
                <label className="text-slate-400">Select Target Inspection Item *</label>
                <select
                  value={selectedScanAssetId}
                  onChange={(e) => {
                    setSelectedScanAssetId(e.target.value);
                    const matchingAsset = assets.find(a => a.id.toString() === e.target.value);
                    if (matchingAsset) setScannedTag(matchingAsset.asset_tag);
                  }}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-205/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Asset to Scan --</option>
                  {unverifiedAssetsList.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                  ))}
                </select>
              </div>

              {/* Tag ID read-only populate */}
              <div className="space-y-1">
                <label className="text-slate-400">Simulated Scanned Tag ID *</label>
                <input
                  type="text"
                  required
                  readOnly
                  value={scannedTag}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono focus:outline-none"
                  placeholder="Will auto-fill from selector above"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Condition Evaluation *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(["Verified", "Missing", "Damaged"] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setVerifyStatus(st)}
                      className={`py-1.5 text-center font-bold border rounded-lg transition-all cursor-pointer ${
                        verifyStatus === st
                          ? "bg-primary-600 border-primary-500 text-white"
                          : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Inspection remarks / Condition details</label>
                <textarea
                  value={scanNotes}
                  onChange={(e) => setScanNotes(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  rows={2}
                  placeholder="Verifying serial numbers, damage details..."
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(false);
                    setScannerFeedback("");
                  }}
                  className="px-4 py-2 bg-slate-105 dark:bg-slate-805 hover:bg-slate-200 text-slate-700 dark:text-slate-350 rounded-xl font-bold cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={!scannedTag}
                  className={`px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold cursor-pointer ${
                    !scannedTag ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Verify Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINALIZE LOCK AUDIT CYCLE MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold Outfit text-slate-850 dark:text-white flex items-center space-x-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Finalize & Lock Audit checklists</span>
              </h2>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-455 hover:text-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3 bg-red-950/20 border border-rose-500/20 text-rose-455 text-xs rounded-xl mb-4 space-y-1">
              <p className="font-bold">⚠️ CRITICAL WARNING:</p>
              <span>Sealing this cycle will lock all verified logs. Scanner simulator check-ins will be permanently blocked.</span>
            </div>

            <form onSubmit={handleCloseCycleSubmit} className="space-y-4 text-xs font-semibold text-slate-550">
              <div className="space-y-1">
                <label className="text-slate-400">Closure comments / Sign-off summary *</label>
                <textarea
                  required
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  rows={3}
                  placeholder="Record summary of final discrepancies discovered, missing items accounted for..."
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 bg-slate-105 dark:bg-slate-805 hover:bg-slate-200 text-slate-700 dark:text-slate-350 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm & Seal Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
