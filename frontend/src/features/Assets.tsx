import React, { useState, useEffect } from "react";
import { 
  Laptop, Search, Plus, Filter, QrCode, Calendar, 
  MapPin, CheckCircle, Wrench, ShieldAlert, Sparkles, Scroll,
  FileText, Upload, Trash2, Edit, ArrowLeft, ExternalLink,
  BookOpen, Clock, DollarSign, Package, UserCheck, AlertTriangle
} from "lucide-react";
import { Asset, Department, Employee } from "../services/api";
import { 
  useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, 
  useAssetHistory, useUploadFile, useDepartments, useEmployees,
  useAllocateAsset, useAllocations, useReturnAsset
} from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export const Assets: React.FC = () => {
  // Page routing state
  const [viewState, setViewState] = useState<"list" | "profile">("list");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  // Auth — use the reactive auth store (not stale localStorage)
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [condition, setCondition] = useState("");
  const [bookable, setBookable] = useState<boolean | undefined>(undefined);
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Form Modals States
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);

  // Current session user role — remove stale localStorage read, auth comes from useAuth above

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    category: "Laptops",
    serial_number: "",
    purchase_cost: 0,
    purchase_date: "",
    warranty_expiration: "",
    condition: "Excellent",
    location: "",
    department_id: "",
    bookable: false,
    description: ""
  });

  // Allocation Form State
  const [allocationType, setAllocationType] = useState<"employee" | "department">("employee");
  const [allocateData, setAllocateData] = useState({
    employee_id: "",
    department_id: "",
    expected_return_date: "",
    notes: ""
  });
  const [showAllocateConfirm, setShowAllocateConfirm] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [activeAllocToReturn, setActiveAllocToReturn] = useState<number | null>(null);

  // Load React Query hooks
  const { data: assets = [], isLoading: assetsLoading } = useAssets({
    search,
    category,
    status,
    bookable
  });
  
  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const { data: allocations = [] } = useAllocations();

  // Mutations
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const allocateMutation = useAllocateAsset();
  const returnAssetMutation = useReturnAsset();
  const uploadMutation = useUploadFile();



  // Filter logic on client to support advanced attributes without excessive queries
  const filteredAssets = React.useMemo(() => {
    return assets.filter((item: Asset) => {
      // Condition check
      if (condition && item.condition !== condition) return false;
      // Cost checks
      if (minCost && item.purchase_cost < parseFloat(minCost)) return false;
      if (maxCost && item.purchase_cost > parseFloat(maxCost)) return false;
      return true;
    });
  }, [assets, condition, minCost, maxCost]);

  // Pagination calculation
  const totalAssetsCount = filteredAssets.length;
  const totalPages = Math.max(1, Math.ceil(totalAssetsCount / pageSize));
  
  // Dynamic offset slices
  const paginatedAssets = React.useMemo(() => {
    return filteredAssets.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
  }, [filteredAssets, page, pageSize]);

  // Reset page when filter shifts
  useEffect(() => {
    setPage(1);
  }, [search, category, status, condition, bookable, minCost, maxCost]);

  // Selected active asset profile details
  const activeAsset = assets.find((a: Asset) => a.id === selectedAssetId);

  // Query Asset Lifecycle timeline
  const { data: historyTimeline = [], isLoading: historyLoading } = useAssetHistory(selectedAssetId || 0);

  const isEditor = me?.role === "admin" || me?.role === "asset_manager";

  // Form submit operations
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Asset Name is required");
    if (formData.purchase_cost < 0) return toast.error("Acquisition cost cannot be negative");
    
    // Check Date logic
    if (formData.purchase_date && formData.warranty_expiration) {
      if (new Date(formData.warranty_expiration) <= new Date(formData.purchase_date)) {
        return toast.error("Warranty must expire after the purchase date");
      }
    }

    createAssetMutation.mutate({
      name: formData.name,
      category: formData.category,
      serial_number: formData.serial_number || undefined,
      purchase_cost: formData.purchase_cost,
      purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : undefined,
      warranty_expiration: formData.warranty_expiration ? new Date(formData.warranty_expiration).toISOString() : undefined,
      condition: formData.condition,
      location: formData.location || undefined,
      department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
      bookable: formData.bookable,
      description: formData.description || undefined
    }, {
      onSuccess: () => {
        setShowCreate(false);
        resetForm();
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    if (!formData.name.trim()) return toast.error("Asset Name is required");
    
    updateAssetMutation.mutate({
      id: selectedAssetId,
      payload: {
        name: formData.name,
        category: formData.category,
        serial_number: formData.serial_number || undefined,
        purchase_cost: formData.purchase_cost,
        purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : undefined,
        warranty_expiration: formData.warranty_expiration ? new Date(formData.warranty_expiration).toISOString() : undefined,
        condition: formData.condition,
        location: formData.location || undefined,
        department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
        bookable: formData.bookable,
        description: formData.description || undefined
      }
    }, {
      onSuccess: () => {
        setShowEdit(false);
      }
    });
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    if (allocationType === "employee" && !allocateData.employee_id) {
      return toast.error("Please pick a target employee");
    }
    if (allocationType === "department" && !allocateData.department_id) {
      return toast.error("Please pick a target department");
    }

    if (allocateData.expected_return_date) {
      const selected = new Date(allocateData.expected_return_date).setHours(0,0,0,0);
      const today = new Date().setHours(0,0,0,0);
      if (selected < today) {
        return toast.error("Allocation return date cannot be in the past");
      }
    }

    setShowAllocateConfirm(true);
  };

  const handleConfirmAllocation = () => {
    if (!selectedAssetId) return;

    allocateMutation.mutate({
      asset_id: selectedAssetId,
      employee_id: allocationType === "employee" ? parseInt(allocateData.employee_id) : undefined,
      department_id: allocationType === "department" ? parseInt(allocateData.department_id) : undefined,
      expected_return_date: allocateData.expected_return_date ? new Date(allocateData.expected_return_date).toISOString() : undefined,
      notes: allocateData.notes || undefined
    }, {
      onSuccess: () => {
        setShowAllocate(false);
        setShowAllocateConfirm(false);
        setAllocateData({ employee_id: "", department_id: "", expected_return_date: "", notes: "" });
      }
    });
  };

  const handleReturnAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAllocToReturn) return;

    returnAssetMutation.mutate({
      allocId: activeAllocToReturn,
      notes: returnNotes || undefined
    }, {
      onSuccess: () => {
        setShowReturnModal(false);
        setReturnNotes("");
        setActiveAllocToReturn(null);
      }
    });
  };

  const handleDeleteTrigger = (id: number) => {
    if (confirm("Are you sure you want to retire and permanently delete this asset registry track? This action cannot be undone.")) {
      deleteAssetMutation.mutate(id, {
        onSuccess: () => {
          setViewState("list");
          setSelectedAssetId(null);
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Laptops",
      serial_number: "",
      purchase_cost: 0,
      purchase_date: "",
      warranty_expiration: "",
      condition: "Excellent",
      location: "",
      department_id: "",
      bookable: false,
      description: ""
    });
  };

  const openEditModal = () => {
    if (!activeAsset) return;
    setFormData({
      name: activeAsset.name,
      category: activeAsset.category,
      serial_number: activeAsset.serial_number || "",
      purchase_cost: activeAsset.purchase_cost,
      purchase_date: activeAsset.purchase_date ? activeAsset.purchase_date.split("T")[0] : "",
      warranty_expiration: activeAsset.warranty_expiration ? activeAsset.warranty_expiration.split("T")[0] : "",
      condition: activeAsset.condition,
      location: activeAsset.location || "",
      department_id: activeAsset.department_id ? activeAsset.department_id.toString() : "",
      bookable: activeAsset.bookable,
      description: activeAsset.description || ""
    });
    setShowEdit(true);
  };

  // QR Code download handler
  const handleQRDownload = async (url: string, assetTag: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objURL = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objURL;
      anchor.download = `QR_CODE_${assetTag}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objURL);
      toast.success("QR Tag downloaded!");
    } catch {
      window.open(url, "_blank");
    }
  };

  // Drag-and-drop / File upload logic
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAssetId) return;

    const loadingToast = toast.loading(`Uploading ${file.name}...`);
    uploadMutation.mutate(file, {
      onSuccess: (res) => {
        toast.dismiss(loadingToast);
        updateAssetMutation.mutate({
          id: selectedAssetId,
          payload: isImage ? { image_url: res.url } : { document_url: res.url }
        }, {
          onSuccess: () => {
            toast.success(`${isImage ? "Image" : "Document"} registered successfully.`);
          }
        });
      },
      onError: (err: any) => {
        toast.dismiss(loadingToast);
        toast.error(err.message || "Upload failed");
      }
    });
  };

  // Category Icon Mapper
  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "laptops":
      case "laptops & computers":
        return <Laptop className="w-5 h-5 text-indigo-500" />;
      case "audio visual":
        return <BookOpen className="w-5 h-5 text-pink-500" />;
      case "vehicles":
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Package className="w-5 h-5 text-emerald-500" />;
    }
  };

  // Calculates Warranty Progress Remaining
  const getWarrantyStats = (purchase?: string, expiration?: string) => {
    if (!purchase || !expiration) return { percent: 100, text: "Lifetime / No warranty limit", color: "bg-emerald-500" };
    
    const start = new Date(purchase).getTime();
    const end = new Date(expiration).getTime();
    const now = Date.now();

    if (now >= end) return { percent: 0, text: "Warranty Expired", color: "bg-rose-500" };
    if (now <= start) return { percent: 100, text: "Active (Yet to commence)", color: "bg-indigo-500" };

    const totalDays = end - start;
    const remainingDays = end - now;
    const percent = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    
    const daysLeft = Math.ceil(remainingDays / (1000 * 60 * 60 * 24));
    let color = "bg-emerald-500";
    if (percent < 25) color = "bg-rose-500";
    else if (percent < 50) color = "bg-amber-500";

    return { percent, text: `${daysLeft} days remaining (${Math.round(percent)}%)`, color };
  };

  return (
    <div className="space-y-6 font-sans p-6 min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* ── VIEW 1: REGISTRY BOARD LIST ────────────────────────────────────────── */}
      {viewState === "list" && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold Outfit tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-350 bg-clip-text text-transparent">
                Asset Registry tagger
              </h1>
              <p className="text-slate-400 text-xs mt-1">Audit, assign, update, and manage hardware assets across organizational hubs</p>
            </div>

            {isEditor && (
              <button
                onClick={() => { resetForm(); setShowCreate(true); }}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/10 active:translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Registry Asset</span>
              </button>
            )}
          </div>

          {/* Filtering Widgets Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Search inputs */}
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tag, device model name, serial numbers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Category selection */}
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="Laptops">Laptops</option>
                <option value="Audio Visual">Audio Visual</option>
                <option value="Furniture">Furniture</option>
                <option value="Vehicles">Vehicles</option>
              </select>
            </div>

            {/* Status selection */}
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Disposed">Disposed</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            {/* Secondary filters tray toggles */}
            <div className="col-span-full border-t border-slate-100 dark:border-slate-850 pt-4 flex flex-wrap gap-4 items-center justify-between text-xs">
              <div className="flex flex-wrap gap-3">
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1"
                >
                  <option value="">All Conditions</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>

                <select
                  value={bookable === undefined ? "" : bookable.toString()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBookable(v === "true" ? true : v === "false" ? false : undefined);
                  }}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1"
                >
                  <option value="">Resource Booking Status</option>
                  <option value="true">Reservable Assets</option>
                  <option value="false">Non-Reservable</option>
                </select>

                {/* Cost range selectors */}
                <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5">
                  <span className="text-slate-400 font-medium">Cost:</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value)}
                    className="w-16 bg-transparent border-none p-0 focus:ring-0 text-[11px]"
                  />
                  <span className="text-slate-350">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                    className="w-16 bg-transparent border-none p-0 focus:ring-0 text-[11px]"
                  />
                </div>
              </div>

              {(search || category || status || condition || bookable !== undefined || minCost || maxCost) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setStatus("");
                    setCondition("");
                    setBookable(undefined);
                    setMinCost("");
                    setMaxCost("");
                  }}
                  className="text-indigo-500 hover:text-indigo-400 font-semibold"
                >
                  Clear All Filters (X)
                </button>
              )}
            </div>
          </div>

          {/* Cards Loading Skeletons */}
          {assetsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 animate-pulse flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Asset Registry Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedAssets.map((asset: Asset) => (
                  <div
                    key={asset.id}
                    onClick={() => { setSelectedAssetId(asset.id); setViewState("profile"); }}
                    className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer flex flex-col justify-between relative group overflow-hidden border border-slate-200/50 dark:border-slate-850 hover:shadow-lg hover:border-indigo-500/20 dark:hover:border-indigo-500/30 transition-all duration-300"
                  >
                    <div>
                      {/* Top bar indicators */}
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          asset.status === "Available" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                          asset.status === "Allocated" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-450" :
                          asset.status === "Maintenance" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                          asset.status === "Lost" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450" :
                          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {asset.status}
                        </span>
                      </div>

                      {/* Header Specs */}
                      <div className="mt-4 space-y-1">
                        <span className="text-[10px] text-indigo-500 block tracking-widest uppercase font-bold">{asset.asset_tag}</span>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors truncate">
                          {asset.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate max-w-[250px]">
                          {asset.description || "No descriptions detailed..."}
                        </p>
                      </div>
                    </div>

                    {/* Meta info footer details */}
                    <div className="border-t border-slate-100 dark:border-slate-850 pt-3.5 mt-5 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="truncate max-w-[120px]">{asset.location || "N/A"}</span>
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-205">
                        ${asset.purchase_cost.toLocaleString()}
                      </span>
                    </div>

                    {/* Bookable Flag Badge indicator */}
                    {asset.bookable && (
                      <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-bl-xl bg-gradient-to-br from-indigo-500 to-pink-500 shadow-md"></div>
                    )}
                  </div>
                ))}

                {/* Empty State Board */}
                {totalAssetsCount === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center justify-center">
                    <ShieldAlert className="w-16 h-16 mb-3 text-slate-300 dark:text-slate-800 animate-bounce" />
                    <h3 className="text-lg font-bold Outfit text-slate-750 dark:text-slate-200">No Asset Elements Found</h3>
                    <p className="text-xs text-slate-450 mt-1 max-w-[305px]">Refine your active search filter parameters or write a new asset tag record card.</p>
                  </div>
                )}
              </div>

              {/* Dynamic Pages Controller pagination */}
              {totalAssetsCount > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-5 mt-4 text-xs font-medium text-slate-400">
                  <div className="flex items-center space-x-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5"
                    >
                      <option value={6}>6 items</option>
                      <option value={12}>12 items</option>
                      <option value={24}>24 items</option>
                    </select>
                    <span>of {totalAssetsCount} tags</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-colors"
                    >
                      Prev
                    </button>
                    <span className="px-3">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── VIEW 2: COMPREHENSIVE ASSET PROFILE PAGE ────────────────────────────── */}
      {viewState === "profile" && activeAsset && (
        <div className="space-y-6">
          {/* Header Action Row */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <button
              onClick={() => { setViewState("list"); setSelectedAssetId(null); }}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-indigo-500 font-semibold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Registry list</span>
            </button>

            <div className="flex flex-wrap gap-2.5">
              {isEditor && (
                <>
                  <button
                    onClick={openEditModal}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs rounded-xl font-semibold transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Registry Spec</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTrigger(activeAsset.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 hover:text-rose-600 text-xs rounded-xl font-semibold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retire From Service</span>
                  </button>
                </>
              )}

              {activeAsset.status === "Available" && isEditor && (
                <button
                  onClick={() => setShowAllocate(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl font-semibold transition-all shadow-md"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign Custody</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Overview Container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column A: Information Panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Asset Header Sheet Card */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
                <div className="space-y-4">
                  <div>
                    <span className="text-indigo-500 font-mono text-[10px] font-bold tracking-widest uppercase block">{activeAsset.asset_tag}</span>
                    <h2 className="text-2xl font-bold Outfit text-slate-850 dark:text-white mt-1 uppercase">{activeAsset.name}</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-lg">{activeAsset.description || "No core descriptions provided for this registry profile."}</p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      activeAsset.status === "Available" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                      activeAsset.status === "Allocated" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" :
                      activeAsset.status === "Maintenance" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                      "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455"
                    }`}>
                      Status: {activeAsset.status}
                    </span>

                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 uppercase">
                      Category: {activeAsset.category}
                    </span>
                  </div>
                </div>

                {/* Display item photo preview if set */}
                {activeAsset.image_url ? (
                  <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-50 flex items-center justify-center relative group">
                    <img 
                      src={activeAsset.image_url} 
                      alt={activeAsset.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity text-[10px] font-semibold">
                      <Upload className="w-4 h-4 mr-1" /> Change
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleAttachmentUpload(e, true)}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="w-full md:w-32 h-32 rounded-xl border border-dashed border-slate-250 dark:border-slate-800 flex flex-col items-center justify-center p-3 text-center text-slate-400 font-sans text-xs hover:border-indigo-500/50 hover:bg-indigo-50/10 transition-all cursor-pointer relative">
                    <Upload className="w-5 h-5 mb-1.5 text-indigo-500" />
                    <span>Upload photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => handleAttachmentUpload(e, true)}
                    />
                  </div>
                )}
              </div>

              {/* Specs parameters Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Condition Matrix</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-white mt-1 block">{activeAsset.condition}</span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Storage Location</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-white mt-1 block truncate">{activeAsset.location || "N/A"}</span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Acquisition Cost</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-white mt-1 block flex items-center">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                    {activeAsset.purchase_cost.toLocaleString()}
                  </span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Serial Identification</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-white mt-1 block font-mono truncate">{activeAsset.serial_number || "N/A"}</span>
                </div>
              </div>

              {/* Active Custodial Assignment Info */}
              {(() => {
                const activeAlloc = allocations.find((al: any) => al.asset_id === activeAsset.id && al.status === "active");
                if (!activeAlloc) return null;

                const assignedEmployee = activeAlloc.employee_id 
                  ? employees.find((e: any) => e.id === activeAlloc.employee_id)
                  : null;
                const assignedDept = activeAlloc.department_id
                  ? departments.find((d: any) => d.id === activeAlloc.department_id)
                  : null;

                return (
                  <div className="glass-panel p-5 rounded-2xl border border-indigo-500/25 dark:border-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-indigo-500 block text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Active Custody Checked-Out</span>
                        </span>
                        <h4 className="text-base font-bold text-slate-800 dark:text-white mt-1">
                          {assignedEmployee 
                            ? `Allocated to Staff: ${assignedEmployee.full_name}`
                            : assignedDept 
                              ? `Allocated to Dept: ${assignedDept.name}`
                              : "Allocated to Custodian"}
                        </h4>
                        {assignedEmployee?.email && (
                          <span className="text-xs text-slate-400 block">{assignedEmployee.email}</span>
                        )}
                        {assignedDept && (
                          <span className="text-xs text-slate-400 block font-mono">Department Code Scope</span>
                        )}
                      </div>
                      
                      {isEditor && (
                        <button
                          onClick={() => {
                            setActiveAllocToReturn(activeAlloc.id);
                            setShowReturnModal(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-655 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow"
                        >
                          Check In / Return
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-850/80 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-450 block text-[10px] uppercase font-semibold">Expected Return Target</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 block mt-0.5">
                          {activeAlloc.expected_return_date 
                            ? new Date(activeAlloc.expected_return_date).toLocaleDateString("en-US", { dateStyle: "medium" })
                            : "Unlimited / Indefinite"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-450 block text-[10px] uppercase font-semibold">Handover / Allocation Date</span>
                        <span className="font-semibold text-slate-400 block mt-0.5">
                          {new Date(activeAlloc.allocated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                        </span>
                      </div>
                    </div>

                    {activeAlloc.notes && (
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-450 block text-[9.5px] uppercase font-bold tracking-wider">Custodian Notes</span>
                        <p className="text-slate-650 dark:text-slate-350 text-xs mt-1 italic">
                          "{activeAlloc.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Warranty Expiration Progress Box */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-450 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Warranty Progression tracking</span>
                  </span>
                  
                  <span className="font-mono text-slate-400">
                    Exp: {activeAsset.warranty_expiration ? new Date(activeAsset.warranty_expiration).toLocaleDateString() : "Unlimited"}
                  </span>
                </div>

                {/* Progress bar calculating and printing */}
                {(() => {
                  const ws = getWarrantyStats(activeAsset.purchase_date, activeAsset.warranty_expiration);
                  return (
                    <div className="space-y-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full ${ws.color} transition-all duration-500`} style={{ width: `${ws.percent}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Acquisition: {activeAsset.purchase_date ? new Date(activeAsset.purchase_date).toLocaleDateString() : "N/A"}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{ws.text}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Documents & Files Attachment Section */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-450 tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Warranty Documents & Compliance PDFs</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upload input slots */}
                  <div className="border border-dashed border-slate-250 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/20 relative">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-indigo-500" />
                      <div>
                        <span className="font-bold block">Upload PDF invoice</span>
                        <span className="text-[10px] text-slate-400 block">Accepted up to 10MB</span>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleAttachmentUpload(e, false)}
                    />
                  </div>

                  {/* Registered document display link */}
                  {activeAsset.document_url ? (
                    <a
                      href={activeAsset.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 duration-200 font-semibold"
                    >
                      <span className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <span>View Attachment invoice</span>
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="border border-slate-200/50 dark:border-slate-850 p-4 rounded-xl flex items-center justify-center text-xs text-slate-400">
                      <span>No document PDF appended...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Column B: Timeline & QR Widgets */}
            <div className="space-y-6">
              
              {/* QR Scancard Container */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex flex-col items-center text-center space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-450 tracking-wider">Device Encoded Tag</h3>
                
                <div className="p-4 bg-white dark:bg-white rounded-2xl border border-slate-100">
                  {activeAsset.qr_code_url ? (
                    <img 
                      src={activeAsset.qr_code_url}
                      alt={`QR Code ${activeAsset.asset_tag}`}
                      className="w-36 h-36"
                    />
                  ) : (
                    <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      <span>Generating QR...</span>
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">AST-MATRIX SPEC-TAG</span>
                  
                  {activeAsset.qr_code_url && (
                    <button
                      onClick={() => handleQRDownload(activeAsset.qr_code_url!, activeAsset.asset_tag)}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-550 border border-slate-200/50 dark:border-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all text-slate-700 dark:text-slate-100 hover:text-slate-900 bg-white/70 dark:bg-slate-950/40"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Download QR Tag</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Audit timeline details */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-450 tracking-wider flex items-center space-x-1.5">
                  <Scroll className="w-4 h-4 text-indigo-500" />
                  <span>Audit History Timeline</span>
                </h3>

                {historyLoading ? (
                  <div className="space-y-3 py-4">
                    {Array(2).fill(null).map((_, i) => (
                      <div key={i} className="animate-pulse flex items-start space-x-2">
                        <div className="w-3 h-3 bg-slate-200 dark:bg-slate-805 rounded-full mt-1"></div>
                        <div className="space-y-1.5 flex-1">
                          <div className="h-2.5 bg-slate-250 dark:bg-slate-800 rounded w-1/3"></div>
                          <div className="h-3.5 bg-slate-250 dark:bg-slate-800 rounded w-5/6"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-850 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 p-4 bg-slate-50/10 dark:bg-slate-950/20 max-h-[350px] overflow-y-auto space-y-3">
                    <div className="pb-1 text-xs">
                      <span className="text-[9px] text-slate-400 block">{new Date(activeAsset.created_at).toLocaleDateString()}</span>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Asset Record Registered</p>
                      <span className="text-[10px] text-slate-450">Initial status flagged as Available</span>
                    </div>

                    {historyTimeline.map((item: any) => (
                      <div key={item.id} className="pt-2 text-xs">
                        <span className="text-[9px] text-slate-400 block">{new Date(item.timestamp).toLocaleDateString()}</span>
                        <p className="font-semibold text-slate-750 dark:text-slate-200 uppercase text-[10px] flex items-center">
                          {item.action === "asset_allocated" ? <UserCheck className="w-3 h-3 text-indigo-500 mr-1" /> :
                           item.action === "asset_updated" ? <Edit className="w-3 h-3 text-pink-500 mr-1" /> :
                           <AlertTriangle className="w-3 h-3 text-amber-500 mr-1" />}
                          {item.action.replace("_", " ")}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 1: ADD ASSET TAG MODAL ───────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-bold Outfit text-slate-850 dark:text-white">Register Asset Tag</h2>
              <p className="text-slate-400 text-xs mt-1">Define acquisition specs and ownership groups</p>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Asset Tag Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="e.g. Dell XPS, LG Monitor"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                  >
                    <option value="Laptops">Laptops & Computers</option>
                    <option value="Audio Visual">Audio Visual</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Vehicles">Vehicles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="e.g. SN-9988775"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Cost (USD) *</label>
                  <input
                    type="number"
                    required
                    value={formData.purchase_cost || ""}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Warranty Expiration</label>
                  <input
                    type="date"
                    value={formData.warranty_expiration}
                    onChange={(e) => setFormData({ ...formData, warranty_expiration: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Broken">Broken</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Location mapping</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="e.g. Office Area 4B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Custodian department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">General Corp</option>
                    {departments.map((d: Department) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="bookableInput"
                    checked={formData.bookable}
                    onChange={(e) => setFormData({ ...formData, bookable: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-500"
                  />
                  <label htmlFor="bookableInput" className="font-semibold text-slate-600 dark:text-slate-350 select-none">
                    Flag as Reservable Resource
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Description specs</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={2}
                  placeholder="Detail parameters notes, accessories, configurations..."
                />
              </div>

              <div className="flex space-x-3.5 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssetMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all disabled:opacity-40"
                >
                  {createAssetMutation.isPending ? "Syncing..." : "Publish tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT ASSET SPEC MODAL ───────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-bold Outfit text-slate-850 dark:text-white">Edit Registry Tag</h2>
              <p className="text-slate-400 text-xs mt-1">Modify device acquisition specifications</p>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Asset Tag Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="Laptops">Laptops & Computers</option>
                    <option value="Audio Visual">Audio Visual</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Vehicles">Vehicles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Cost (USD) *</label>
                  <input
                    type="number"
                    required
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Warranty Expiration</label>
                  <input
                    type="date"
                    value={formData.warranty_expiration}
                    onChange={(e) => setFormData({ ...formData, warranty_expiration: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Broken">Broken</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Location mapping</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Custodian department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">General Corp</option>
                    {departments.map((d: Department) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="bookableEdit"
                    checked={formData.bookable}
                    onChange={(e) => setFormData({ ...formData, bookable: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-550"
                  />
                  <label htmlFor="bookableEdit" className="font-semibold text-slate-600 dark:text-slate-350 select-none">
                    Flag as Reservable Resource
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Description specs</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={2}
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2.5 bg-slate-105 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateAssetMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-40"
                >
                  {updateAssetMutation.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ASSIGN CUSTODY MODAL ───────────────────────────────────────── */}
      {showAllocate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-xl font-bold Outfit text-slate-855 dark:text-white">Assign Custody Allocation</h2>
              <p className="text-slate-400 text-xs mt-1">Select custody scope parameters and due return dates</p>
            </div>

            {showAllocateConfirm ? (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3 text-slate-700 dark:text-slate-350 animate-fadeIn">
                  <h3 className="font-bold text-slate-850 dark:text-white uppercase tracking-wider text-[9.5px]">Allocation Details Confirmation</h3>
                  <div className="space-y-2 divide-y divide-slate-100/50 dark:divide-slate-800/80">
                    <p className="pt-2"><span className="text-slate-450 mr-1.5 font-medium">Asset Name:</span> <strong className="text-slate-800 dark:text-white">{activeAsset.name} ({activeAsset.asset_tag})</strong></p>
                    <p className="pt-2"><span className="text-slate-450 mr-1.5 font-medium">Target Type:</span> <strong className="text-indigo-500 font-bold uppercase tracking-wider">{allocationType} Assignment</strong></p>
                    <p className="pt-2"><span className="text-slate-450 mr-1.5 font-medium">Custodian Target:</span> <strong className="text-slate-800 dark:text-white text-sm">
                      {allocationType === "employee" 
                        ? employees.find((e: any) => e.id === parseInt(allocateData.employee_id))?.full_name 
                        : departments.find((d: any) => d.id === parseInt(allocateData.department_id))?.name}
                    </strong></p>
                    <p className="pt-2"><span className="text-slate-450 mr-1.5 font-medium">Expected Return:</span> <strong className="text-slate-800 dark:text-white">
                      {allocateData.expected_return_date 
                        ? new Date(allocateData.expected_return_date).toLocaleDateString("en-US", { dateStyle: "long" }) 
                        : "Unlimited / Indefinite Time"}
                    </strong></p>
                    {allocateData.notes && (
                      <p className="pt-2"><span className="text-slate-450 mr-1.5 font-medium">Handover Notes:</span> <span className="italic block mt-1 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900/60 font-sans">"{allocateData.notes}"</span></p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 pt-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllocateConfirm(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAllocation}
                    disabled={allocateMutation.isPending}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-40"
                  >
                    {allocateMutation.isPending ? "Assigning..." : "Assign Allocation"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
                {/* Target Selection Tab Selector */}
                <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl grid grid-cols-2 gap-1 text-[11px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationType("employee");
                      setAllocateData({ ...allocateData, department_id: "" });
                    }}
                    className={`py-2 rounded-lg text-center transition-all ${
                      allocationType === "employee" 
                        ? "bg-white dark:bg-slate-850 text-indigo-500 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Staff Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationType("department");
                      setAllocateData({ ...allocateData, employee_id: "" });
                    }}
                    className={`py-2 rounded-lg text-center transition-all ${
                      allocationType === "department" 
                        ? "bg-white dark:bg-slate-850 text-indigo-500 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Department scope
                  </button>
                </div>

                {allocationType === "employee" ? (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Target Staff Member *</label>
                    <select
                      required={allocationType === "employee"}
                      value={allocateData.employee_id}
                      onChange={(e) => setAllocateData({ ...allocateData, employee_id: e.target.value })}
                      className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      <option value="">Choose Employee...</option>
                      {employees.map((emp: Employee) => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Target Department *</label>
                    <select
                      required={allocationType === "department"}
                      value={allocateData.department_id}
                      onChange={(e) => setAllocateData({ ...allocateData, department_id: e.target.value })}
                      className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      <option value="">Choose Department...</option>
                      {departments.map((dept: Department) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Expected Return Date</label>
                  <input
                    type="date"
                    value={allocateData.expected_return_date}
                    onChange={(e) => setAllocateData({ ...allocateData, expected_return_date: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Handover Notes</label>
                  <textarea
                    value={allocateData.notes}
                    onChange={(e) => setAllocateData({ ...allocateData, notes: e.target.value })}
                    className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    rows={2}
                    placeholder="e.g. Device handed over with charger and protective sleeve."
                  />
                </div>

                <div className="flex space-x-3 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllocate(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold"
                  >
                    Proceed to Confirm
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 4: RETURN / CHECK-IN CUSTODY MODAL ────────────────────────────────────── */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-xl font-bold Outfit text-slate-855 dark:text-white">Check In / End Custody</h2>
              <p className="text-slate-400 text-xs mt-1">Review condition status and document check-in logs</p>
            </div>

            <form onSubmit={handleReturnAsset} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Return / Check-In Notes</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-205 dark:border-slate-855 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={3}
                  placeholder="e.g. Device returned in good shape. Left mouse charger slot checked."
                />
              </div>

              <div className="flex space-x-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnNotes("");
                    setActiveAllocToReturn(null);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnAssetMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-40"
                >
                  {returnAssetMutation.isPending ? "Checking In..." : "Complete return check-in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
