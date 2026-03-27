"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Activity, Heart, Shield, Brain } from "lucide-react";
import apiClient from "@/lib/apiClient";

// Floating animated orb
function Orb({ size, color, delay, top, left }: { size: number; color: string; delay: number; top: string; left: string }) {
  return (
    <div
      className="absolute rounded-full opacity-20 blur-2xl pointer-events-none"
      style={{
        width: size, height: size, background: color,
        top, left,
        animation: `float ${3 + delay}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post("/auth/doctor/login", { email, password });
      const data = res.data.data;
      localStorage.setItem("pq_token", data.token);
      localStorage.setItem("pq_role", data.role);
      localStorage.setItem("pq_user_id", data.user_id);
      localStorage.setItem("pq_name", data.name);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 overflow-hidden">
        {/* Background orbs */}
        <Orb size={300} color="#93c5fd" delay={0} top="-10%" left="-10%" />
        <Orb size={200} color="#a5b4fc" delay={1} top="40%" left="60%" />
        <Orb size={150} color="#bfdbfe" delay={2} top="70%" left="10%" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/30">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg">PulseQueue</div>
            <div className="text-blue-200 text-xs">Doctor Command Center</div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Clinical Intelligence<br />
              <span className="text-blue-200">At Your Fingertips</span>
            </h2>
            <p className="text-blue-200 mt-3 text-sm leading-relaxed max-w-xs">
              AI-powered triage, real-time queue management, and instant clinical insights for modern healthcare.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-2">
            {[
              { icon: Brain, label: "AI-Powered Triage", desc: "Instant risk assessment" },
              { icon: Heart, label: "Real-time Monitoring", desc: "Live patient queue" },
              { icon: Shield, label: "Clinical Decision Support", desc: "Evidence-based guidance" },
            ].map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                className={`flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/20 transition-all duration-500 ${
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
                }`}
                style={{ transitionDelay: `${i * 150 + 300}ms` }}
              >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white text-xs font-semibold">{label}</div>
                  <div className="text-blue-200 text-xs">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-blue-300 text-xs">
          Secure · HIPAA Compliant · End-to-end encrypted
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">PulseQueue</span>
          </div>

          <div className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-blue-700 font-semibold">Doctor Access Portal</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to access the triage command center</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doctor Email</label>
                <div className={`relative border rounded-xl transition-all duration-200 ${
                  focused === "email" ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
                } bg-white`}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    required
                    placeholder="dr.srinivasa@pulsequeue.health"
                    className="w-full px-4 py-3.5 bg-transparent rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className={`relative border rounded-xl transition-all duration-200 ${
                  focused === "password" ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
                } bg-white`}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 pr-12 bg-transparent rounded-xl text-sm text-gray-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-scale-in">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">!</div>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-all duration-200 text-sm shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Access Command Center
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">i</span>
                </div>
                <span className="text-xs font-semibold text-blue-700">Demo Credentials</span>
              </div>
              <div className="text-xs text-blue-600 space-y-0.5">
                <div>📧 dr.srinivasa@pulsequeue.health</div>
                <div>🔑 doctor123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
