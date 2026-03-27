"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Users, Clock, Activity, RefreshCw, ChevronRight,
  TrendingUp, Brain, FileText, ArrowUpRight, Heart, Shield, BarChart2
} from "lucide-react";
import apiClient from "@/lib/apiClient";

/* ─── Animated Counter ─────────────────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = ref.current;
    const end = value;
    if (start === end) return;
    const step = Math.ceil(Math.abs(end - start) / 20);
    const interval = setInterval(() => {
      ref.current = start < end
        ? Math.min(ref.current + step, end)
        : Math.max(ref.current - step, end);
      setDisplay(ref.current);
      if (ref.current === end) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [value]);
  return <>{display}</>;
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color, bg, border, trend, delay = 0
}: {
  label: string; value: number; icon: any; color: string; bg: string;
  border: string; trend?: string; delay?: number;
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 border ${border} shadow-sm stat-card-hover animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">
        <AnimatedNumber value={value} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

/* ─── Priority Badge ─────────────────────────────────────────────────── */
function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "HIGH") return <span className="priority-high">HIGH</span>;
  if (priority === "MEDIUM") return <span className="priority-medium">MED</span>;
  return <span className="priority-low">LOW</span>;
}

/* ─── Risk Meter ─────────────────────────────────────────────────────── */
function RiskMeter({ score }: { score: number }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#22c55e";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────────── */
export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsRes, queueRes] = await Promise.all([
        apiClient.get("/doctor/analytics"),
        apiClient.get("/doctor/queue"),
      ]);
      setStats(statsRes.data.data);
      setQueue(queueRes.data.data.queue || []);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const highRisk = queue.filter(p => p.priority === "HIGH");
  const total = stats?.total_patients ?? 0;

  const quickActions = [
    { href: "/dashboard/queue", label: "View Full Queue", desc: "Manage all patients", icon: Users, color: "from-blue-500 to-blue-600", shadow: "shadow-blue-200" },
    { href: "/dashboard/reports", label: "Patient Reports", desc: "Review AI analyses", icon: FileText, color: "from-violet-500 to-violet-600", shadow: "shadow-violet-200" },
    { href: "/dashboard/analytics", label: "Analytics", desc: "Hospital insights", icon: BarChart2, color: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-100 rounded-xl w-48 animate-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Triage Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Last updated {lastUpdated.toLocaleTimeString()} ·{" "}
            <span className="text-blue-500 font-medium">{total} patients today</span>
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Today" value={total} icon={Users}
          color="text-blue-600" bg="bg-blue-50" border="border-blue-100"
          trend="Active triage" delay={0}
        />
        <StatCard
          label="High Risk" value={stats?.high_risk ?? 0} icon={AlertTriangle}
          color="text-red-600" bg="bg-red-50" border="border-red-100"
          trend={highRisk.length > 0 ? `${highRisk.length} need attention` : "All stable"}
          delay={80}
        />
        <StatCard
          label="Medium Risk" value={stats?.medium_risk ?? 0} icon={Activity}
          color="text-orange-600" bg="bg-orange-50" border="border-orange-100"
          delay={160}
        />
        <StatCard
          label="In Queue" value={stats?.queue_size ?? queue.length} icon={Clock}
          color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100"
          trend="Live count" delay={240}
        />
      </div>

      {/* High risk alert */}
      {highRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-800">⚠ Critical Patients</h2>
                <p className="text-xs text-red-500">{highRisk.length} patient{highRisk.length !== 1 ? "s" : ""} require immediate attention</p>
              </div>
            </div>
            <Link href="/dashboard/queue" className="btn-danger text-xs flex items-center gap-1.5">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {highRisk.slice(0, 4).map((p, i) => (
              <div
                key={i}
                onClick={() => router.push(`/dashboard/queue/${p.report_id}`)}
                className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-red-100 hover:border-red-300 cursor-pointer transition-all duration-200 hover:shadow-md group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-xs font-bold shrink-0">
                  #{p.queue_position}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{p.symptoms?.slice(0, 55)}…</div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <RiskMeter score={p.risk_score} />
                  <div className="text-xs text-gray-400">{p.waiting_minutes ?? 0}min wait</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 animate-fade-in">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className={`relative overflow-hidden bg-gradient-to-br ${action.color} text-white rounded-2xl p-5 flex items-center justify-between shadow-lg ${action.shadow} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group animate-slide-up`}
              style={{ animationDelay: `${i * 80 + 300}ms` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity">
                <action.icon className="w-full h-full" />
              </div>
              <div>
                <div className="font-bold text-sm mb-0.5">{action.label}</div>
                <div className="text-white/70 text-xs">{action.desc}</div>
              </div>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
                <action.icon className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-900">Priority Distribution</h2>
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <div className="space-y-4">
            {[
              { label: "HIGH", count: stats?.high_risk || 0, color: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
              { label: "MEDIUM", count: stats?.medium_risk || 0, color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
              { label: "LOW", count: stats?.low_risk || 0, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(({ label, count, color, text, bg }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs font-semibold text-gray-600">{label}</span>
                  </div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${bg} ${text}`}>{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live queue preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "480ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-900">Live Queue Preview</h2>
            <Link href="/dashboard/queue" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Heart className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Queue is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  onClick={() => router.push(`/dashboard/queue/${p.report_id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold shrink-0 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {p.queue_position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 truncate">{p.symptoms?.slice(0, 40)}…</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={p.priority} />
                    <Shield className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


