import React, { useState, useEffect } from "react";
import { 
  Wrench, Plus, Hammer, AlertTriangle, CheckCircle, ShieldAlert, 
  BadgeInfo, Upload, Image as ImageIcon, X, Trash2, Clock, 
  TrendingUp, Activity, CheckSquare, XCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { api, Asset, Employee, MaintenanceIssue } from "../services/api";

interface MaintenanceProps {
  user: Employee;
}

export const Maintenance: React.FC<MaintenanceProps> = ({ user }) => {
  const [maintenance, setMaintenance] = useState<MaintenanceIssue[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  // File ticket modal
  const [showReport, setShowReport] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  
  // Photo upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  // Update Status variables (Step-based review)
  const [reviewItem, setReviewItem] = useState<MaintenanceIssue | null>(null);
  const [techAssigned, setTechAssigned] = useState("");
  const [resNotes, setResNotes] = useState("");
  const [newStatus, setNewStatus] = useState<"Approved" | "In_Progress" | "Resolved" | "Rejected">("Approved");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, assetList] = await Promise.all([
        api.fetchMaintenance(),
        api.fetchAssets()
      ]);
      setMaintenance(mList);
      setAssets(assetList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle image upload from file select
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMsg("");
    try {
      const res = await api.uploadFile(file);
      setPhotoUrl(res.file_url);
    } catch (err) {
      setErrorMsg("Failed to upload image. Falling back to local URL.");
      setPhotoUrl(URL.createObjectURL(file));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !title || !desc) return;
    setErrorMsg("");

    try {
      await api.reportMaintenance(
        parseInt(selectedAssetId),
        title,
        desc,
        priority,
        user.id,
        photoUrl || undefined
      );

      setSuccessMsg("Maintenance issue reported successfully!");
      setShowReport(false);
      setSelectedAssetId("");
      setTitle("");
      setDesc("");
      setPriority("Medium");
      setPhotoUrl("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log maintenance issue.");
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;

    // Validation: technician name required when progressing or resolving ticket
    if ((newStatus === "In_Progress" || newStatus === "Resolved") && !techAssigned.trim()) {
      setErrorMsg("Technician name is required when setting status to In Progress or Resolved.");
      return;
    }

    setErrorMsg("");
    try {
      await api.updateMaintenanceStatus(
        reviewItem.id,
        newStatus,
        techAssigned || "",
        resNotes || "",
        user.id
      );

      if (newStatus === "Resolved") {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.65 }
        });
      }

      setSuccessMsg(`Ticket status updated to ${newStatus}`);
      setReviewItem(null);
      setTechAssigned("");
      setResNotes("");
      setNewStatus("Approved");
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update maintenance ticket status.");
    }
  };

  const getAssetName = (id: number) => {
    const asset = assets.find(a => a.id === id);
    return asset ? `${asset.name} (${asset.asset_tag})` : `Asset ID #${id}`;
  };

  // Compile Analytics summary stats
  const totalTickets = maintenance.length;
  const pendingCount = maintenance.filter(m => m.status === "Pending").length;
  const inProgressCount = maintenance.filter(m => m.status === "In_Progress" || m.status === "Approved").length;
  const resolvedCount = maintenance.filter(m => m.status === "Resolved").length;
  const rejectedCount = maintenance.filter(m => m.status === "Rejected").length;

  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 100;
  const urgentCount = maintenance.filter(m => m.priority === "Urgent" && m.status !== "Resolved" && m.status !== "Rejected").length;

  return (
    <div className="space-y-6 font-sans p-6 text-slate-800 dark:text-slate-100 min-h-screen">
      
      {/* Header section */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold Outfit bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">Maintenance Hub</h1>
          <p className="text-slate-400 text-xs mt-1">Raise device damage tickets, verify diagnostics, and assign operations technicians</p>
        </div>

        <button
          onClick={() => setShowReport(true)}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-600/10 cursor-pointer"
        >
          <Hammer className="w-4 h-4" />
          <span>Report Asset Fault</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 1. EXPOSE ANALYTICS KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI: Total Tickets */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Faults</span>
            <div className="p-2 bg-primary-500/10 text-primary-500 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold Outfit">{totalTickets}</span>
            <span className="text-[10px] text-slate-400 italic">Historical count</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>
        </div>

        {/* KPI: Pending Requests */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unassigned Inbox</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold Outfit text-amber-500">{pendingCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold">{urgentCount} Urgent Active</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
        </div>

        {/* KPI: In Repair Progress */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">In Repair Progress</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold Outfit text-indigo-500">{inProgressCount}</span>
            <span className="text-[10px] text-slate-400 italic">Technician assigned</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
        </div>

        {/* KPI: Resolution Rate */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Resolution Rate</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold Outfit text-emerald-500">{resolutionRate}%</span>
            <span className="text-[10px] text-slate-400 font-semibold">{resolvedCount} Restored</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        </div>

      </div>

      {/* Grid listing content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 rounded-2xl bg-white dark:bg-slate-900 animate-pulse border border-slate-200"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maintenance.map(m => {
            const isManager = ["admin", "asset_manager"].includes(user.role);
            return (
              <div
                key={m.id}
                className="glass-panel rounded-2xl border border-slate-200/60 dark:border-slate-850 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 shadow-lg relative"
              >
                
                {/* 2. TICKET IMAGE BANNER DISPLAY */}
                {m.photo_url ? (
                  <div className="h-36 w-full relative overflow-hidden">
                    <img 
                      src={m.photo_url.startsWith("http") || m.photo_url.startsWith("/static") || m.photo_url.startsWith("blob:") ? m.photo_url : `http://localhost:8000${m.photo_url}`} 
                      alt="Fault diagnostic capture" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white px-2 py-0.5 rounded bg-slate-900/65 flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Diagnose Photo Attachment</span>
                    </span>
                  </div>
                ) : (
                  <div className="h-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-850 dark:to-slate-800"></div>
                )}

                {/* Card body content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        m.priority === "Urgent" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                        m.priority === "High" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                        "bg-blue-100 text-blue-750 dark:bg-blue-900/40 dark:text-blue-400"
                      }`}>
                        {m.priority} Priority
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        m.status === "Resolved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                        m.status === "Pending" ? "bg-amber-150 text-amber-750 dark:bg-amber-950/40 dark:text-amber-400" :
                        m.status === "Rejected" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                        "bg-indigo-100 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-400"
                      }`}>
                        {m.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{getAssetName(m.asset_id)}</span>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{m.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{m.description}</p>
                    </div>
                  </div>

                  {m.resolution_notes && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-900 text-[11px] text-slate-450 italic mt-2">
                       <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">Resolution sign-off</span>
                       "{m.resolution_notes}"
                    </div>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-450">
                    <span className="flex items-center space-x-1.5">
                      <BadgeInfo className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tech: <strong className="text-slate-700 dark:text-white">{m.technician_assigned || "Unassigned"}</strong></span>
                    </span>

                    {isManager && m.status !== "Resolved" && m.status !== "Rejected" && (
                      <button
                        onClick={() => {
                          setReviewItem(m);
                          setNewStatus(m.status === "Pending" ? "Approved" : (m.status as any));
                          setTechAssigned(m.technician_assigned || "");
                          setResNotes(m.resolution_notes || "");
                        }}
                        className="bg-primary-600 hover:bg-primary-500 text-white rounded-lg px-3 py-1 font-bold text-[11px] transition-all cursor-pointer"
                      >
                        Action Drawer
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}

          {maintenance.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center">
              <ShieldAlert className="w-12 h-12 mb-2 text-slate-350" />
              <span>No active device faults recorded. Everything is operating smoothly.</span>
            </div>
          )}
        </div>
      )}

      {/* FILE MAINTENANCE REQUEST TICKET (WITH IMAGE UPLOPADS) */}
      {showReport && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold Outfit text-slate-850 dark:text-white">Raise Fault diagnostics report</h2>
              <button 
                onClick={() => {
                  setShowReport(false);
                  setPhotoUrl("");
                }} 
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-500 text-xs rounded-xl mb-4 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReportIssue} className="space-y-4 text-xs font-semibold text-slate-550">
              
              <div className="space-y-1">
                <label className="text-slate-400">Select Affected Asset *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-705 dark:text-slate-300"
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Diagnostic Summary Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-750 dark:text-slate-300"
                    placeholder="e.g. Cracked screen, battery drain"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Issue Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-705 dark:text-slate-300"
                  >
                    <option value="Low">Low - Cosmetic</option>
                    <option value="Medium">Medium - Degraded</option>
                    <option value="High">High - Non-functional</option>
                    <option value="Urgent">Urgent - Blocker</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Detailed Description *</label>
                <textarea
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  rows={3}
                  placeholder="Include steps to reproduce or physical damage diagnostics."
                />
              </div>

              {/* 3. PHOTO UPLOAD & PREVIEW */}
              <div className="space-y-2">
                <label className="text-slate-400 block">Attach Diagnostic Photo</label>
                
                {photoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-28 w-full group">
                    <img 
                      src={photoUrl} 
                      alt="Uploaded preview" 
                      className="h-full w-full object-cover" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setPhotoUrl("")}
                      className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-500 p-1 rounded-full text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center space-y-1.5 text-slate-450">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span>{uploadingPhoto ? "Uploading image file..." : "Click or Drag photo file"}</span>
                      <span className="text-[10px] text-slate-350">Supports PNG, JPG (Max 5MB)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReport(false);
                    setPhotoUrl("");
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className={`px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all cursor-pointer ${
                    uploadingPhoto ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Submit Fault Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. WORKFLOW STEP-BASED REVIEW / UPDATE DRAWER */}
      {reviewItem && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold Outfit text-slate-850 dark:text-white">Workflow Operations Drawer</h2>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Ticket ID: #{reviewItem.id} | Priority: {reviewItem.priority}</span>
              </div>
              <button onClick={() => setReviewItem(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs font-semibold text-slate-550">
              
              {/* Asset Target Details */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-900">
                <span className="text-[9px] uppercase font-bold text-slate-400">Target Fault Item</span>
                <p className="font-bold text-sm text-primary-600 dark:text-primary-400">{getAssetName(reviewItem.asset_id)}</p>
                <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">"{reviewItem.title}"</p>
              </div>

              {/* Step states selections */}
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[9px] font-bold">Transition State Step *</label>
                
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Approve */}
                  <button
                    type="button"
                    onClick={() => setNewStatus("Approved")}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newStatus === "Approved" 
                        ? "border-primary-500 bg-primary-500/5 text-primary-600 dark:text-primary-400" 
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="font-bold">Approve</p>
                      <span className="text-[9px] text-slate-400">Triage request</span>
                    </div>
                  </button>

                  {/* Reject */}
                  <button
                    type="button"
                    onClick={() => setNewStatus("Rejected")}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      newStatus === "Rejected" 
                        ? "border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-455" 
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <div>
                      <p className="font-bold">Reject</p>
                      <span className="text-[9px] text-slate-400">False claim</span>
                    </div>
                  </button>

                  {/* In Progress */}
                  <button
                    type="button"
                    onClick={() => setNewStatus("In_Progress")}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      newStatus === "In_Progress" 
                        ? "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400" 
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-bold">In Repair</p>
                      <span className="text-[9px] text-slate-400">Technician working</span>
                    </div>
                  </button>

                  {/* Resolved */}
                  <button
                    type="button"
                    onClick={() => setNewStatus("Resolved")}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      newStatus === "Resolved" 
                        ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="font-bold">Resolved</p>
                      <span className="text-[9px] text-slate-400">Work completed</span>
                    </div>
                  </button>

                </div>
              </div>

              {/* Fields show conditionally depending on step */}
              {newStatus !== "Rejected" && (
                <div className="space-y-1">
                  <label className="text-slate-400">Assign Operations Technician</label>
                  <input
                    type="text"
                    value={techAssigned}
                    onChange={(e) => setTechAssigned(e.target.value)}
                    className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-755 dark:text-slate-300"
                    placeholder="e.g. Acme service team, John Doe Support..."
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-400">{newStatus === "Rejected" ? "Rejection ReasonNotes *" : "Resolution Operations Notes"}</label>
                <textarea
                  required={newStatus === "Rejected"}
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  rows={3}
                  placeholder={newStatus === "Rejected" ? "Please state the reason for rejecting this service request..." : "Specify work checklist completed, parts ordered..."}
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Operations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
