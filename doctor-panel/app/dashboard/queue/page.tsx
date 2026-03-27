"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, AlertTriangle, Clock, Search, ChevronRight,
  Users, Filter, Zap, TrendingUp
} from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "HIGH") return <span className="priority-high">HIGH</span>;
  if (priority === "MEDIUM") return <span className="priority-medium">MED</span>;
  return <span className="priority-low">LOW</span>;
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#22c55e";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

const SECTIONS = [
  { label: "CRITICAL", priority: "HIGH", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", rowHover: "hover:bg-red-50 hover:border-red-200" },
  { label: "MODERATE", priority: "MEDIUM", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", rowHover: "hover:bg-orange-50 hover:border-orange-200" },
  { label: "STABLE", priority: "LOW", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", rowHover: "hover:bg-emerald-50 hover:border-emerald-200" },
];

export default function QueuePage() {
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchQueue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiClient.get("/doctor/queue");
      const q = res.data.data.queue || [];
      setQueue(q);
      setFiltered(q);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    let result = queue;
    if (priorityFilter !== "ALL") result = result.filter(p => p.priority === priorityFilter);
    if (search) result = result.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.symptoms?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [queue, priorityFilter, search]);

  const counts = {
    ALL: queue.length,
    HIGH: queue.filter(p => p.priority === "HIGH").length,
    MEDIUM: queue.filter(p => p.priority === "MEDIUM").length,
    LOW: queue.filter(p => p.priority === "LOW").length,
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Triage Queue</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {queue.length} patients · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => fetchQueue(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-slide-up" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients or symptoms..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  priorityFilter === p
                    ? p === "HIGH" ? "bg-red-600 text-white shadow-md shadow-red-200"
                    : p === "MEDIUM" ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                    : p === "LOW" ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                    : "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p}
                <span className="bg-white/30 px-1.5 rounded-full text-[10px] font-bold">{counts[p]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm animate-scale-in">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No patients found</h3>
          <p className="text-sm text-gray-400">
            {search || priorityFilter !== "ALL" ? "Try adjusting your filters" : "Queue is empty right now"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(({ label, priority, color, bg, border, dot, rowHover }) => {
            const patients = filtered.filter(p => p.priority === priority);
            if (patients.length === 0) return null;
            return (
              <div key={priority} className="animate-slide-up">
                <div className={`flex items-center gap-2 mb-3 px-1`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${dot} animate-pulse`} />
                  <span className={`text-xs font-bold tracking-widest ${color}`}>{label}</span>
                  <span className={`text-xs px-2 py-0.5 ${bg} ${color} rounded-full font-semibold border ${border}`}>{patients.length}</span>
                </div>
                <div className="space-y-2">
                  {patients.map((patient, i) => (
                    <div
                      key={i}
                      onClick={() => router.push(`/dashboard/queue/${patient.report_id}`)}
                      className={`flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer transition-all duration-200 border hover:shadow-md ${rowHover} group animate-slide-up`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className={`w-9 h-9 ${bg} rounded-full flex items-center justify-center ${color} text-sm font-bold shrink-0 border ${border}`}>
                        #{patient.queue_position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">{patient.name}</span>
                          {patient.age && <span className="text-xs text-gray-400">· {patient.age}yr</span>}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{patient.symptoms?.slice(0, 65)}…</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <RiskBar score={patient.risk_score} />
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 justify-end">
                            <Clock className="w-3 h-3" /> {patient.waiting_minutes ?? 0}min
                          </div>
                        </div>
                        <PriorityBadge priority={patient.priority} />
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
