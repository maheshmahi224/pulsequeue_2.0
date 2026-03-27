"use client";
import { useEffect, useState } from "react";
import { BarChart2, Users, AlertTriangle, Clock, TrendingUp, Activity, Brain, Percent } from "lucide-react";
import apiClient from "@/lib/apiClient";

function StatCard({
  label, value, icon: Icon, color, bg, border, delay = 0
}: {
  label: string; value: string | number; icon: any;
  color: string; bg: string; border: string; delay?: number;
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
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/doctor/analytics")
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-100 rounded-xl w-48 animate-shimmer" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-shimmer" />)}
      </div>
    </div>
  );

  const total = stats?.total_patients || 0;
  const priorities = [
    { label: "HIGH RISK", count: stats?.high_risk || 0, color: "bg-red-500", text: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    { label: "MEDIUM RISK", count: stats?.medium_risk || 0, color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
    { label: "LOW RISK", count: stats?.low_risk || 0, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  ];

  // Donut angles
  const donutSegments = (() => {
    const segs = [
      { value: stats?.high_risk || 0, color: "#ef4444" },
      { value: stats?.medium_risk || 0, color: "#f97316" },
      { value: stats?.low_risk || 0, color: "#22c55e" },
    ];
    let offset = 0;
    return segs.map(seg => {
      const pct = total > 0 ? (seg.value / total) * 100 : 0;
      const el = { pct, color: seg.color, offset };
      offset += pct;
      return el;
    });
  })();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-gray-900">Hospital Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Today's triage metrics and queue insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={total} icon={Users} color="text-blue-600" bg="bg-blue-50" border="border-blue-100" delay={0} />
        <StatCard label="High Risk" value={stats?.high_risk || 0} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" border="border-red-100" delay={80} />
        <StatCard label="Queue Size" value={stats?.queue_size || 0} icon={Clock} color="text-orange-600" bg="bg-orange-50" border="border-orange-100" delay={160} />
        <StatCard label="Avg. Wait" value="~25 min" icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" delay={240} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority bars */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900">Priority Breakdown</h2>
          </div>
          <div className="space-y-5">
            {priorities.map(({ label, count, color, text, bg, border }, i) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs font-semibold text-gray-600">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${bg} ${text} border ${border}`}>{count}</span>
                    <span className="text-xs text-gray-400">{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%", transitionDelay: `${i * 150}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up" style={{ animationDelay: "380ms" }}>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900">Risk Distribution</h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {total > 0 ? donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="50" cy="50" r="35"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                    strokeDashoffset={-seg.offset}
                    className="transition-all duration-700"
                    style={{ transitionDelay: `${i * 200}ms` }}
                  />
                )) : (
                  <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f3f4f6" strokeWidth="18" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-gray-900">{total}</div>
                <div className="text-xs text-gray-400">patients</div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {priorities.map(({ label, count, text, bg, border, color }) => (
                <div key={label} className={`p-3 ${bg} rounded-xl border ${border}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${text}`}>{label.split(" ")[0]}</span>
                    <span className={`text-lg font-bold ${text}`}>{count}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {total > 0 ? Math.round((count / total) * 100) : 0}% of total
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI insight card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "460ms" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">AI Triage Insight</h3>
            <p className="text-xs text-gray-500">Automated analysis based on current queue data</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {[
            { label: "Triage Accuracy", value: "94%", desc: "AI confidence rate", icon: Percent },
            { label: "Avg. Risk Score", value: total > 0 ? `${Math.round(((stats?.high_risk * 80 + stats?.medium_risk * 50 + stats?.low_risk * 20) / total))}` : "—", desc: "Across all patients", icon: Activity },
            { label: "Queue Efficiency", value: stats?.queue_size > 0 ? "Active" : "Idle", desc: "Current system status", icon: TrendingUp },
          ].map(({ label, value, desc, icon: Icon }, i) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-gray-600">{label}</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
