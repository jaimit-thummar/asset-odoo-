import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, KeyRound, Mail, User, ArrowRight, CornerDownLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../lib/constants";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        if (!fullName || !email || !password) {
          throw new Error("Please fill out all fields.");
        }
        await api.signup(email, password, fullName);
        setSuccessMsg("Registration successful! You can now log in below.");
        setIsSignUp(false);
        setPassword("");
      } else {
        if (!email || !password) {
          throw new Error("Please enter your email and password.");
        }
        const data = await api.login(email, password);
        // Persist to auth store — ProtectedRoute will handle redirect
        const fullUser = await api.getMe();
        login(fullUser, data.access_token);
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setSuccessMsg(`Password reset link sent to ${forgotEmail}. Please check your inbox.`);
    setShowForgot(false);
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans select-none">
      {/* Decorative gradient glowing spots */}
      <div className="absolute top-[20%] left-[20%] w-[35rem] h-[35rem] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[35rem] h-[35rem] bg-accent-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md p-8 glass-panel border border-slate-800 bg-slate-900/60 dark:shadow-2xl rounded-2xl z-10 m-4">
        {/* Brand Banner */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            AssetFlow Pro
          </h2>
          <p className="text-xs text-slate-400 mt-1">Enterprise Asset &amp; Resource Management</p>
        </div>

        {/* Demo credentials hint */}
        <div className="mb-5 p-3 bg-primary-950/30 border border-primary-800/30 rounded-xl text-[11px] text-primary-300 space-y-0.5">
          <p className="font-bold mb-1 text-primary-200">Demo credentials:</p>
          <p>admin@assetflow.com · <span className="opacity-60">any password 6+ chars</span></p>
          <p>manager@assetflow.com · employee@assetflow.com</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-medium">
            {successMsg}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showForgot ? (
            <motion.form
              key={isSignUp ? "signup" : "login"}
              initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      placeholder="e.g. David Chen"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {!isSignUp && (
                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary-400 hover:underline">
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-2.5 font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary-600/20 active:translate-y-0.5 mt-6 disabled:opacity-50"
              >
                <span>{loading ? "Authenticating…" : isSignUp ? "Sign Up As Employee" : "Enter Platform"}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccessMsg(""); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {isSignUp ? (
                    <span>Already have a key? <strong className="text-primary-400">Log In</strong></span>
                  ) : (
                    <span>New user? <strong className="text-primary-400">Create Employee Account</strong></span>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleForgotPassword}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-2.5 font-semibold text-sm transition-all">
                Send Verification Link
              </button>
              <button type="button" onClick={() => setShowForgot(false)} className="w-full text-xs text-slate-500 hover:text-white text-center mt-2 flex items-center justify-center space-x-1.5">
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-6 text-[10px] text-slate-600 select-none">
        AssetFlow Pro ERP • Authorized Personnel Only
      </div>
    </div>
  );
};
