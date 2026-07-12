import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { 
  CalendarDays, Plus, Trash2, ShieldAlert, CheckCircle, Clock, 
  Search, Filter, ChevronRight, X, AlertCircle 
} from "lucide-react";
import { api, Booking, Employee } from "../services/api";

interface BookingsProps {
  user: Employee;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef<any>(null);

  // Filters & Search States
  const [activeType, setActiveType] = useState<"All" | "Room" | "Vehicle" | "Projector">("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Reservation Modal Form
  const [showCreate, setShowCreate] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [resourceType, setResourceType] = useState<"Room" | "Vehicle" | "Projector">("Room");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");

  // Details dialog drawer
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Message notifications
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [bList, empList] = await Promise.all([
        api.fetchBookings(),
        api.fetchEmployees()
      ]);
      setBookings(bList);
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

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName || !startTime || !endTime) return;
    setErrorMsg("");
    setSuccessMsg("");

    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();

    if (new Date(startISO) <= new Date()) {
      setErrorMsg("Booking start time must be in the future.");
      return;
    }

    if (new Date(startISO) >= new Date(endISO)) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    try {
      await api.createBooking({
        resource_name: resourceName,
        resource_type: resourceType,
        start_time: startISO,
        end_time: endISO,
        purpose: purpose || undefined
      }, user.id);

      setSuccessMsg(`Reservation scheduled successfully!`);
      setShowCreate(false);
      setResourceName("");
      setStartTime("");
      setEndTime("");
      setPurpose("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to make reservation.");
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.cancelBooking(id, user.id);
      setSuccessMsg("Booking cancelled successfully.");
      setSelectedBooking(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking.");
    }
  };

  const handleStatusUpdate = async (id: number, status: "CheckedIn" | "Completed") => {
    try {
      await api.updateBooking(id, { status }, user.id);
      setSuccessMsg(`Status updated to ${status}`);
      const updatedList = (await api.fetchBookings()) as Booking[];
      setBookings(updatedList);
      const activeObj = updatedList.find((b: Booking) => b.id === id);
      if (activeObj) setSelectedBooking(activeObj);
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  const handleEventDropOrResize = async (info: any) => {
    const { event } = info;
    const bookingId = parseInt(event.id);
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Check permission
    if (booking.booked_by_id !== user.id && user.role !== "admin") {
      alert("You are not authorized to reschedule this reservation.");
      info.revert();
      return;
    }

    const payload = {
      start_time: event.start.toISOString(),
      end_time: event.end ? event.end.toISOString() : new Date(event.start.getTime() + 60 * 60 * 1000).toISOString()
    };

    if (window.confirm(`Are you sure you want to reschedule this booking to:\n${new Date(payload.start_time).toLocaleString()} - ${new Date(payload.end_time).toLocaleString()}?`)) {
      try {
        await api.updateBooking(bookingId, payload, user.id);
        setSuccessMsg("Reservation rescheduled successfully!");
        loadData();
      } catch (err: any) {
        alert(err.message || "Conflict: this resource is already booked during these hours.");
        info.revert();
      }
    } else {
      info.revert();
    }
  };

  const getBookedByName = (id: number) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : `User ID #${id}`;
  };

  const getResources = (type: "Room" | "Vehicle" | "Projector") => {
    if (type === "Room") {
      return ["Boardroom Crimson", "Conference Room Alpha", "Huddle Space Blue"];
    } else if (type === "Vehicle") {
      return ["Tesla Model 3 AST-1005", "Ford Transit Delivery Van"];
    } else {
      return ["Audio Visual - Sony Projector AST-1003", "Conference Speakerphone"];
    }
  };

  // Process and color-code events for FullCalendar
  const calendarEvents = bookings
    .filter(b => {
      if (activeType !== "All" && b.resource_type !== activeType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = b.resource_name.toLowerCase().includes(query);
        const matchesPurpose = (b.purpose || "").toLowerCase().includes(query);
        if (!matchesName && !matchesPurpose) return false;
      }
      return true;
    })
    .map(b => {
      let color = "#10b981"; // emerald for Reserved
      if (b.status === "Cancelled") color = "#64748b"; // slate
      else if (b.status === "CheckedIn") color = "#6366f1"; // indigo
      else if (b.status === "Completed") color = "#eab308"; // yellow/gold

      return {
        id: b.id.toString(),
        title: `${b.resource_name} (${b.purpose || "Meeting"})`,
        start: b.start_time,
        end: b.end_time,
        backgroundColor: color,
        textColor: "#ffffff",
        extendedProps: b
      };
    });

  return (
    <div className="space-y-6 font-sans p-6 text-slate-800 dark:text-slate-100 min-h-screen">
      <style>{`
        /* FullCalendar Custom Theme styling injected dynamically */
        .fc {
          font-family: 'Outfit', sans-serif !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: rgba(226, 232, 240, 0.4) !important;
        }
        .dark .fc-theme-standard td, .dark .fc-theme-standard th {
          border-color: rgba(51, 65, 85, 0.4) !important;
        }
        .fc-col-header-cell {
          padding: 8px 0 !important;
          background-color: rgba(148, 163, 184, 0.08) !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
        }
        .fc-button-primary {
          background-color: var(--color-primary-600) !important;
          border-color: var(--color-primary-600) !important;
          border-radius: 12px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.15) !important;
          padding: 6px 12px !important;
        }
        .fc-button-primary:hover {
          background-color: var(--color-primary-500) !important;
          border-color: var(--color-primary-500) !important;
        }
        .fc-button-active {
          background-color: var(--color-primary-750) !important;
          border-color: var(--color-primary-750) !important;
        }
        .fc-event {
          border-radius: 8px !important;
          padding: 3px 6px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          border: none !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15) !important;
          cursor: pointer !important;
          transition: transform 0.15s ease;
        }
        .fc-event:hover {
          transform: scale(1.02);
        }
      `}</style>

      {/* Header and Quick Summary */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold Outfit bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">Resource Scheduling Center</h1>
          <p className="text-slate-400 text-xs mt-1">Drag-and-drop bookings, real-time conflicts check, and check-in statuses</p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white px-5 & py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Reservation</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Workspace Cockpit Dual Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Control Center Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* SEARCH & FILTER CONTROLS */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-205 dark:border-slate-805 space-y-4">
            <h2 className="text-sm font-bold Outfit text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-primary-500" />
              <span>Search & Filter</span>
            </h2>

            {/* Keyword Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>

            {/* Type Radio Selector */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Resource Category</label>
              <div className="flex flex-col space-y-1">
                {(["All", "Room", "Vehicle", "Projector"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                      activeType === type
                        ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                        : "hover:bg-slate-100/50 dark:hover:bg-slate-850 text-slate-500"
                    }`}
                  >
                    <span>{type}s</span>
                    {activeType === type && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STATUS COLOR LEGENDS */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-205 dark:border-slate-805 space-y-3">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">Status Color Guide</h2>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                <span className="font-semibold">Reserved (Upcoming)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500 block"></span>
                <span className="font-semibold">Checked In (Active)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500 block"></span>
                <span className="font-semibold">Completed (Returned)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-slate-400 block"></span>
                <span className="font-semibold">Cancelled slot</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Calendar Panel */}
        <div className="lg:col-span-3">
          <div className="glass-panel p-6 rounded-2xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            {loading ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="space-y-3 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="text-xs text-slate-400 font-semibold">Refreshing timeline slots...</p>
                </div>
              </div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay"
                }}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                events={calendarEvents}
                eventClick={(info) => {
                  setSelectedBooking(info.event.extendedProps as Booking);
                }}
                eventDrop={handleEventDropOrResize}
                eventResize={handleEventDropOrResize}
                allDaySlot={false}
                height="auto"
              />
            )}
          </div>
        </div>

      </div>

      {/* CREATE BOOKING MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold Outfit text-slate-800 dark:text-white">Book Reservable Resource</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-500 text-xs rounded-xl mb-4 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs font-semibold text-slate-550">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Resource Category *</label>
                  <select
                    value={resourceType}
                    onChange={(e) => {
                      setResourceType(e.target.value as any);
                      setResourceName("");
                    }}
                    className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-350"
                  >
                    <option value="Room">Meeting Room</option>
                    <option value="Vehicle">Department Vehicle</option>
                    <option value="Projector">Media Projector</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Select target resource *</label>
                  <select
                    required
                    value={resourceName}
                    onChange={(e) => setResourceName(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-350"
                  >
                    <option value="">-- Choose resource --</option>
                    {getResources(resourceType).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-750 dark:text-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-755 dark:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Purpose description</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-105/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  rows={3}
                  placeholder="Meeting agenda or physical booking details..."
                />
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
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  Book Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOKING DETAILS DIALOG DRAWER */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-2xl p-6 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold Outfit text-slate-800 dark:text-white">Reservation Details</h3>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Ref ID: {selectedBooking.id}</span>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-slate-400 uppercase text-[9px] font-bold">Category</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedBooking.resource_type}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 uppercase text-[9px] font-bold">Resource</span>
                  <p className="font-bold text-primary-600 dark:text-primary-400">{selectedBooking.resource_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 uppercase text-[9px] font-bold">Booked By</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{getBookedByName(selectedBooking.booked_by_id)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 uppercase text-[9px] font-bold">Current Status</span>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedBooking.status === "Reserved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                    selectedBooking.status === "CheckedIn" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" :
                    selectedBooking.status === "Completed" ? "bg-yellow-105 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" :
                    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl space-y-1">
                <span className="text-slate-400 uppercase text-[9px] font-bold">Time Window</span>
                <p className="font-semibold flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(selectedBooking.start_time).toLocaleString()} - <br/>
                    {new Date(selectedBooking.end_time).toLocaleString()}
                  </span>
                </p>
              </div>

              {/* Purpose */}
              <div className="space-y-1">
                <span className="text-slate-400 uppercase text-[9px] font-bold">Purpose / Agenda</span>
                <p className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl italic font-normal text-slate-600 dark:text-slate-400">
                  {selectedBooking.purpose || "No custom notes entered."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-between space-x-2">
                
                {/* Left side actions: Check-in / Complete */}
                <div className="flex space-x-2">
                  {selectedBooking.status === "Reserved" && (selectedBooking.booked_by_id === user.id || user.role === "admin") && (
                    <button
                      onClick={() => handleStatusUpdate(selectedBooking.id, "CheckedIn")}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors cursor-pointer"
                    >
                      Check In
                    </button>
                  )}
                  {selectedBooking.status === "CheckedIn" && (selectedBooking.booked_by_id === user.id || user.role === "admin") && (
                    <button
                      onClick={() => handleStatusUpdate(selectedBooking.id, "Completed")}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                </div>

                {/* Right side actions: Delete/Cancel */}
                {(selectedBooking.status === "Reserved" || selectedBooking.status === "CheckedIn") && (selectedBooking.booked_by_id === user.id || user.role === "admin") && (
                  <button
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel Booking</span>
                  </button>
                )}
                
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
