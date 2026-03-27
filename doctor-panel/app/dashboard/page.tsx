"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Users, Clock, Activity } from "lucide-react";
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

export default function DoctorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get("/doctor/analytics"),
      apiClient.get("/doctor/queue")
    ]).then(([statsRes, queueRes]) => {
      setStats(statsRes.data.data);
      setQueue(queueRes.data.data.queue || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const highRisk = queue.filter(p => p.priority === "HIGH");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Triage Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time clinical operations overview</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Today" value={stats?.total_patients ?? 0} icon={Users} color="text-blue-400" bg="bg-blue-900/30" />
          <StatCard label="High Risk" value={stats?.high_risk ?? 0} icon={AlertTriangle} color="text-red-400" bg="bg-red-900/30" />
          <StatCard label="Medium Risk" value={stats?.medium_risk ?? 0} icon={Activity} color="text-orange-400" bg="bg-orange-900/30" />
          <StatCard label="In Queue" value={stats?.queue_size ?? queue.length} icon={Clock} color="text-green-400" bg="bg-green-900/30" />
        </div>
      )}

      {highRisk.length > 0 && (
        <div className="bg-red-950/40 border border-red-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-300">⚠ High Risk Patients Requiring Attention</h2>
          </div>
          <div className="space-y-2">
            {highRisk.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-red-900/40 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{p.name}</div>
                  <div className="text-xs text-red-400">{p.symptoms?.slice(0, 50)}...</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-400">Risk: {p.risk_score}</div>
                  <div className="text-xs text-gray-500">Queue #{p.queue_position}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Priority Distribution</h2>
        <div className="space-y-3">
          {[
            { label: "HIGH", count: stats?.high_risk || 0, color: "bg-red-500", total: stats?.total_patients || 1 },
            { label: "MEDIUM", count: stats?.medium_risk || 0, color: "bg-orange-500", total: stats?.total_patients || 1 },
            { label: "LOW", count: stats?.low_risk || 0, color: "bg-green-500", total: stats?.total_patients || 1 },
          ].map(({ label, count, color, total }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{label}</span><span>{count}</span></div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
