"use client";
import { useEffect, useState, useCallback } from "react";
import { Clock, RefreshCw, ListOrdered } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-orange-100 text-orange-700", LOW: "bg-green-100 text-green-700" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[priority] || map.LOW}`}>{priority}</span>;
}

const TIMELINE = ["Registered", "Symptoms Submitted", "AI Assessment", "In Queue", "Doctor Review"];

export default function QueuePage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStatus = useCallback(async () => {
    const uid = localStorage.getItem("pq_user_id");
    if (!uid) return;
    try {
      const res = await apiClient.get(`/patients/queue-status/${uid}`);
      setStatus(res.data.data);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); const timer = setInterval(fetchStatus, 30000); return () => clearInterval(timer); }, [fetchStatus]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Queue Status</h1>
          <p className="text-xs text-gray-500 mt-0.5">Auto-refreshes every 30 seconds · Last: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <button onClick={fetchStatus} className="p-2 rounded-xl hover:bg-gray-100 transition-all"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
      ) : status?.status === "no_reports" ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
          <ListOrdered className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Not in queue yet</h3>
          <p className="text-sm text-gray-500">Submit a symptom report to enter the triage queue</p>
        </div>
      ) : (
        <>
          {/* Position card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-900">Your Position</h2>
              <PriorityBadge priority={status?.priority || "LOW"} />
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-2">#{status?.queue_position ?? "N/A"}</div>
              <div className="text-sm text-gray-500">Current Queue Position</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-900">{status?.estimated_wait || status?.waiting_minutes ? `${status.waiting_minutes} min` : "N/A"}</div>
                <div className="text-xs text-gray-500">Waiting Time</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-green-400" />
                <div className="text-lg font-bold text-gray-900">{status?.status === "waiting" ? "Active" : "Completed"}</div>
                <div className="text-xs text-gray-500">Status</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Journey Timeline</h2>
            <div className="space-y-3">
              {TIMELINE.map((step, i) => {
                const done = i <= 3;
                const active = i === 3;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${active ? "bg-blue-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                      {done && !active ? "✓" : i + 1}
                    </div>
                    <span className={`text-sm ${active ? "font-semibold text-blue-600" : done ? "text-gray-700" : "text-gray-400"}`}>{step}</span>
                    {active && <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Current</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
