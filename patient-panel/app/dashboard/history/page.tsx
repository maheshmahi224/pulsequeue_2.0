"use client";
// Helper: prediction items may be string OR {name, confidence} objects
const predName = (p: any): string => typeof p === "string" ? p : (p?.name ?? String(p));
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Clock, Activity, AlertTriangle, CheckCircle2,
  Loader2, ChevronRight, FileArchive, Pill, Stethoscope,
  TrendingUp, TrendingDown, Minus, Eye
} from "lucide-react";
import apiClient from "@/lib/apiClient";

interface Report {
  report_id: string;
  created_at: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  risk_score: number;
  status: string;
  symptoms: string;
  has_pdf: boolean;
  pdf_filename?: string;
  prediction: string[];
  vitals: Record<string, number | null>;
}

const PRIORITY_CONFIG = {
  HIGH:   { color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500",    label: "High Risk" },
  MEDIUM: { color: "text-yellow-600", bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500",  label: "Medium Risk" },
  LOW:    { color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500",  label: "Low Risk" },
};

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{pct}</span>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem("pq_user_id");
    if (!uid) { router.push("/"); return; }
    apiClient.get(`/patients/${uid}/reports`)
      .then(r => setReports(r.data.data?.reports || []))
      .catch(() => setError("Could not load report history"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading your report history...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileArchive className="w-6 h-6 text-blue-600" /> My Report History
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">All your past medical reports and AI assessments</p>
      </div>

      {/* Stats */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4 animate-slide-up">
          {[
            { label: "Total Reports", value: reports.length, icon: FileText, color: "text-blue-600" },
            { label: "PDF Uploads", value: reports.filter(r => r.has_pdf).length, icon: FileText, color: "text-purple-600" },
            { label: "High Risk", value: reports.filter(r => r.priority === "HIGH").length, icon: AlertTriangle, color: "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <FileArchive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No reports yet</h3>
          <p className="text-sm text-gray-400 mb-4">Submit your first medical report to see your history here</p>
          <button onClick={() => router.push("/dashboard/report")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all">
            Submit First Report
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3 animate-slide-up">
        {reports.map((r, idx) => {
          const cfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.LOW;
          const isOpen = expanded === r.report_id;
          return (
            <div key={r.report_id} className={`bg-white rounded-2xl border ${cfg.border} shadow-sm overflow-hidden transition-all duration-300`}>
              {/* Header row */}
              <div
                className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50/60 transition-colors`}
                onClick={() => setExpanded(isOpen ? null : r.report_id)}
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-2 ring-white ring-offset-1`} />
                  {idx < reports.length - 1 && <div className="w-0.5 h-8 bg-gray-100 mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {r.has_pdf && (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> PDF
                        </span>
                      )}
                      <span className={`text-xs py-0.5 px-2 rounded-full ${r.status === "waiting" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}>
                        {r.status === "waiting" ? "In Queue" : r.status === "completed" ? "Completed" : r.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(r.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{r.symptoms || "No symptom description"}</p>

                  <div className="mt-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Activity className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">Risk Score</span>
                    </div>
                    <ScoreBar score={r.risk_score || 0} />
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className={`border-t ${cfg.border} px-4 pb-4 pt-3 space-y-3`}>
                  {/* AI Prediction */}
                  {r.prediction && r.prediction.length > 0 && (
                    <div className={`p-3 rounded-xl ${cfg.bg}`}>
                      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5" /> AI Disease Prediction
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.prediction.map((p: any, i: number) => (
                          <span key={i} className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 font-medium">
                            {predName(p)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vitals */}
                  {r.vitals && Object.values(r.vitals).some(v => v !== null) && (
                    <div>
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Vitals Recorded</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ["BP", r.vitals.bp_systolic ? `${r.vitals.bp_systolic}/${r.vitals.bp_diastolic}` : null, "mmHg"],
                          ["Pulse", r.vitals.pulse, "bpm"],
                          ["Temp", r.vitals.temperature, "°F"],
                          ["SpO2", r.vitals.oxygen, "%"],
                          ["Glucose", r.vitals.blood_sugar, "mg/dL"],
                        ].filter(([, v]) => v !== null && v !== undefined).map(([l, v, u]) => (
                          <div key={l as string} className="bg-gray-50 rounded-xl p-2.5 text-center">
                            <div className="text-xs text-gray-400">{l}</div>
                            <div className="text-sm font-bold text-gray-900">{v}</div>
                            <div className="text-xs text-gray-400">{u}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.has_pdf && (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-purple-700 font-medium">{r.pdf_filename || "Medical PDF uploaded"}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">Report ID: <span className="font-mono">{r.report_id}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {reports.length > 0 && (
        <div className="text-center pb-4">
          <button onClick={() => router.push("/dashboard/report")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl shadow-md shadow-blue-200 transition-all inline-flex items-center gap-2">
            <FileText className="w-4 h-4" /> Submit New Report
          </button>
        </div>
      )}
    </div>
  );
}
