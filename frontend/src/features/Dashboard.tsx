import React, { useEffect, useState, useRef } from "react";
import { 
  Laptop, UserCheck, Wrench, Calendar, ArrowLeftRight, ClipboardCheck, 
  HeartPulse, ShieldAlert, Sparkles, Search, PlusCircle, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, Send, Bell
} from "lucide-react";
import * as echarts from "echarts";
import { supabase, supabaseActive } from "../services/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useDashboardStats, useActivityFeed, useTransfers, useAllocations, 
  useMaintenance, useNotifications, useMarkNotificationRead, 
  useApproveTransfer, useUpdateMaintenance, useReturnAsset, 
  useAssets, useDepartments, useEmployees, QK 
} from "../hooks/useApi";
import { 
  Card, Button, Input, Textarea, Select, Modal, Drawer, EmptyState, 
  StatSkeleton, CardSkeleton, TableSkeleton 
} from "../components/ui";
import { 
  Badge, AssetStatusBadge, PriorityBadge, TransferStatusBadge, 
  MaintenanceStatusBadge, RoleBadge 
} from "../components/ui/Badge";
import { formatDate } from "../lib/utils";
import { useUIStore } from "../store/uiStore";

interface DashboardProps {
  user: any;
  onOpenSearch: () => void;
  onQuickAction: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onOpenSearch, onQuickAction }) => {
  const queryClient = useQueryClient();
  const { theme } = useUIStore();

  // Queries
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities = [], isLoading: activitiesLoading } = useActivityFeed();
  const { data: transfers = [], isLoading: transfersLoading } = useTransfers();
  const { data: allocations = [], isLoading: allocationsLoading } = useAllocations();
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenance();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(user?.id);
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useEmployees();

  // Mutations
  const approveTransferMutation = useApproveTransfer();
  const returnAssetMutation = useReturnAsset();
  const updateMaintenanceMutation = useUpdateMaintenance();
  const markReadMutation = useMarkNotificationRead();

  // Dialog & Drawer States
  const [activeQueueTab, setActiveQueueTab] = useState<"approvals" | "returns" | "maintenance">("approvals");
  
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [transferNotes, setTransferNotes] = useState("");
  
  const [selectedMaint, setSelectedMaint] = useState<any>(null);
  const [maintStatus, setMaintStatus] = useState("In_Progress");
  const [assignedTech, setAssignedTech] = useState("");
  const [maintNotes, setMaintNotes] = useState("");
  const [isMaintDrawerOpen, setIsMaintDrawerOpen] = useState(false);

  const [selectedAlloc, setSelectedAlloc] = useState<any>(null);
  const [returnNotes, setReturnNotes] = useState("");

  // ECharts container references
  const donutChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  // Realtime Supabase Subscription
  useEffect(() => {
    const client = supabase;
    if (!supabaseActive || !client) return;

    const channel = client
      .channel("dashboard-realtime-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          console.log("Realtime Sync Triggered:", payload);
          // Invalidate affected data caches to trigger live updates in UI
          queryClient.invalidateQueries({ queryKey: QK.DASHBOARD_STATS });
          queryClient.invalidateQueries({ queryKey: QK.ACTIVITY_FEED });
          queryClient.invalidateQueries({ queryKey: QK.TRANSFERS });
          queryClient.invalidateQueries({ queryKey: QK.ALLOCATIONS });
          queryClient.invalidateQueries({ queryKey: QK.MAINTENANCE });
          queryClient.invalidateQueries({ queryKey: QK.ASSETS });
          queryClient.invalidateQueries({ queryKey: QK.EMPLOYEES });
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(user.id) });
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  // ECharts Rendering Logic
  useEffect(() => {
    if (statsLoading || assetsLoading || !stats || assets.length === 0) return;

    let donutChart: echarts.ECharts | null = null;
    let lineChart: echarts.ECharts | null = null;
    let barChart: echarts.ECharts | null = null;

    const isDark = theme === "dark";
    const labelColor = isDark ? "#94a3b8" : "#64748b";
    const lineColor = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
    const splitColor = isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9";

    // 1. Asset Status Distribution Donut Chart
    if (donutChartRef.current) {
      donutChart = echarts.init(donutChartRef.current);
      
      const availableCount = assets.filter((a: any) => a.status === "Available").length;
      const allocatedCount = assets.filter((a: any) => a.status === "Allocated").length;
      const inRepairCount = assets.filter((a: any) => a.status === "Maintenance").length;
      const disposedCount = assets.filter((a: any) => a.status === "Disposed").length;
      const lostCount = assets.filter((a: any) => a.status === "Lost").length;

      donutChart.setOption({
        animation: true,
        tooltip: { 
          trigger: "item", 
          formatter: "{b}: {c} ({d}%)", 
          backgroundColor: isDark ? "#090e1a" : "#ffffff",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          textStyle: { color: labelColor }
        },
        legend: {
          orient: "horizontal",
          bottom: "0%",
          left: "center",
          textStyle: { color: labelColor, fontSize: 10 },
          itemWidth: 8,
          itemHeight: 8
        },
        series: [
          {
            name: "Status Distribution",
            type: "pie",
            radius: ["55%", "75%"],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: isDark ? "#090e1a" : "#ffffff", borderWidth: 2 },
            label: { show: false, position: "center" },
            emphasis: {
              label: { show: true, fontSize: 11, fontWeight: "bold", formatter: "{b}\n{c}", color: labelColor }
            },
            data: [
              { value: availableCount, name: "Available", itemStyle: { color: "#22c55e" } },
              { value: allocatedCount, name: "Allocated", itemStyle: { color: "#8b5cf6" } },
              { value: inRepairCount, name: "In Repair", itemStyle: { color: "#f59e0b" } },
              { value: disposedCount, name: "Disposed", itemStyle: { color: "#64748b" } },
              { value: lostCount, name: "Lost", itemStyle: { color: "#ef4444" } }
            ]
          }
        ]
      });
    }

    // 2. Allocation & Issue Trends
    if (lineChartRef.current) {
      lineChart = echarts.init(lineChartRef.current);
      lineChart.setOption({
        animation: true,
        tooltip: { 
          trigger: "axis",
          backgroundColor: isDark ? "#090e1a" : "#ffffff",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          textStyle: { color: labelColor }
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          axisLine: { lineStyle: { color: lineColor } },
          axisLabel: { color: labelColor, fontSize: 10 }
        },
        yAxis: {
          type: "value",
          splitLine: { lineStyle: { color: splitColor } },
          axisLabel: { color: labelColor, fontSize: 10 }
        },
        series: [
          {
            name: "Allocations",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: [12, 19, 15, 25, 22, 10, 15],
            itemStyle: { color: "#8b5cf6" },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(139, 92, 246, 0.22)" },
                { offset: 1, color: "rgba(139, 92, 246, 0)" }
              ])
            }
          },
          {
            name: "Issues Reported",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: [3, 2, 5, 1, 4, 0, 2],
            itemStyle: { color: "#ef4444" },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(239, 68, 68, 0.18)" },
                { offset: 1, color: "rgba(239, 68, 68, 0)" }
              ])
            }
          }
        ]
      });
    }

    // 3. Department Utilization Horizontal Bar Chart
    if (barChartRef.current && departments.length > 0) {
      barChart = echarts.init(barChartRef.current);
      
      const deptNames = departments.slice(0, 4).map((d: any) => d.name);
      const allocatedPerDept = departments.slice(0, 4).map((d: any) => {
        return assets.filter((a: any) => a.department_id === d.id && a.status === "Allocated").length;
      });

      barChart.setOption({
        animation: true,
        tooltip: { 
          trigger: "axis", 
          axisPointer: { type: "shadow" },
          backgroundColor: isDark ? "#090e1a" : "#ffffff",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          textStyle: { color: labelColor }
        },
        grid: { left: "3%", right: "4%", top: "3%", bottom: "3%", containLabel: true },
        xAxis: {
          type: "value",
          splitLine: { lineStyle: { color: splitColor } },
          axisLabel: { color: labelColor, fontSize: 10 }
        },
        yAxis: {
          type: "category",
          data: deptNames,
          axisLine: { lineStyle: { color: lineColor } },
          axisLabel: { color: labelColor, fontSize: 10 }
        },
        series: [
          {
            name: "Assigned Assets",
            type: "bar",
            data: allocatedPerDept,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: "#7c3aed" },
                { offset: 1, color: "#c4b5fd" }
              ]),
              borderRadius: [0, 4, 4, 0]
            },
            barWidth: 10
          }
        ]
      });
    }

    const handleResize = () => {
      donutChart?.resize();
      lineChart?.resize();
      barChart?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      donutChart?.dispose();
      lineChart?.dispose();
      barChart?.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, [statsLoading, assetsLoading, stats, assets, departments, theme]);

  // Actions Callbacks
  const handleApproveTransfer = (approved: boolean) => {
    if (!selectedTransfer) return;
    approveTransferMutation.mutate({
      transferId: selectedTransfer.id,
      approved,
      notes: transferNotes,
      approverId: user.id,
      role: user.role
    }, {
      onSuccess: () => {
        setSelectedTransfer(null);
        setTransferNotes("");
      }
    });
  };

  const handleReturnAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlloc) return;
    returnAssetMutation.mutate({
      allocId: selectedAlloc.id,
      notes: returnNotes
    }, {
      onSuccess: () => {
        setSelectedAlloc(null);
        setReturnNotes("");
      }
    });
  };

  const handleUpdateMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaint) return;
    updateMaintenanceMutation.mutate({
      id: selectedMaint.id,
      status: maintStatus,
      tech: assignedTech,
      notes: maintNotes,
      managerId: user.id
    }, {
      onSuccess: () => {
        setIsMaintDrawerOpen(false);
        setSelectedMaint(null);
        setAssignedTech("");
        setMaintNotes("");
      }
    });
  };

  const kpis = stats
    ? [
        { title: "Assets Available", val: stats.assets_available, icon: Laptop, color: "emerald", desc: "Ready for distribution" },
        { title: "Active Custodies", val: stats.assets_allocated, icon: UserCheck, color: "indigo", desc: "Currently in use" },
        { title: "Pending Tickets", val: stats.maintenance_today, icon: Wrench, color: "amber", desc: "Unresolved repairs" },
        { title: "Due For Return", val: stats.upcoming_returns, icon: Calendar, color: "blue", desc: "Expiring in next 7 days" },
        { title: "Pending Approvals", val: stats.pending_allocations, icon: ArrowLeftRight, color: "purple", desc: "Transfers awaiting sign-off" },
        { title: "Active Bookings", val: stats.active_bookings, icon: Calendar, color: "cyan", desc: "Scheduled spaces/resources" },
        { title: "Active Audits", val: stats.audit_pending, icon: ClipboardCheck, color: "pink", desc: "Active scanner scopes" },
        { title: "Department Health", val: `${stats.department_health}%`, icon: HeartPulse, color: "green", desc: "Functional equipment score" },
      ]
    : [];

  // Filter queues
  const activeApprovals = transfers.filter((t: any) => ["Pending_Dept_Head", "Pending_Asset_Manager"].includes(t.status));
  
  const activeUpcomingReturns = allocations.filter((al: any) => {
    if (al.status !== "active" || !al.expected_return_date) return false;
    const exp = new Date(al.expected_return_date).getTime();
    const inOneWeek = Date.now() + 7 * 24 * 3600 * 1000;
    return exp <= inOneWeek;
  });

  const activeMaintenanceIssues = maintenance.filter((m: any) => ["Pending", "Approved", "In_Progress"].includes(m.status));

  return (
    <div className="space-y-8 font-sans p-6">
      {/* Enterprise Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-primary-950 to-primary-900 text-white rounded-2xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-accent-400/10 rounded-full blur-[80px]"></div>

        <div className="z-10 space-y-1.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-accent-400 animate-pulse" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight Outfit">
              Welcome back, {user?.full_name}!
            </h1>
          </div>
          <p className="text-slate-350 text-xs md:text-sm max-w-lg leading-relaxed">
            Role clearance level: <span className="font-bold text-accent-400 capitalize">{user?.role?.replace("_", " ")}</span>. Live synchronization with Supabase cloud instances active.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3 z-10 w-full md:w-auto">
          <button 
            onClick={onOpenSearch}
            className="flex items-center justify-between w-full md:w-64 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-left border border-white/10 text-xs md:text-sm text-slate-200 transition-all font-medium group"
          >
            <span className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-300 group-hover:scale-105 transition-transform" />
              <span>Search assets, transfers...</span>
            </span>
            <kbd className="hidden md:inline px-1.5 py-0.5 bg-white/20 rounded font-semibold text-[10px]">CTRL K</kbd>
          </button>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(8).fill(null).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Dashboard Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => {
              const Icon = k.icon;
              return (
                <div
                  key={i}
                  className="glass-panel glass-panel-hover p-5 rounded-xl flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white Outfit">
                      {k.val}
                    </span>
                    <div className={`p-2 rounded-xl ${
                      k.color === "emerald" ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" :
                      k.color === "indigo" ? "bg-indigo-100/50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" :
                      k.color === "amber" ? "bg-amber-100/50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" :
                      k.color === "blue" ? "bg-blue-100/50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" :
                      k.color === "purple" ? "bg-purple-100/50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" :
                      k.color === "cyan" ? "bg-cyan-100/50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400" :
                      k.color === "pink" ? "bg-pink-100/50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400" :
                      "bg-green-100/50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-slate-655 dark:text-slate-400 uppercase tracking-wider">{k.title}</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{k.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Operations and Workspace Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Workspace Panel: Operational Queues */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <Card.Header className="flex flex-row justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-850 dark:text-white uppercase tracking-wider">Operations Control Queue</h2>
                    <p className="text-slate-400 text-[10px] font-normal">Action required for pending requests, return expirations, and active faults</p>
                  </div>
                  {/* Selector Tabs */}
                  <div className="flex space-x-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setActiveQueueTab("approvals")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        activeQueueTab === "approvals"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-primary-500 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Approvals ({activeApprovals.length})
                    </button>
                    <button
                      onClick={() => setActiveQueueTab("returns")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        activeQueueTab === "returns"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-primary-500 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Returns ({activeUpcomingReturns.length})
                    </button>
                    <button
                      onClick={() => setActiveQueueTab("maintenance")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        activeQueueTab === "maintenance"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-primary-500 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Maintenance ({activeMaintenanceIssues.length})
                    </button>
                  </div>
                </Card.Header>
                <Card.Body className="p-4 min-h-[300px]">
                  {/* TAB 1: Pending Approvals */}
                  {activeQueueTab === "approvals" && (
                    transfersLoading ? (
                      <TableSkeleton cols={4} rows={3} />
                    ) : activeApprovals.length === 0 ? (
                      <EmptyState
                        title="Approvals Queue Clear"
                        description="There are no pending asset transfer requests requiring your signature."
                        icon={<CheckCircle className="w-6 h-6 text-slate-400" />}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-500 dark:text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase transition-all">
                              <th className="py-2.5">Asset</th>
                              <th className="py-2.5">Target Employee / Dept</th>
                              <th className="py-2.5">Status Flag</th>
                              <th className="py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeApprovals.map((t: any) => (
                              <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="py-3 font-semibold text-slate-800 dark:text-white">
                                  <span>ID: {t.asset_id}</span>
                                  <span className="block text-[10px] font-normal text-slate-400">Transfer Request #{t.id}</span>
                                </td>
                                <td className="py-3">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">Employee ID: {t.target_employee_id}</span>
                                  <span className="block text-[10px] text-slate-400">Dept ID: {t.target_department_id}</span>
                                </td>
                                <td className="py-3">
                                  <TransferStatusBadge status={t.status} />
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex justify-end space-x-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                                      onClick={() => {
                                        setSelectedTransfer(t);
                                        setTransferNotes("");
                                      }}
                                    >
                                      Approve / Reject
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {/* TAB 2: Upcoming Returns */}
                  {activeQueueTab === "returns" && (
                    allocationsLoading ? (
                      <TableSkeleton cols={4} rows={3} />
                    ) : activeUpcomingReturns.length === 0 ? (
                      <EmptyState
                        title="No Impending Returns"
                        description="All allocated assets have healthy, extended custody periods."
                        icon={<Calendar className="w-6 h-6 text-slate-400" />}
                      />
                    ) : (
                      <div className="overflow-x-auto font-sans">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase">
                              <th className="py-2.5">Custody Allocation</th>
                              <th className="py-2.5">Custodian</th>
                              <th className="py-2.5">Due Date</th>
                              <th className="py-2.5 text-right">Inventory Return</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeUpcomingReturns.map((al: any) => (
                              <tr key={al.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="py-3 font-semibold text-slate-800 dark:text-white">
                                  Asset #{al.asset_id}
                                  <span className="block text-[10px] font-normal text-slate-450">Allocated: {formatDate(al.allocated_at)}</span>
                                </td>
                                <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">
                                  Staff ID: {al.employee_id}
                                </td>
                                <td className="py-3 text-slate-600 dark:text-slate-350">
                                  <span className="text-red-500 font-semibold">{formatDate(al.expected_return_date)}</span>
                                </td>
                                <td className="py-3 text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedAlloc(al)}
                                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                  >
                                    Check In
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {/* TAB 3: Maintenance Diagnostic Queue */}
                  {activeQueueTab === "maintenance" && (
                    maintenanceLoading ? (
                      <TableSkeleton cols={4} rows={3} />
                    ) : activeMaintenanceIssues.length === 0 ? (
                      <EmptyState
                        title="Maintenance Board Empty"
                        description="Congratulations! All registered inventory items are operating flawlessly."
                        icon={<Wrench className="w-6 h-6 text-slate-400" />}
                      />
                    ) : (
                      <div className="overflow-x-auto font-sans">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold Gillsans uppercase">
                              <th className="py-2.5">Fault Ticket</th>
                              <th className="py-2.5">Severity</th>
                              <th className="py-2.5">Status</th>
                              <th className="py-2.5 text-right">Treatment Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeMaintenanceIssues.map((m: any) => (
                              <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="py-3 text-slate-800 dark:text-white font-semibold">
                                  {m.title}
                                  <span className="block text-[10px] font-normal text-slate-450">Exp: {m.description}</span>
                                </td>
                                <td className="py-3">
                                  <PriorityBadge priority={m.priority} />
                                </td>
                                <td className="py-3">
                                  <MaintenanceStatusBadge status={m.status} />
                                </td>
                                <td className="py-3 text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMaint(m);
                                      setMaintStatus(m.status);
                                      setAssignedTech(m.technician_assigned || "");
                                      setMaintNotes(m.resolution_notes || "");
                                      setIsMaintDrawerOpen(true);
                                    }}
                                  >
                                    Diagnose
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </Card.Body>
              </Card>

              {/* Data Visualization Board */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Allocation Trends Segment */}
                <div className="md:col-span-2">
                  <Card>
                    <Card.Header>
                      <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transaction & Error Trends</h2>
                      <p className="text-slate-401 text-[10px] font-normal mt-0.5">Asset allocation checkouts vs. maintenance failures filed</p>
                    </Card.Header>
                    <Card.Body>
                      <div ref={lineChartRef} className="w-full h-64"></div>
                    </Card.Body>
                  </Card>
                </div>

                {/* Status distribution Pie */}
                <Card>
                  <Card.Header>
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inventory Statuses</h2>
                    <p className="text-slate-401 text-[10px] font-normal mt-0.5">Real-time status proportions</p>
                  </Card.Header>
                  <Card.Body className="flex flex-col justify-between">
                    <div ref={donutChartRef} className="w-full h-48"></div>
                  </Card.Body>
                </Card>
              </div>

              {/* Department Utilization Analytics */}
              <Card>
                <Card.Header>
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Department Asset Allocation Allocation Score</h2>
                  <p className="text-slate-400 text-[10px] font-normal mt-0.5 text-ellipsis overflow-hidden">Quantity of actively assigned assets within departments</p>
                </Card.Header>
                <Card.Body>
                  {assetsLoading ? (
                    <div className="h-40 bg-slate-100 rounded animate-pulse"></div>
                  ) : (
                    <div ref={barChartRef} className="w-full h-56"></div>
                  )}
                </Card.Body>
              </Card>
            </div>

            {/* Right Sidebar: Notification center, Quick Actions & Activity timeline */}
            <div className="space-y-6">
              {/* Live Alerts Notifications Center */}
              <Card>
                <Card.Header className="flex flex-row justify-between items-center pb-2 border-b border-slate-105 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-primary-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">Workspace Alerts</h2>
                  </div>
                  <Badge variant="info">
                    {notifications.filter((n: any) => !n.read).length} Unread
                  </Badge>
                </Card.Header>
                <Card.Body className="p-4 space-y-3 max-h-[220px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      No notifications found.
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div 
                        key={n.id} 
                        onClick={() => { if (!n.read) markReadMutation.mutate(n.id); }}
                        className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer flex flex-col space-y-0.5 ${
                          n.read
                            ? "bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800"
                            : "bg-primary-500/5 dark:bg-primary-500/10 border-primary-500/20 font-semibold"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-805 dark:text-white">{n.title}</span>
                          <span className="text-[9px] text-slate-400">{formatDate(n.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-410 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </Card.Body>
              </Card>

              {/* Quick Actions drawer short template links */}
              <Card>
                <Card.Header>
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider">Quick Workflows</h2>
                </Card.Header>
                <Card.Body className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => onQuickAction("/assets")}
                    className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-left group"
                  >
                    <PlusCircle className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Register New Asset</h4>
                      <p className="text-[10px] text-slate-400">Add profile & details</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onQuickAction("/bookings")}
                    className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-left group"
                  >
                    <Calendar className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Reserve Workspace</h4>
                      <p className="text-[10px] text-slate-400">Book shared resources</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onQuickAction("/maintenance")}
                    className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-left group"
                  >
                    <Wrench className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Report Damaged Item</h4>
                      <p className="text-[10px] text-slate-400">Open active repair ticket</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onQuickAction("/audits")}
                    className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-left group"
                  >
                    <ClipboardCheck className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Initiate Audit Scope</h4>
                      <p className="text-[10px] text-slate-400">Run scan verifications</p>
                    </div>
                  </button>
                </Card.Body>
              </Card>

              {/* Recent Audit timeline activity log */}
              <Card>
                <Card.Header>
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider">System Activity Logs</h2>
                </Card.Header>
                <Card.Body className="p-4">
                  {activitiesLoading ? (
                    <div className="space-y-4">
                      {Array(3).fill(null).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 dark:bg-slate-805 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No activity logs recorded.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {activities.slice(0, 15).map((a: any, i: number) => (
                        <div key={a.id} className="flex space-x-3 items-start relative pb-4 last:pb-0">
                          {i < activities.length - 1 && (
                            <span className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800"></span>
                          )}
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center relative z-10">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              <span className="font-bold text-primary-500">{a.user_name || "System"}</span> {a.details || a.action.replace("_", " ")}
                            </p>
                            <span className="text-[9px] text-slate-400 mt-0.5 block">
                              {formatDate(a.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* APPROVAL DIALOG MODAL */}
      <Modal
        open={selectedTransfer !== null}
        onClose={() => setSelectedTransfer(null)}
        title="Asset Transfer Sign-off"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Review transfer ticket. Approve swaps ownership and moves asset custody to the target department & employee.
          </p>

          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl space-y-1.5">
            <p><strong>Transfer Ticket Ref:</strong> #{selectedTransfer?.id}</p>
            <p><strong>Asset Tag ID:</strong> {selectedTransfer?.asset_id}</p>
            <p><strong>Proposed Department ID:</strong> {selectedTransfer?.target_department_id}</p>
            <p><strong>Proposed Employee ID:</strong> {selectedTransfer?.target_employee_id}</p>
          </div>

          <Textarea
            label="Approver Decision Notes"
            rows={2}
            value={transferNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTransferNotes(e.target.value)}
            placeholder="Review comments or rejection reasoning..."
          />

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-850">
            <Button
              variant="outline"
              disabled={approveTransferMutation.isPending}
              onClick={() => handleApproveTransfer(false)}
              leftIcon={<XCircle className="w-4 h-4 text-red-500" />}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              disabled={approveTransferMutation.isPending}
              onClick={() => handleApproveTransfer(true)}
              leftIcon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
            >
              Approve Transfer
            </Button>
          </div>
        </div>
      </Modal>

      {/* RETURN CHECK-IN MODAL */}
      <Modal
        open={selectedAlloc !== null}
        onClose={() => setSelectedAlloc(null)}
        title="Return Custody Check-In"
      >
        <form onSubmit={handleReturnAssetSubmit} className="space-y-4 text-xs font-sans">
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-me">
            Review and close out custodian possession. The asset status will reset back to <strong>Available</strong> for immediate re-assignment.
          </p>

          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl space-y-1">
            <p><strong>Allocation ID:</strong> #{selectedAlloc?.id}</p>
            <p><strong>Asset ID:</strong> {selectedAlloc?.asset_id}</p>
            <p><strong>Custodian Staff ID:</strong> {selectedAlloc?.employee_id}</p>
            <p><strong>Agreement Notes:</strong> {selectedAlloc?.notes || "No notes registered"}</p>
          </div>

          <Input
            label="Return Diagnostics / Comments"
            value={returnNotes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnNotes(e.target.value)}
            placeholder="e.g. Asset returned in pristine condition."
          />

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-850">
            <Button variant="outline" type="button" onClick={() => setSelectedAlloc(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={returnAssetMutation.isPending}
            >
              Confirm Return Check-In
            </Button>
          </div>
        </form>
      </Modal>

      {/* MAINTENANCE DIAGNOSTIC DRAWER */}
      <Drawer
        open={isMaintDrawerOpen}
        onClose={() => { setIsMaintDrawerOpen(false); setSelectedMaint(null); }}
        title="Maintenance Diagnostic treatment"
      >
        <form onSubmit={handleUpdateMaintenanceSubmit} className="space-y-4 text-xs font-sans p-2">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{selectedMaint?.title}</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Ticket reference #{selectedMaint?.id}. File description: {selectedMaint?.description}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
            <p><strong>Asset Reference ID:</strong> {selectedMaint?.asset_id}</p>
            <p><strong>Severity Grade:</strong> {selectedMaint?.priority}</p>
            <p><strong>Ticket Submitted Date:</strong> {selectedMaint && formatDate(selectedMaint.created_at)}</p>
          </div>

          <Select
            label="Treatment Status"
            value={maintStatus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaintStatus(e.target.value)}
            options={[
              { value: "Pending", label: "Pending (Under Review)" },
              { value: "Approved", label: "Approved (Schedule Treatment)" },
              { value: "In_Progress", label: "In Progress (Treatment Active)" },
              { value: "Resolved", label: "Resolved (Flawless Operation)" },
              { value: "Rejected", label: "Rejected (Issue Invalid)" }
            ]}
          />

          <Input
            label="Assigned Contractor/Technician"
            value={assignedTech}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignedTech(e.target.value)}
            placeholder="e.g. John's IT Repair Services / Marcus Vance"
          />

          <Textarea
            label="Diagnostic & Resolution Notes"
            rows={3}
            value={maintNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMaintNotes(e.target.value)}
            placeholder="Describe replacement parts or technicians feedback..."
          />

          <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={updateMaintenanceMutation.isPending}
            >
              Update Fault Ticket
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsMaintDrawerOpen(false); setSelectedMaint(null); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Dashboard;
