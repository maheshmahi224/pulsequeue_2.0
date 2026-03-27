"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertTriangle, Clock, Search, ChevronRight, Users } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    HIGH: "bg-red-900/50 text-red-300 border-red-700",
    MEDIUM: "bg-orange-900/50 text-orange-300 border-orange-700",
    LOW: "bg-green-900/50 text-green-300 border-green-700"
  };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[priority] || map.LOW}`}>{priority}</span>;
}

export default function QueuePage() {
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiClient.get("/doctor/queue");
      const q = res.data.data.queue || [];
      setQueue(q);
      setFiltered(q);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    let result = queue;
    if (priorityFilter !== "ALL") result = result.filter(p => p.priority === priorityFilter);
    if (search) result = result.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.symptoms?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [queue, priorityFilter, search]);

  const sections = [
    { label: "HIGH PRIORITY", priority: "HIGH", color: "text-red-400", border: "border-red-800" },
    { label: "MEDIUM PRIORITY", priority: "MEDIUM", color: "text-orange-400", border: "border-orange-800" },
    { label: "LOW PRIORITY", priority: "LOW", color: "text-green-400", border: "border-green-800" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Patient Triage Queue</h1>
          <p className="text-xs text-gray-500 mt-0.5">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <button onClick={fetchQueue} className="p-2 rounded-xl hover:bg-gray-800 transition-all text-gray-400"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..." className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          {["ALL", "HIGH", "MEDIUM", "LOW"].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${priorityFilter === p ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{p}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-200">No patients in queue</h3>
          <p className="text-sm text-gray-500 mt-1">Queue is empty or no matches for current filter</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(({ label, priority, color, border }) => {
            const patients = filtered.filter(p => p.priority === priority);
            if (patients.length === 0) return null;
            return (
              <div key={priority}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${border}`}>
                  <AlertTriangle className={`w-4 h-4 ${color}`} />
                  <span className={`text-xs font-bold tracking-wider ${color}`}>{label}</span>
                  <span className="text-xs text-gray-600">({patients.length})</span>
                </div>
                <div className="space-y-2">
                  {patients.map((patient, i) => (
                    <div key={i} onClick={() => router.push(`/dashboard/queue/${patient.report_id}`)}
                      className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 hover:bg-gray-800 cursor-pointer transition-all group">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        #{patient.queue_position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{patient.name}</span>
                          {patient.age && <span className="text-xs text-gray-500">· {patient.age}yr</span>}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{patient.symptoms?.slice(0, 60)}...</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold text-white">Risk: {patient.risk_score}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><Clock className="w-3 h-3" />{patient.waiting_minutes ?? 0}min</div>
                        </div>
                        <PriorityBadge priority={patient.priority} />
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
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
