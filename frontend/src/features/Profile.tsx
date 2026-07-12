import React, { useState } from "react";
import { User, Shield, Key, History, Save, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUpdateProfile, useChangePassword, useActivityFeed } from "../hooks/useApi";
import { Card, Button, Input } from "../components/ui";
import { Badge } from "../components/ui/Badge";
import { formatDate } from "../lib/utils";
import toast from "react-hot-toast";

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const { data: activities = [], isLoading: loadingLogs } = useActivityFeed();

  // Tab State
  const [activeTab, setActiveTab] = useState<"general" | "security" | "history">("general");

  // Form States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || "");
  
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
      </div>
    );
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) return toast.error("Full name cannot be empty");
    updateProfileMutation.mutate({ fullName: trimmedName, profilePhoto });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    if (currentPw === newPw) {
      toast.error("New password must differ from your current password");
      return;
    }
    changePasswordMutation.mutate(
      { currentPw, newPw },
      {
        onSuccess: () => {
          setCurrentPw("");
          setNewPw("");
          setConfirmPw("");
        }
      }
    );
  };

  // Filter logs for this user only
  const userActivities = activities.filter(
    (act: any) => act.user_id === user.id || act.user_name === user.full_name
  );

  return (
    <div className="space-y-6 font-sans p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold dark:text-white Outfit">My Profile</h1>
        <p className="text-slate-400 text-xs mt-1">Manage credentials, account settings, and track activity history</p>
      </div>

      {/* Header Info Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        <img
          src={user.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`}
          alt={user.full_name}
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary-500/20"
        />
        <div className="text-center md:text-left space-y-1.5 flex-1">
          <div className="flex flex-col md:flex-row md:items-center space-y-1.5 md:space-y-0 md:space-x-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white Outfit">{user.full_name}</h2>
            <div className="flex justify-center space-x-1.5">
              <Badge variant="info">{user.role.toUpperCase().replace("_", " ")}</Badge>
              <Badge variant={user.status === "active" ? "success" : "danger"}>{user.status.toUpperCase()}</Badge>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">{user.email}</p>
          <p className="text-[10px] text-slate-505">Member since {formatDate(user.created_at || new Date().toISOString())}</p>
        </div>
      </div>

      {/* Horizontal Nav Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === "general"
              ? "border-primary-500 text-primary-500 font-bold"
              : "border-transparent text-slate-450 hover:text-slate-205"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>General Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === "security"
              ? "border-primary-500 text-primary-500 font-bold"
              : "border-transparent text-slate-450 hover:text-slate-205"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Credentials & Security</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === "history"
              ? "border-primary-500 text-primary-500 font-bold"
              : "border-transparent text-slate-455 hover:text-slate-205"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>My Activity Audit Log</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "general" && (
          <Card>
            <Card.Header>
              <h3 className="font-bold text-slate-800 dark:text-white Outfit text-sm">Personal Identity Settings</h3>
              <p className="text-slate-405 text-[10px] font-normal mt-0.5">Customize your displayed name and platform profile avatar</p>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <Input
                  label="Display Full Name"
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
                <Input
                  label="Profile Picture URL"
                  value={profilePhoto}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfilePhoto(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/... or leave empty for initials"
                />
                
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={updateProfileMutation.isPending}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        )}

        {activeTab === "security" && (
          <Card>
            <Card.Header>
              <h3 className="font-bold text-slate-800 dark:text-white Outfit text-sm">Update Password</h3>
              <p className="text-slate-405 text-[10px] font-normal mt-0.5">Change your system password. Note: Supabase managed users must manage passwords from Identity provider.</p>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  type="password"
                  label="Current Password"
                  value={currentPw}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Input
                  type="password"
                  label="New Password (min 6 characters)"
                  value={newPw}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Input
                  type="password"
                  label="Confirm New Password"
                  value={confirmPw}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={changePasswordMutation.isPending}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        )}

        {activeTab === "history" && (
          <Card>
            <Card.Header>
              <h3 className="font-bold text-slate-800 dark:text-white Outfit text-sm">Action Logs History</h3>
              <p className="text-slate-400 text-[10px] font-normal mt-0.5">Chronological record of resource requests and security audits logged by your profile</p>
            </Card.Header>
            <Card.Body>
              {loadingLogs ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : userActivities.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400 font-semibold">No recent activity logs found.</p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {userActivities.map((log: any, idx: number) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {idx !== userActivities.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-205 dark:bg-slate-800" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-8 ring-white dark:ring-slate-900">
                                <Shield className="w-4 h-4 text-primary-500" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                  {log.action.replace("_", " ").toUpperCase()}{" "}
                                  <span className="font-normal text-slate-400">({log.target_type} ID: {log.target_id})</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{log.details}</p>
                              </div>
                              <div className="text-right text-[10px] whitespace-nowrap text-slate-500">
                                <time dateTime={log.timestamp}>{formatDate(log.timestamp)}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};
export default Profile;
