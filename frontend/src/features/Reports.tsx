import React, { useState, useEffect, useRef } from "react";
import { 
  BarChart3, Calendar, Wrench, Laptop, UserCheck, DollarSign,
  TrendingUp, Download, Printer, ShieldAlert, Sparkles, Filter, 
  X, RefreshCw, Layers, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";
import * as echarts from "echarts";
import { api, Asset, Employee, Booking } from "../services/api";
import { Card, Select } from "../components/ui";

interface ReportsProps {
  user: Employee;
}

export const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"utilization" | "maintenance" | "bookings" | "lifecycle">("utilization");

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDeptId, setSelectedDeptId] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedTimeframe, setSelectedTimeframe] = useState("All"); // All, 30days, 90days, Year

  // ECharts container references
  const donutChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const lifecycleChartRef = useRef<HTMLDivElement>(null);

  // ECharts Instance references
  const chartsMap = useRef<{ [key: string]: echarts.ECharts | null }>({
    donut: null,
    bar: null,
    line: null,
    lifecycle: null
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetList, allocList, maintList, bookingList, deptList, empList] = await Promise.all([
        api.fetchAssets(),
        api.fetchAllocations(),
        api.fetchMaintenance(),
        api.fetchBookings(),
        api.fetchDepartments(),
        api.fetchEmployees()
      ]);
      setAssets(assetList || []);
      setAllocations(allocList || []);
      setMaintenance(maintList || []);
      setBookings(bookingList || []);
      setDepartments(deptList || []);
      setEmployees(empList || []);
    } catch (err) {
      console.error("Failed to load reports raw data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter application helper logic
  const getFilteredAssets = () => {
    return assets.filter(a => {
      // 1. Category Filter
      if (selectedCategory !== "All" && a.category !== selectedCategory) return false;
      
      // 2. Department Filter
      if (selectedDeptId !== "All") {
        if (a.department_id !== parseInt(selectedDeptId)) return false;
      }
      
      // 3. Condition Filter
      if (selectedCondition !== "All" && a.condition !== selectedCondition) return false;
      
      // 4. Timeframe filter (by created_at date field)
      if (selectedTimeframe !== "All" && a.created_at) {
        const createdTime = new Date(a.created_at).getTime();
        const now = Date.now();
        if (selectedTimeframe === "30days" && now - createdTime > 30 * 24 * 3600 * 1000) return false;
        if (selectedTimeframe === "90days" && now - createdTime > 90 * 24 * 3600 * 1000) return false;
        if (selectedTimeframe === "year" && now - createdTime > 365 * 24 * 3600 * 1000) return false;
      }
      
      return true;
    });
  };

  const filteredAssets = getFilteredAssets();

  // Helper arrays for filters
  const categories = ["Laptops", "Furniture", "Vehicles", "Audio Visual", "Electronics", "Office Equipment", "Networking", "Other"];
  const conditions = ["Excellent", "Good", "Fair", "Poor", "Broken"];

  // Compute calculated operational stats
  const totalValuationVal = filteredAssets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);
  const utilizationPercentage = filteredAssets.length > 0 
    ? Math.floor((filteredAssets.filter(a => a.status === "Allocated").length / filteredAssets.length) * 100) 
    : 0;

  const resolvedFaultsCount = maintenance.filter(m => m.status === "Resolved").length;
  const resolutionRate = maintenance.length > 0 
    ? Math.floor((resolvedFaultsCount / maintenance.length) * 100) 
    : 0;

  const activeReservationsCount = bookings.filter(b => b.status === "Reserved" || b.status === "CheckedIn").length;

  // Render ECharts
  useEffect(() => {
    if (loading || filteredAssets.length === 0) return;

    // Clear previous instances if they exist
    Object.keys(chartsMap.current).forEach(key => {
      chartsMap.current[key]?.dispose();
      chartsMap.current[key] = null;
    });

    // 1. Asset Status Distribution donut
    if (donutChartRef.current) {
      const activeChart = echarts.init(donutChartRef.current);
      chartsMap.current.donut = activeChart;
      
      const counts = {
        Available: filteredAssets.filter(a => a.status === "Available").length,
        Allocated: filteredAssets.filter(a => a.status === "Allocated").length,
        Maintenance: filteredAssets.filter(a => a.status === "Maintenance").length,
        Disposed: filteredAssets.filter(a => a.status === "Disposed").length,
        Lost: filteredAssets.filter(a => a.status === "Lost").length
      };

      activeChart.setOption({
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: { bottom: "0%", left: "center", textStyle: { color: "#94a3b8", fontSize: 10 } },
        series: [{
          name: "Asset Status Proportion",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: "transparent", borderWidth: 2 },
          label: { show: false },
          data: [
            { value: counts.Available, name: "Available", itemStyle: { color: "#10b981" } },
            { value: counts.Allocated, name: "Allocated", itemStyle: { color: "#6366f1" } },
            { value: counts.Maintenance, name: "Maintenance", itemStyle: { color: "#f59e0b" } },
            { value: counts.Disposed, name: "Disposed", itemStyle: { color: "#94a3b8" } },
            { value: counts.Lost, name: "Lost", itemStyle: { color: "#ef4444" } }
          ]
        }]
      });
    }

    // 2. Maintenance Status distribution (Stacked horizontal columns)
    if (barChartRef.current) {
      const activeChart = echarts.init(barChartRef.current);
      chartsMap.current.bar = activeChart;
      
      const urgentCnt = maintenance.filter(m => m.priority === "Urgent").length;
      const highCnt = maintenance.filter(m => m.priority === "High").length;
      const mediumCnt = maintenance.filter(m => m.priority === "Medium").length;
      const lowCnt = maintenance.filter(m => m.priority === "Low").length;

      activeChart.setOption({
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: ["Low", "Medium", "High", "Urgent"], axisLabel: { color: "#94a3b8", fontSize: 10 } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } } },
        series: [{
          name: "Tickets",
          type: "bar",
          data: [lowCnt, mediumCnt, highCnt, urgentCnt],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#f59e0b" },
              { offset: 1, color: "#d97706" }
            ]),
            borderRadius: [5, 5, 0, 0]
          },
          barWidth: 20
        }]
      });
    }

    // 3. Bookings Resource Distribution Bar
    if (lineChartRef.current) {
      const activeChart = echarts.init(lineChartRef.current);
      chartsMap.current.line = activeChart;

      const types = ["Rooms", "Desks", "Vehicles", "Hardware"];
      const counts = [
        bookings.filter(b => b.resource_type === "Room" || b.resource_type === "Meeting Room").length,
        bookings.filter(b => b.resource_type === "Desk" || b.resource_type === "Hot Desk").length,
        bookings.filter(b => b.resource_type === "Vehicle").length,
        bookings.filter(b => b.resource_type === "Equipment" || b.resource_type === "Hardware").length
      ];

      activeChart.setOption({
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: types, axisLabel: { color: "#94a3b8", fontSize: 10 } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } } },
        series: [{
          name: "Created Bookings",
          type: "bar",
          data: counts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#1d4ed8" }
            ]),
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: 20
        }]
      });
    }

    // 4. Lifecycle Asset Condition Group valuation
    if (lifecycleChartRef.current) {
      const activeChart = echarts.init(lifecycleChartRef.current);
      chartsMap.current.lifecycle = activeChart;

      // Group valuation cost by condition rating
      const conditionsList = ["Excellent", "Good", "Fair", "Poor", "Broken"];
      const valuationPerCondition = conditionsList.map(cond => {
        return filteredAssets
          .filter(a => a.condition === cond)
          .reduce((sum, a) => sum + (a.purchase_cost || 0), 0);
      });

      activeChart.setOption({
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: conditionsList, axisLabel: { color: "#94a3b8", fontSize: 10 } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } } },
        series: [{
          name: "Valuation ($)",
          type: "line",
          smooth: true,
          data: valuationPerCondition,
          itemStyle: { color: "#6366f1" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(99, 102, 241, 0.2)" },
              { offset: 1, color: "rgba(99, 102, 241, 0)" }
            ])
          }
        }]
      });
    }

    // Resize triggers
    const handleResize = () => {
      Object.keys(chartsMap.current).forEach(key => {
        chartsMap.current[key]?.resize();
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);

  }, [loading, filteredAssets, activeTab]);

  // Reset all filters option
  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSelectedDeptId("All");
    setSelectedCondition("All");
    setSelectedTimeframe("All");
  };

  // Exporters Logic
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Asset Name,Category,Asset Tag,Condition,Status,Cost,Purchase Date,Location\n";

    filteredAssets.forEach(a => {
      const row = `"${a.name}","${a.category}","${a.asset_tag}","${a.condition}","${a.status}",${a.purchase_cost || 0},"${a.purchase_date || ''}","${a.location || 'HQ'}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AF_Asset_Reconciliations_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    // Generate simple spreadsheet formatted CSV
    let csvContent = "";
    csvContent += "ASSETFLOW GLOBAL CORP - ASSET REGISTRY REPORT\n";
    csvContent += `Generated: ${new Date().toLocaleDateString()} | Active Filters: Category=${selectedCategory}, Dept=${selectedDeptId}\n\n`;
    csvContent += "Asset ID,Name,Category,Asset Tag,Condition,Status,Valuation Cost,Location\n";

    filteredAssets.forEach(a => {
      const row = `${a.id},"${a.name}","${a.category}","${a.asset_tag}","${a.condition}","${a.status}",$${a.purchase_cost || 0},"${a.location || 'HQ'}"`;
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AF_System_AssetFlow_Excel_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // Elegant clean system print overrides
    window.print();
  };

  return (
    <div className="space-y-6 font-sans p-6 text-slate-800 dark:text-slate-100 min-h-screen printable-area">
      
      {/* Dynamic welcome headers hide on prints */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-205 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-2xl font-bold Outfit bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-primary-500" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Expose corporate assets utilization metrics, diagnostic timelines, and export spreadsheets</p>
        </div>

        {/* Action icons bar */}
        <div className="flex space-x-2.5 mt-4 md:mt-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-805 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/50 dark:border-slate-800"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-indigo-950/20 hover:bg-indigo-955 border border-indigo-550/20 dark:border-indigo-500/10 text-indigo-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-primary-600/10"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL BAR - Hides on print */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-455 uppercase tracking-wider">Report Filters</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          
          {/* Category SELECT */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold">Category</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 hover:border-slate-400 py-1 text-xs focus:outline-none"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold">Department</span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 hover:border-slate-400 py-1 text-xs focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Condition Selector */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold">Condition</span>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 hover:border-slate-400 py-1 text-xs focus:outline-none"
            >
              <option value="All">All Conditions</option>
              {conditions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold">Purchase Period</span>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 hover:border-slate-400 py-1 text-xs focus:outline-none"
            >
              <option value="All">All History</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">Last 12 Months</option>
            </select>
          </div>

          {/* Reset button */}
          {(selectedCategory !== "All" || selectedDeptId !== "All" || selectedCondition !== "All" || selectedTimeframe !== "All") && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 px-3 py-1.5 rounded-lg font-bold mt-3.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

        </div>
      </div>

      {/* KPI SCORING STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Scope Asset Valuation</span>
            <h3 className="text-2xl font-bold Outfit text-slate-800 dark:text-white">
              ${totalValuationVal.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400">Sum value of {filteredAssets.length} scoped items</p>
          </div>
          <div className="p-3 rounded-xl bg-primary-100/50 dark:bg-primary-950/40 text-primary-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Utilization Rate</span>
            <h3 className="text-2xl font-bold Outfit text-indigo-500">
              {utilizationPercentage}%
            </h3>
            <p className="text-[10px] text-slate-400">Assets assigned to allocations</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-500">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Resolved repair rate</span>
            <h3 className="text-2xl font-bold Outfit text-emerald-500">
              {resolutionRate}%
            </h3>
            <p className="text-[10px] text-slate-400">{resolvedFaultsCount} resolved maintenance issues</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-500">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Reservations</span>
            <h3 className="text-2xl font-bold Outfit text-cyan-500">
              {activeReservationsCount}
            </h3>
            <p className="text-[10px] text-slate-400">Spaces and items currently checked out</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-100/50 dark:bg-cyan-950/40 text-cyan-500">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* CORE REPORTS INTERACTIVE ECHARTS PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: Asset status proportions donut */}
        <Card>
          <Card.Header>
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asset status proportions</h2>
            <p className="text-slate-401 text-[10px] font-normal mt-0.5">Proportion distribution of available vs assigned devices</p>
          </Card.Header>
          <Card.Body className="h-64 flex flex-col justify-center">
            {filteredAssets.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10">No asset records match filter scope.</p>
            ) : (
              <div ref={donutChartRef} className="w-full h-full"></div>
            )}
          </Card.Body>
        </Card>

        {/* Chart B: Maintenance severity counts list */}
        <Card>
          <Card.Header>
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fault severity distributions</h2>
            <p className="text-slate-401 text-[10px] font-normal mt-0.5">Breakdown of reported defects by priority grade</p>
          </Card.Header>
          <Card.Body className="h-64 flex flex-col justify-center">
            {maintenance.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10">No maintenance tickets registered.</p>
            ) : (
              <div ref={barChartRef} className="w-full h-full"></div>
            )}
          </Card.Body>
        </Card>

        {/* Chart C: Bookings Timeline Distribution */}
        <Card>
          <Card.Header>
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bookings resource distribution</h2>
            <p className="text-slate-401 text-[10px] font-normal mt-0.5">Quantity of rooms and equipments reserved by users</p>
          </Card.Header>
          <Card.Body className="h-64 flex flex-col justify-center">
            {bookings.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10">No space bookings recorded.</p>
            ) : (
              <div ref={lineChartRef} className="w-full h-full"></div>
            )}
          </Card.Body>
        </Card>

        {/* Chart D: Lifecycle Value by Condition Rating */}
        <Card>
          <Card.Header>
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valuation by condition rating</h2>
            <p className="text-slate-401 text-[10px] font-normal mt-0.5">Asset replacement cost ($) categorized by shape quality</p>
          </Card.Header>
          <Card.Body className="h-64 flex flex-col justify-center">
            {filteredAssets.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10">No scoped asset valuations found.</p>
            ) : (
              <div ref={lifecycleChartRef} className="w-full h-full"></div>
            )}
          </Card.Body>
        </Card>

      </div>

      {/* NAV NAVIGATOR TABS TO SEED SEPARATE SPREADSHEET REPORTS BAR */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 print:hidden">
        <button
          onClick={() => setActiveTab("utilization")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "utilization" 
              ? "border-primary-500 text-primary-600 dark:text-primary-400" 
              : "border-transparent text-slate-450 hover:text-slate-200"
          }`}
        >
          Department Utilization Summaries
        </button>
        
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "maintenance" 
              ? "border-primary-500 text-primary-600 dark:text-primary-400" 
              : "border-transparent text-slate-455 hover:text-slate-200"
          }`}
        >
          Fault Tickets & Contractor Roster
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "bookings" 
              ? "border-primary-500 text-primary-600 dark:text-primary-400" 
              : "border-transparent text-slate-455 hover:text-slate-200"
          }`}
        >
          Space Resourcing Logs
        </button>

        <button
          onClick={() => setActiveTab("lifecycle")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "lifecycle" 
              ? "border-primary-500 text-primary-600 dark:text-primary-400" 
              : "border-transparent text-slate-455 hover:text-slate-200"
          }`}
        >
          Asset valuation records
        </button>
      </div>

      {/* FILTERED REPORT SPREADSHEETS */}

      {/* TAB 1: Department allocations stats */}
      {activeTab === "utilization" && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-xl">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/25 flex justify-between items-center">
            <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Departmental allocation summaries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655 dark:text-slate-350">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-450 uppercase tracking-wider bg-slate-50/20 dark:bg-slate-900/20">
                  <th className="p-4">Department Unit</th>
                  <th className="p-4">Active custody allocations</th>
                  <th className="p-4">Avg asset condition score</th>
                  <th className="p-4">Assigned budget cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {departments.map((d: any) => {
                  const deptAssets = assets.filter(a => a.department_id === d.id);
                  const activeCustodies = deptAssets.filter(a => a.status === "Allocated").length;
                  const totalCost = deptAssets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);
                  
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="p-4 font-bold text-slate-850 dark:text-white">{d.name}</td>
                      <td className="p-4">{activeCustodies} assets</td>
                      <td className="p-4">Excellent / Good</td>
                      <td className="p-4 text-emerald-500 font-bold">${totalCost.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-normal">
                      No departments seeded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Fault Tickets list */}
      {activeTab === "maintenance" && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-xl">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/25">
            <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Historical Fault diagnostics list</span>
          </div>

          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655 dark:text-slate-350">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-450 uppercase bg-slate-50/20 dark:bg-slate-900/20">
                  <th className="p-4">Fault Description</th>
                  <th className="p-4">Priority Severity</th>
                  <th className="p-4">Contractor/Technician</th>
                  <th className="p-4">Current Status</th>
                  <th className="p-4">Date Filed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {String(selectedCategory) !== "All" ? (
                  // Mock filtrations
                  maintenance.filter(m => {
                    const matchedAsset = assets.find(a => a.id === m.asset_id);
                    return matchedAsset?.category === selectedCategory;
                  }).map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10">
                      <td className="p-4 font-bold text-slate-850 dark:text-white capitalize">{m.title}</td>
                      <td className="p-4 px-4">{m.priority}</td>
                      <td className="p-4">{m.technician_assigned || "No technician assigned"}</td>
                      <td className="p-4">{m.status}</td>
                      <td className="p-4 text-slate-455">{new Date(m.created_at || Date.now()).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  maintenance.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10">
                      <td className="p-4 font-bold text-slate-850 dark:text-white capitalize">{m.title}</td>
                      <td className="p-4">{m.priority}</td>
                      <td className="p-4">{m.technician_assigned || "No contractor assigned"}</td>
                      <td className="p-4">{m.status}</td>
                      <td className="p-4 text-slate-455">{new Date(m.created_at || Date.now()).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
                {maintenance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-404">No tickets recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Space Resource bookings info */}
      {activeTab === "bookings" && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-xl">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/25">
            <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Workspace Space Check-ins</span>
          </div>

          <div className="overflow-x-auto text-slate-655 dark:text-slate-350">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-450 uppercase bg-slate-50/20 dark:bg-slate-900/20">
                  <th className="p-4">Reserved Resource</th>
                  <th className="p-4">Resource Type</th>
                  <th className="p-4">Reserved Dates</th>
                  <th className="p-4">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10">
                    <td className="p-4 font-bold text-slate-850 dark:text-white">{b.resource_name}</td>
                    <td className="p-4">{b.resource_type}</td>
                    <td className="p-4">{new Date(b.start_time).toLocaleString()} to {new Date(b.end_time).toLocaleDateString()}</td>
                    <td className="p-4">{b.status}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-404">No active reservations.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Asset Lifecycle Conditions */}
      {activeTab === "lifecycle" && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-xl">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/25">
            <span className="font-bold text-xs uppercase text-slate-450 tracking-wider">Asset conditions breakdown</span>
          </div>

          <div className="overflow-x-auto text-slate-655 dark:text-slate-350">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-455 uppercase bg-slate-50/20 dark:bg-slate-900/20">
                  <th className="p-4">Asset Tag</th>
                  <th className="p-4">Description Name</th>
                  <th className="p-4">Condition rating</th>
                  <th className="p-4">Purchase Cost</th>
                  <th className="p-4">Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssets.slice(0, 15).map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10">
                    <td className="p-4 font-mono font-bold text-slate-850 dark:text-white">{a.asset_tag}</td>
                    <td className="p-4">{a.name}</td>
                    <td className="p-4">{a.condition}</td>
                    <td className="p-4 font-bold text-emerald-500">${(a.purchase_cost || 0).toLocaleString()}</td>
                    <td className="p-4 text-slate-450">{a.purchase_date || "Not set"}</td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-404">No assets match selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
