"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Clock, AlertTriangle, Search, Download,
  Eye, RefreshCw, BarChart2, Filter
} from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "HIGH") return <span className="priority-high">HIGH</span>;
  if (priority === "MEDIUM") return <span className="priority-medium">MED</span>;
  return <span className="priority-low">LOW</span>;
}

export default function ReportsPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"risk" | "queue" | "wait">("risk");

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiClient.get("/doctor/queue");
      const q = res.data.data.queue || [];
      setQueue(q);
      // Default sort by risk_score desc
      setFiltered([...q].sort((a, b) => b.risk_score - a.risk_score));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let result = [...queue];
    if (search) {
      result = result.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.symptoms?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortBy === "risk") result.sort((a, b) => b.risk_score - a.risk_score);
    else if (sortBy === "queue") result.sort((a, b) => a.queue_position - b.queue_position);
    else if (sortBy === "wait") result.sort((a, b) => (b.waiting_minutes ?? 0) - (a.waiting_minutes ?? 0));
    setFiltered(result);
  }, [queue, search, sortBy]);

  const riskColor = (score: number) =>
    score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#22c55e";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">{queue.length} active triage reports</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-slide-up" style={{ animationDelay: "80ms" }}>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Sort:</span>
          {(["risk", "queue", "wait"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                sortBy === s ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "risk" ? "Risk Score" : s === "queue" ? "Queue #" : "Wait Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-shimmer" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <FileText className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">No reports available</h3>
          <p className="text-sm text-gray-400">
            {search ? "No matches for your search" : "Reports will appear here after patients submit symptoms"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-scale-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Symptoms</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Wait</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p, i) => (
                <tr
                  key={i}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => router.push(`/dashboard/queue/${p.report_id}`)}
                >
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-gray-400">#{p.queue_position}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.age}yr</div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="text-xs text-gray-500 max-w-xs truncate">{p.symptoms?.slice(0, 55)}…</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.risk_score}%`, backgroundColor: riskColor(p.risk_score) }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: riskColor(p.risk_score) }}>{p.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><PriorityBadge priority={p.priority} /></td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> {p.waiting_minutes ?? 0}min
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/queue/${p.report_id}`); }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all"
                        title="View Report"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtered.length} of {queue.length} reports</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <BarChart2 className="w-3.5 h-3.5" />
              AI-analyzed reports
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
