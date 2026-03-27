"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XOctagon, Search, UserCheck, Activity, Clock, Shield
} from "lucide-react";
import apiClient from "@/lib/apiClient";

export default function ResolvedPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get("/doctor/resolved");
      setPatients(res.data.data.resolved || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filtered = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.symptoms?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Resolved Patients
            <Shield className="w-5 h-5 text-emerald-500" />
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Patients you have admitted or referred from the wait queue
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-slide-up"
        style={{ animationDelay: "80ms" }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resolved patients..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-2xl animate-shimmer"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm animate-scale-in">
          <CheckCircle2 className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">
            No resolved patients found
          </h3>
          <p className="text-sm text-gray-400">
            Patients you admit or discharge will appear here for reference.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((patient, i) => {
            const isAdmitted = patient.status === "admitted";
            return (
              <div
                key={patient.report_id || i}
                onClick={() => router.push(`/dashboard/queue/${patient.report_id}`)}
                className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md group animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                    isAdmitted
                      ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                      : "bg-red-50 border-red-100 text-red-500"
                  }`}
                >
                  {isAdmitted ? <UserCheck className="w-5 h-5" /> : <XOctagon className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-gray-900">{patient.name}</span>
                    <span className="text-xs text-gray-400">· {patient.age}yr</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isAdmitted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {patient.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {patient.symptoms?.slice(0, 80)}…
                  </div>
                  {patient.reject_reason && (
                    <div className="text-xs text-red-500 font-medium mt-1 inline-block bg-red-50 px-2 py-0.5 rounded-md">
                      Reason: {patient.reject_reason}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Risk: {patient.risk_score}
                  </div>
                  {patient.resolved_at && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 justify-end mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(patient.resolved_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
