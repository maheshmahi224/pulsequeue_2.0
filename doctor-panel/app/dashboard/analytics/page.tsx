"use client";
import { useEffect, useState } from "react";
import { BarChart2, Users, AlertTriangle, Clock } from "lucide-react";
import apiClient from "@/lib/apiClient";

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: any; color: string; bg: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/doctor/analytics").then(res => setStats(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl animate-pulse" />)}</div>;

  const total = stats?.total_patients || 0;
  const priorities = [
    { label: "HIGH RISK", count: stats?.high_risk || 0, color: "bg-red-500", textColor: "text-red-400" },
    { label: "MEDIUM RISK", count: stats?.medium_risk || 0, color: "bg-orange-500", textColor: "text-orange-400" },
    { label: "LOW RISK", count: stats?.low_risk || 0, color: "bg-green-500", textColor: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Hospital Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Today's triage and queue metrics</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients Today" value={total} icon={Users} color="text-blue-400" bg="bg-blue-900/30" />
        <StatCard label="High Risk" value={stats?.high_risk || 0} icon={AlertTriangle} color="text-red-400" bg="bg-red-900/30" />
        <StatCard label="Queue Size" value={stats?.queue_size || 0} icon={Clock} color="text-orange-400" bg="bg-orange-900/30" />
        <StatCard label="Avg. Wait" value="~25 min" icon={BarChart2} color="text-green-400" bg="bg-green-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Priority Distribution</h2>
          <div className="space-y-4">
            {priorities.map(({ label, count, color, textColor }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                  <span className="text-sm font-bold text-white">{count} <span className="text-gray-500 font-normal">patients</span></span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie donut visual */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Risk Overview</h2>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {total > 0 ? (() => {
                  const segments = [
                    { value: stats?.high_risk || 0, color: "#ef4444" },
                    { value: stats?.medium_risk || 0, color: "#f97316" },
                    { value: stats?.low_risk || 0, color: "#22c55e" },
                  ];
                  let offset = 0;
                  return segments.map((seg, i) => {
                    const pct = (seg.value / total) * 100;
                    const el = <circle key={i} cx="50" cy="50" r="35" fill="transparent" stroke={seg.color} strokeWidth="20" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset} />;
                    offset += pct;
                    return el;
                  });
                })() : <circle cx="50" cy="50" r="35" fill="transparent" stroke="#374151" strokeWidth="20" />}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-white">{total}</div>
                <div className="text-xs text-gray-500">total</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {priorities.map(({ label, count, textColor }) => (
              <div key={label} className="text-center">
                <div className={`text-lg font-bold ${textColor}`}>{count}</div>
                <div className="text-xs text-gray-600">{label.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
