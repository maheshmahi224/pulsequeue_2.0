"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Activity, UserPlus } from "lucide-react";
import apiClient from "@/lib/apiClient";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

function Pupil({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }: PupilProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (forceLookX !== undefined && forceLookY !== undefined) { setPos({ x: forceLookX, y: forceLookY }); return; }
    const fn = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
      const angle = Math.atan2(dy, dx);
      setPos({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, [forceLookX, forceLookY, maxDistance]);
  return (
    <div ref={ref} className="rounded-full" style={{ width: size, height: size, backgroundColor: pupilColor, transform: `translate(${pos.x}px,${pos.y}px)`, transition: "transform 0.1s ease-out" }} />
  );
}

interface EyeBallProps { size?: number; pupilSize?: number; maxDistance?: number; eyeColor?: string; pupilColor?: string; isBlinking?: boolean; forceLookX?: number; forceLookY?: number; }
function EyeBall({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY }: EyeBallProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (forceLookX !== undefined && forceLookY !== undefined) { setPos({ x: forceLookX, y: forceLookY }); return; }
    const fn = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
      const angle = Math.atan2(dy, dx);
      setPos({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, [forceLookX, forceLookY, maxDistance]);
  return (
    <div ref={ref} className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{ width: size, height: isBlinking ? 2 : size, backgroundColor: eyeColor, overflow: "hidden" }}>
      {!isBlinking && <div className="rounded-full" style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor, transform: `translate(${pos.x}px,${pos.y}px)`, transition: "transform 0.1s ease-out" }} />}
    </div>
  );
}

type Mode = "patient-login" | "doctor-login" | "register";

interface PatientLoginPageProps { defaultMode?: Mode; }

export default function AnimatedLoginPage({ defaultMode = "patient-login" }: PatientLoginPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [purpleBlink, setPurpleBlink] = useState(false);
  const [blackBlink, setBlackBlink] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lookEachOther, setLookEachOther] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => { const fn = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY }); window.addEventListener("mousemove", fn); return () => window.removeEventListener("mousemove", fn); }, []);

  useEffect(() => {
    const s = () => { const t = setTimeout(() => { setPurpleBlink(true); setTimeout(() => { setPurpleBlink(false); s(); }, 150); }, Math.random() * 4000 + 3000); return t; };
    const t = s(); return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const s = () => { const t = setTimeout(() => { setBlackBlink(true); setTimeout(() => { setBlackBlink(false); s(); }, 150); }, Math.random() * 4000 + 3000); return t; };
    const t = s(); return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (isTyping) { setLookEachOther(true); const t = setTimeout(() => setLookEachOther(false), 800); return () => clearTimeout(t); }
  }, [isTyping]);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const dx = mouse.x - (rect.left + rect.width / 2), dy = mouse.y - (rect.top + rect.height / 3);
    return { faceX: Math.max(-15, Math.min(15, dx / 20)), faceY: Math.max(-10, Math.min(10, dy / 30)), bodySkew: Math.max(-6, Math.min(6, -dx / 120)) };
  };

  const pp = calcPos(purpleRef), bp = calcPos(blackRef), yp = calcPos(yellowRef), op = calcPos(orangeRef);
  const hidingEyes = password.length > 0 && !showPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        const res = await apiClient.post("/auth/patient/register", { name, age: parseInt(age), gender, phone, email, password });
        const data = res.data.data;
        localStorage.setItem("pq_token", data.token);
        localStorage.setItem("pq_role", data.role);
        localStorage.setItem("pq_user_id", data.user_id);
        localStorage.setItem("pq_name", data.name);
        router.push("/dashboard");
      } else if (mode === "patient-login") {
        const res = await apiClient.post("/auth/patient/login", { email, password });
        const data = res.data.data;
        localStorage.setItem("pq_token", data.token);
        localStorage.setItem("pq_role", data.role);
        localStorage.setItem("pq_user_id", data.user_id);
        localStorage.setItem("pq_name", data.name);
        router.push("/dashboard");
      } else {
        const res = await apiClient.post("/auth/doctor/login", { email, password });
        const data = res.data.data;
        localStorage.setItem("pq_token", data.token);
        localStorage.setItem("pq_role", data.role);
        localStorage.setItem("pq_user_id", data.user_id);
        localStorage.setItem("pq_name", data.name);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left – animated characters */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden" style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#1d4ed8 100%)" }}>
        {/* Logo */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">PulseQueue</div>
            <div className="text-xs text-blue-200">AI Triage System</div>
          </div>
        </div>
        {/* Characters */}
        <div className="relative z-20 flex items-end justify-center h-[420px]">
          <div className="relative" style={{ width: 550, height: 400 }}>
            {/* Purple tall */}
            <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700"
              style={{ left: 70, width: 180, height: hidingEyes ? 440 : 400, backgroundColor: "#6C3FF5", borderRadius: "10px 10px 0 0", zIndex: 1,
                transform: hidingEyes ? `skewX(${pp.bodySkew - 12}deg) translateX(40px)` : `skewX(${pp.bodySkew}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-8 transition-all duration-700" style={{ left: lookEachOther ? 55 : 45 + pp.faceX, top: lookEachOther ? 65 : 40 + pp.faceY }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={purpleBlink} forceLookX={lookEachOther ? 3 : undefined} forceLookY={lookEachOther ? 4 : undefined} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={purpleBlink} forceLookX={lookEachOther ? 3 : undefined} forceLookY={lookEachOther ? 4 : undefined} />
              </div>
            </div>
            {/* Black middle */}
            <div ref={blackRef} className="absolute bottom-0 transition-all duration-700"
              style={{ left: 240, width: 120, height: 310, backgroundColor: "#2D2D2D", borderRadius: "8px 8px 0 0", zIndex: 2,
                transform: lookEachOther ? `skewX(${bp.bodySkew * 1.5 + 10}deg) translateX(20px)` : `skewX(${bp.bodySkew}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-6 transition-all duration-700" style={{ left: lookEachOther ? 32 : 26 + bp.faceX, top: lookEachOther ? 12 : 32 + bp.faceY }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#1e3a5f" isBlinking={blackBlink} forceLookX={lookEachOther ? 0 : undefined} forceLookY={lookEachOther ? -4 : undefined} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#1e3a5f" isBlinking={blackBlink} forceLookX={lookEachOther ? 0 : undefined} forceLookY={lookEachOther ? -4 : undefined} />
              </div>
            </div>
            {/* Orange semi-circle */}
            <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700"
              style={{ left: 0, width: 240, height: 200, backgroundColor: "#FF9B6B", borderRadius: "120px 120px 0 0", zIndex: 3,
                transform: `skewX(${op.bodySkew}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-8 transition-all duration-200" style={{ left: 82 + op.faceX, top: 90 + op.faceY }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
              </div>
            </div>
            {/* Yellow round */}
            <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700"
              style={{ left: 310, width: 140, height: 230, backgroundColor: "#E8D754", borderRadius: "70px 70px 0 0", zIndex: 4,
                transform: `skewX(${yp.bodySkew}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-6 transition-all duration-200" style={{ left: 52 + yp.faceX, top: 40 + yp.faceY }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
              </div>
              <div className="absolute w-20 h-1 bg-gray-800 rounded-full transition-all duration-200" style={{ left: 40 + yp.faceX, top: 88 + yp.faceY }} />
            </div>
          </div>
        </div>
        {/* Tagline */}
        <div className="relative z-20">
          <p className="text-blue-200 text-sm">Intelligent triage. Faster care. Better outcomes.</p>
        </div>
        <div className="absolute inset-0 bg-white/5 bg-[size:20px_20px]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)" }} />
      </div>

      {/* Right – form */}
      <div className="flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Activity className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">PulseQueue</span>
          </div>

          {/* Role/Mode tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button onClick={() => { setMode("patient-login"); setError(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "patient-login" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Patient Login</button>
            <button onClick={() => { setMode("doctor-login"); setError(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "doctor-login" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Doctor Login</button>
            <button onClick={() => { setMode("register"); setError(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${mode === "register" ? "bg-white shadow text-green-600" : "text-gray-500 hover:text-gray-700"}`}><UserPlus className="w-3.5 h-3.5" />Register</button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "register" ? "Create Patient Account" : mode === "doctor-login" ? "Doctor Login" : "Patient Login"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "register" ? "Register as a new patient" : "Enter your credentials to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required placeholder="Venkata Ramaiah Naidu" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} required placeholder="35" min="1" max="119" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="9848012345" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required placeholder={mode === "doctor-login" ? "dr.srinivasa@pulsequeue.health" : "patient@example.com"} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all text-sm">
              {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
            </button>
          </form>

          {mode !== "register" && (
            <div className="mt-4 text-center text-sm text-gray-500">
              New patient?{" "}
              <button onClick={() => { setMode("register"); setError(""); }} className="text-blue-600 font-medium hover:underline">Create account</button>
            </div>
          )}
          {mode === "register" && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Already registered?{" "}
              <button onClick={() => { setMode("patient-login"); setError(""); }} className="text-blue-600 font-medium hover:underline">Sign in</button>
            </div>
          )}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-700">
            <strong>Demo:</strong> Patient: vramaiah@mail.com / patient123<br />
            Doctor: dr.srinivasa@pulsequeue.health / doctor123
          </div>
        </div>
      </div>
    </div>
  );
}
