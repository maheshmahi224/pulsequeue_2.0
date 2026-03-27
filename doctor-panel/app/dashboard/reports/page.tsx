"use client";
import { useEffect, useState } from "react";
import { FileText, Clock, AlertTriangle } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { HIGH: "bg-red-900/50 text-red-300", MEDIUM: "bg-orange-900/50 text-orange-300", LOW: "bg-green-900/50 text-green-300" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[priority] || "bg-gray-800 text-gray-400"}`}>{priority}</span>;
}

export default function ReportsPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/doctor/queue").then(res => setQueue(res.data.data.queue || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Patient Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">All active triage reports</p>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : queue.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No reports available</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Symptoms</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Wait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {queue.map((p, i) => (
                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">#{p.queue_position}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.age}yr</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate hidden md:table-cell">{p.symptoms?.slice(0, 50)}...</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{p.risk_score}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={p.priority} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.waiting_minutes ?? 0}min</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
