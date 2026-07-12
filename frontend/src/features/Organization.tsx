import React, { useState } from "react";
import {
  Users,
  GitBranch,
  Settings,
  FolderOpen,
  Plus,
  Shield,
  Trash2,
  Edit,
  UserCheck,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  Mail
} from "lucide-react";
import {
  useEmployees,
  useDepartments,
  useAssetCategories,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useCreateAssetCategory,
  useUpdateAssetCategory,
  useDeleteAssetCategory,
  usePromoteEmployee,
  useUpdateEmployeeStatus,
  useAssignEmployeeDepartment
} from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import type { Employee, Department } from "../types";

export const Organization: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Data queries
  const { data: employees = [], isLoading: loadingEmps } = useEmployees();
  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const { data: categories = [], isLoading: loadingCats } = useAssetCategories();

  // Mutations
  const createDeptMutation = useCreateDepartment();
  const updateDeptMutation = useUpdateDepartment();
  const deleteDeptMutation = useDeleteDepartment();
  
  const createCatMutation = useCreateAssetCategory();
  const updateCatMutation = useUpdateAssetCategory();
  const deleteCatMutation = useDeleteAssetCategory();

  const promoteMutation = usePromoteEmployee();
  const statusMutation = useUpdateEmployeeStatus();
  const assignDeptMutation = useAssignEmployeeDepartment();

  // Tab state
  const [activeTab, setActiveTab] = useState<"depts" | "employees" | "categories" | "rbac">("depts");

  // Filtering & Pagination for directory
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [deptModal, setDeptModal] = useState<{ show: boolean; mode: "create" | "edit"; data?: Department }>({
    show: false,
    mode: "create",
  });
  const [deptName, setDeptName] = useState("");
  const [parentDeptId, setParentDeptId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");

  const [catModal, setCatModal] = useState<{ show: boolean; mode: "create" | "edit"; data?: any }>({
    show: false,
    mode: "create",
  });
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [assignDeptModal, setAssignDeptModal] = useState<{ show: boolean; emp?: Employee }>({
    show: false,
  });
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  // Helpers
  const getManagerName = (managerId?: number) => {
    if (!managerId) return "Unassigned";
    const emp = employees.find((e: Employee) => e.id === managerId);
    return emp ? emp.full_name : `ID: ${managerId}`;
  };

  const getDeptName = (deptId?: number) => {
    if (!deptId) return "No Department";
    const dept = departments.find((d: Department) => d.id === deptId);
    return dept ? dept.name : `ID: ${deptId}`;
  };

  // Directory Filtering
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp: Employee) => {
      const matchesSearch =
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || emp.role === roleFilter;
      const matchesDept =
        deptFilter === "all" ||
        (deptFilter === "none" && !emp.department_id) ||
        String(emp.department_id) === deptFilter;
      return matchesSearch && matchesRole && matchesDept;
    });
  }, [employees, searchQuery, roleFilter, deptFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = React.useMemo(() => {
    return filteredEmployees.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredEmployees, currentPage, itemsPerPage]);

  // Open modals
  const openDeptCreate = () => {
    setDeptName("");
    setParentDeptId("");
    setManagerId("");
    setDeptModal({ show: true, mode: "create" });
  };

  const openDeptEdit = (dept: Department) => {
    setDeptName(dept.name);
    setParentDeptId(dept.parent_id ? String(dept.parent_id) : "");
    setManagerId(dept.manager_id ? String(dept.manager_id) : "");
    setDeptModal({ show: true, mode: "edit", data: dept });
  };

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;

    const parentIdIdx = parentDeptId ? parseInt(parentDeptId) : undefined;
    const managerIdIdx = managerId ? parseInt(managerId) : undefined;

    if (deptModal.mode === "create") {
      createDeptMutation.mutate(
        { name: deptName, managerId: managerIdIdx },
        {
          onSuccess: (newDept) => {
            // If parent specified, link it using update
            if (parentIdIdx) {
              updateDeptMutation.mutate({
                deptId: newDept.id,
                name: newDept.name,
                parentId: parentIdIdx,
                managerId: managerIdIdx
              });
            }
            setDeptModal({ show: false, mode: "create" });
          }
        }
      );
    } else {
      if (deptModal.data) {
        updateDeptMutation.mutate(
          {
            deptId: deptModal.data.id,
            name: deptName,
            parentId: parentIdIdx,
            managerId: managerIdIdx
          },
          {
            onSuccess: () => {
              setDeptModal({ show: false, mode: "create" });
            }
          }
        );
      }
    }
  };

  const handleDeleteDept = (id: number) => {
    if (confirm("Are you sure you want to delete this department? Sub-departments and members will be unlinked.")) {
      deleteDeptMutation.mutate(id);
    }
  };

  // Category CRUD
  const openCatCreate = () => {
    setCatName("");
    setCatDesc("");
    setCatModal({ show: true, mode: "create" });
  };

  const openCatEdit = (cat: any) => {
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatModal({ show: true, mode: "edit", data: cat });
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    
    if (catModal.mode === "create") {
      createCatMutation.mutate({ name: catName, description: catDesc }, {
        onSuccess: () => setCatModal({ show: false, mode: "create" })
      });
    } else {
      updateCatMutation.mutate({ id: catModal.data.id, name: catName, description: catDesc }, {
        onSuccess: () => setCatModal({ show: false, mode: "create" })
      });
    }
  };

  const handleDeleteCat = (id: number) => {
    if (confirm("Delete this category? Already registered assets will hold category string but dynamic definitions will clear.")) {
      deleteCatMutation.mutate(id);
    }
  };

  // Directory Depart Assignment Modal
  const openAssignDept = (emp: Employee) => {
    setSelectedDeptId(emp.department_id ? String(emp.department_id) : "");
    setAssignDeptModal({ show: true, emp });
  };

  const handleAssignDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDeptModal.emp) return;
    const deptVal = selectedDeptId ? parseInt(selectedDeptId) : undefined;
    assignDeptMutation.mutate(
      { empId: assignDeptModal.emp.id, deptId: deptVal },
      {
        onSuccess: () => setAssignDeptModal({ show: false })
      }
    );
  };

  // Render Department Tree
  const renderDeptTree = (parentId: number | null, depth: number = 0): React.ReactNode => {
    const list = departments.filter((d: Department) => d.parent_id === (parentId === null ? null : parentId));
    if (list.length === 0) return null;

    return (
      <div className={`space-y-3 ${depth > 0 ? "ml-6 pl-4 border-l border-slate-200 dark:border-slate-800" : ""}`}>
        {list.map((dept: Department) => {
          const subCount = departments.filter((dFromList: Department) => dFromList.parent_id === dept.id).length;
          const memberCount = employees.filter((e: Employee) => e.department_id === dept.id).length;

          return (
            <div key={dept.id} className="space-y-2">
              <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 flex justify-between items-center transition-all hover:border-primary-500/30">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                      {dept.name}
                      {subCount > 0 && (
                        <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold font-sans">
                          {subCount} Sub-Dept
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-400 font-medium">
                      <span>Manager: <strong className="text-slate-600 dark:text-slate-300">{getManagerName(dept.manager_id)}</strong></span>
                      <span>•</span>
                      <span>Members: <strong className="text-slate-600 dark:text-slate-300">{memberCount}</strong></span>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" isIcon leftIcon={<Edit className="w-3.5 h-3.5" />} onClick={() => openDeptEdit(dept)} />
                    <Button size="sm" variant="ghost" isIcon leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={() => handleDeleteDept(dept.id)} />
                  </div>
                )}
              </div>
              {renderDeptTree(dept.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold dark:text-white Outfit">Organization Directory</h1>
          <p className="text-slate-400 text-xs mt-1">Manage departmental hierarchies, directory permissions, and configuration schema</p>
        </div>

        {/* Global actions depending on tab */}
        {isAdmin && activeTab === "depts" && (
          <Button onClick={openDeptCreate} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Create Department
          </Button>
        )}
        {isAdmin && activeTab === "categories" && (
          <Button onClick={openCatCreate} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Create Category
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("depts")}
          className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === "depts" ? "border-primary-500 text-primary-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Department Hierarchies</span>
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === "employees" ? "border-primary-500 text-primary-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employee Directory</span>
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === "categories" ? "border-primary-500 text-primary-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Asset Categories</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("rbac")}
            className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === "rbac" ? "border-primary-500 text-primary-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role Promotes (RBAC)</span>
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "depts" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider">Corporate Structure</h3>
            {loadingDepts ? (
              <div className="h-40 bg-white dark:bg-slate-900 rounded-2xl animate-pulse flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : departments.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No departments created yet. Build organizational layout by adding departments.
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Find root node structures where parent_id is missing */}
                {renderDeptTree(null)}
              </div>
            )}
          </div>
        )}

        {activeTab === "employees" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name, email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="w-full md:w-48 text-xs">
                <Select
                  value={roleFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: "all", label: "Filter: All Roles" },
                    { value: "admin", label: "Admin" },
                    { value: "asset_manager", label: "Asset Manager" },
                    { value: "department_head", label: "Department Head" },
                    { value: "employee", label: "Employee" }
                  ]}
                />
              </div>

              <div className="w-full md:w-48 text-xs">
                <Select
                  value={deptFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: "all", label: "Filter: All Depts" },
                    { value: "none", label: "No Department" },
                    ...departments.map((d: Department) => ({ value: String(d.id), label: d.name }))
                  ]}
                />
              </div>
            </div>

            {loadingEmps ? (
              <div className="h-40 bg-white dark:bg-slate-900 rounded-2xl animate-pulse flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No employee directory records match the active criteria filters.
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="glass-panel rounded-xl overflow-hidden border border-slate-205 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Employee details</th>
                          <th className="p-4">Department</th>
                          <th className="p-4">Clearance</th>
                          <th className="p-4">Status</th>
                          {isAdmin && <th className="p-4 text-right">Settings</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {paginatedEmployees.map((emp: Employee) => (
                          <tr key={emp.id} className="hover:bg-slate-550/30 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 flex items-center space-x-3">
                              <img
                                src={emp.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.full_name}`}
                                alt={emp.full_name}
                                className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                              />
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{emp.full_name}</p>
                                <span className="text-[10px] text-slate-400 block font-normal flex items-center">
                                  <Mail className="w-3 h-3 mr-1 inline" /> {emp.email}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-500 dark:text-slate-400">{getDeptName(emp.department_id)}</span>
                            </td>
                            <td className="p-4">
                              <Badge variant="info">{emp.role.toUpperCase().replace("_", " ")}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant={emp.status === "active" ? "success" : "danger"}>
                                {emp.status}
                              </Badge>
                            </td>
                            {isAdmin && (
                              <td className="p-4 text-right">
                                <Button size="sm" variant="ghost" onClick={() => openAssignDept(emp)} leftIcon={<UserCheck className="w-3.5 h-3.5 text-primary-500" />}>
                                  Assign Dept
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-2 py-4">
                    <span className="text-[10px] text-slate-405">
                      Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} profiles
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(c => c - 1)}
                      >
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(c => c + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider">Dynamic Asset Configurations</h3>
            {loadingCats ? (
              <div className="h-40 bg-white dark:bg-slate-900 rounded-2xl animate-pulse flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : categories.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No asset categories defined. Add categories to structure purchase logs.
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat: any) => (
                  <Card key={cat.id}>
                    <Card.Header>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 dark:text-white Outfit text-sm">{cat.name}</h4>
                        {isAdmin && (
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost" isIcon leftIcon={<Edit className="w-3.5 h-3.5" />} onClick={() => openCatEdit(cat)} />
                            <Button size="sm" variant="ghost" isIcon leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={() => handleDeleteCat(cat.id)} />
                          </div>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <p className="text-slate-400 text-xs font-medium min-h-[40px] leading-relaxed">
                        {cat.description || "No descriptive details configured for this category type."}
                      </p>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "rbac" && isAdmin && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider font-semibold">RBAC Policies workspace</h3>
            <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-205 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="p-3">Member</th>
                    <th className="p-3">Assign clearance</th>
                    <th className="p-3">Login access status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.map((emp: Employee) => (
                    <tr key={emp.id}>
                      <td className="p-3 py-4 flex items-center space-x-3">
                        <img
                          src={emp.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.full_name}`}
                          alt={emp.full_name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{emp.full_name}</p>
                          <span className="text-[10px] text-slate-400 block font-normal">{emp.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <select
                          value={emp.role}
                          onChange={(e) => promoteMutation.mutate({ id: emp.id, role: e.target.value })}
                          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                        >
                          <option value="admin">Admin</option>
                          <option value="asset_manager">Asset Manager</option>
                          <option value="department_head">Department Head</option>
                          <option value="employee">Employee</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => statusMutation.mutate({ empId: emp.id, status: emp.status === "active" ? "suspended" : "active" })}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              emp.status === "active"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-550 border border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}
                          >
                            {emp.status === "active" ? "Suspend account" : "Activate login"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Department Modal */}
      <Modal
        open={deptModal.show}
        onClose={() => setDeptModal({ show: false, mode: "create" })}
        title={deptModal.mode === "create" ? "Create Corporate Department" : "Modify Department Details"}
      >
        <form onSubmit={handleDeptSubmit} className="space-y-4">
          <Input
            label="Department Name"
            type="text"
            required
            value={deptName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeptName(e.target.value)}
            placeholder="e.g. Finance, Sales..."
          />

          <div className="space-y-1 text-xs">
            <label className="text-slate-400 font-semibold">Parent Department</label>
            <select
              value={parentDeptId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParentDeptId(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
            >
              <option value="">-- Root Level Department  (No Parent) --</option>
              {departments
                .filter((d: Department) => !deptModal.data || d.id !== deptModal.data.id)
                .map((d: Department) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-slate-400 font-semibold">Assign Manager</label>
            <select
              value={managerId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManagerId(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
            >
              <option value="">-- Choose Employee Manager --</option>
              {employees.map((emp: Employee) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2 pt-4 justify-end">
            <Button type="button" variant="outline" onClick={() => setDeptModal({ show: false, mode: "create" })}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createDeptMutation.isPending || updateDeptMutation.isPending}>
              Save Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category CRUD Modal */}
      <Modal
        open={catModal.show}
        onClose={() => setCatModal({ show: false, mode: "create" })}
        title={catModal.mode === "create" ? "Add Asset Category" : "Edit Category Specifications"}
      >
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <Input
            label="Category Name"
            type="text"
            required
            value={catName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCatName(e.target.value)}
            placeholder="e.g. Servers, Mobile Phones..."
          />
          <Textarea
            label="Description Details"
            value={catDesc}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCatDesc(e.target.value)}
            placeholder="Provide context explaining the asset classifications..."
          />
          <div className="flex space-x-2 pt-4 justify-end">
            <Button type="button" variant="outline" onClick={() => setCatModal({ show: false, mode: "create" })}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createCatMutation.isPending || updateCatMutation.isPending}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Directory Dept Assignment Modal */}
      <Modal
        open={assignDeptModal.show}
        onClose={() => setAssignDeptModal({ show: false })}
        title="Assign Corporate Department"
      >
        <form onSubmit={handleAssignDeptSubmit} className="space-y-4">
          {assignDeptModal.emp && (
            <p className="text-xs text-slate-400">
              Choose department mapping for employee <strong className="text-slate-800 dark:text-white">{assignDeptModal.emp.full_name}</strong>:
            </p>
          )}
          <div className="space-y-1 text-xs">
            <label className="text-slate-400 font-semibold">Corporate Department</label>
            <select
              value={selectedDeptId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 text-slate-700 dark:text-slate-300"
            >
              <option value="">-- Link to No Department (Unassigned) --</option>
              {departments.map((d: Department) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2 pt-4 justify-end">
            <Button type="button" variant="outline" onClick={() => setAssignDeptModal({ show: false })}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={assignDeptMutation.isPending}>
              Assign mapping
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Organization;
