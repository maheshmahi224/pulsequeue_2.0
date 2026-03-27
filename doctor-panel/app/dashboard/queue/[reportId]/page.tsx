"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Brain, AlertTriangle, MessageSquare, CheckCircle,
  XCircle, Loader2, Clock, Activity, Thermometer, Heart, Zap, Shield,
  FileText, Pill, Stethoscope, FlaskConical, ClipboardList, ChevronRight,
  ChevronLeft, User
} from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "HIGH") return <span className="priority-high">HIGH PRIORITY</span>;
  if (priority === "MEDIUM") return <span className="priority-medium">MEDIUM PRIORITY</span>;
  return <span className="priority-low">LOW PRIORITY</span>;
}

// ── PDF Text Viewer (scrollable formatted doc) ─────────────────────────────
function PdfTextViewer({ analysis }: { analysis: any }) {
  const rawText: string = analysis?.raw_text || "";
  const lines = rawText.split("\n").filter(l => l.trim());

  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      {/* Doc header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">{analysis?.filename || "medical_report.pdf"}</div>
          <div className="text-xs text-gray-400">
            {analysis?.page_count || 1} page{(analysis?.page_count || 1) > 1 ? "s" : ""} · {(analysis?.word_count || 0).toLocaleString()} words
          </div>
        </div>
        <div className="shrink-0 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-semibold">
          AI Analyzed
        </div>
      </div>
      {/* Scrollable text content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 font-mono text-[11px] leading-relaxed text-gray-700 space-y-0.5 shadow-sm">
          {lines.length > 0 ? lines.map((line, i) => {
            // Style section headers differently
            const isHeader = line.length < 60 && /[A-Z]{2,}/.test(line);
            const isValue = /^\d/.test(line) || line.includes(":") || line.includes("/");
            return (
              <div
                key={i}
                className={`${
                  isHeader
                    ? "text-blue-700 font-bold text-xs mt-3 mb-1 border-b border-blue-100 pb-0.5"
                    : isValue
                    ? "text-gray-800"
                    : "text-gray-600"
                }`}
              >
                {line}
              </div>
            );
          }) : (
            <div className="text-gray-400 text-center py-8">No text content available</div>
          )}
        </div>
        <div className="mt-3 text-center text-xs text-gray-400">— End of document —</div>
      </div>
    </div>
  );
}

// ── Structured Analysis Panel ──────────────────────────────────────────────
function PdfAnalysisPanel({ analysis }: { analysis: any }) {
  const llm = analysis?.llm_analysis || {};
  const vitals = analysis?.extracted_vitals || {};
  const meds = analysis?.extracted_medications || [];
  const sections = analysis?.rule_sections || {};

  const InfoCard = ({ icon: Icon, title, color, bg, border, children }: any) => (
    <div className={`rounded-2xl border ${border} ${bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color.replace("text-", "bg-").replace("600", "100")}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Chief Complaint */}
      {llm.chief_complaint && (
        <InfoCard icon={User} title="Chief Complaint" color="text-blue-600" bg="bg-blue-50" border="border-blue-100">
          <p className="text-sm text-blue-900 leading-relaxed">{llm.chief_complaint}</p>
        </InfoCard>
      )}

      {/* Critical Finding */}
      {llm.critical_findings && (
        <InfoCard icon={AlertTriangle} title="⚠ Critical Finding" color="text-red-600" bg="bg-red-50" border="border-red-200">
          <p className="text-sm text-red-800 font-medium leading-relaxed">{llm.critical_findings}</p>
        </InfoCard>
      )}

      {/* Diagnoses */}
      {(llm.diagnoses?.length > 0 || sections.diagnoses_raw) && (
        <InfoCard icon={Stethoscope} title="Diagnoses / Assessment" color="text-purple-600" bg="bg-purple-50" border="border-purple-100">
          <div className="flex flex-wrap gap-1.5">
            {llm.diagnoses?.length > 0
              ? llm.diagnoses.map((d: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-xs font-semibold">
                    {d}
                  </span>
                ))
              : <p className="text-xs text-purple-700">{sections.diagnoses_raw}</p>
            }
          </div>
        </InfoCard>
      )}

      {/* Symptoms */}
      {llm.symptoms_summary && (
        <InfoCard icon={ClipboardList} title="Reported Symptoms" color="text-orange-600" bg="bg-orange-50" border="border-orange-100">
          <div className="flex flex-wrap gap-1.5">
            {llm.symptoms_summary.split(",").map((s: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-orange-100 border border-orange-200 text-orange-700 rounded-full text-xs font-medium">{s.trim()}</span>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Extracted Vitals */}
      {Object.keys(vitals).length > 0 && (
        <InfoCard icon={Activity} title="Vital Signs (Extracted)" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(vitals).map(([k, v]) => (
              <div key={k} className="bg-white rounded-xl px-3 py-2 border border-emerald-100">
                <div className="text-xs text-emerald-500 capitalize">{k.replace("_", " ")}</div>
                <div className="text-sm font-bold text-emerald-800">{v as string}</div>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Lab Results */}
      {sections.lab_results_raw && (
        <InfoCard icon={FlaskConical} title="Lab Results" color="text-cyan-600" bg="bg-cyan-50" border="border-cyan-100">
          <p className="text-xs text-cyan-800 leading-relaxed whitespace-pre-line">{sections.lab_results_raw}</p>
        </InfoCard>
      )}

      {/* Medications */}
      {(meds.length > 0 || llm.key_medications?.length > 0) && (
        <InfoCard icon={Pill} title="Medications" color="text-indigo-600" bg="bg-indigo-50" border="border-indigo-100">
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set([...(llm.key_medications || []), ...meds])).map((m: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
                💊 {m}
              </span>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Risk Factors */}
      {llm.risk_factors?.length > 0 && (
        <InfoCard icon={Shield} title="Risk Factors" color="text-rose-600" bg="bg-rose-50" border="border-rose-100">
          <ul className="space-y-1.5">
            {llm.risk_factors.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-xs text-rose-800">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full shrink-0" />{f}
              </li>
            ))}
          </ul>
        </InfoCard>
      )}

      {/* Doctor Instructions */}
      {(llm.doctor_instructions || llm.follow_up) && (
        <InfoCard icon={MessageSquare} title="Doctor's Instructions" color="text-teal-600" bg="bg-teal-50" border="border-teal-100">
          {llm.doctor_instructions && <p className="text-xs text-teal-800 mb-2">{llm.doctor_instructions}</p>}
          {llm.follow_up && <p className="text-xs text-teal-700 italic">Follow-up: {llm.follow_up}</p>}
        </InfoCard>
      )}

      {/* History */}
      {sections.history_raw && (
        <InfoCard icon={Clock} title="Medical History (from PDF)" color="text-gray-600" bg="bg-gray-50" border="border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{sections.history_raw}</p>
        </InfoCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.reportId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPriority, setNewPriority] = useState("");
  const [priorityReason, setPriorityReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [pdfSplitView, setPdfSplitView] = useState(true); // toggle PDF vs analytics panel

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/doctor/patient/${reportId}`);
      setData(res.data.data);
      setNewPriority(res.data.data.report?.priority || "");
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [reportId]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePriorityUpdate = async () => {
    if (!newPriority) return;
    setUpdating(true);
    try {
      const doctorId = localStorage.getItem("pq_user_id") || "";
      await apiClient.post("/doctor/update-priority", { report_id: reportId, new_priority: newPriority, doctor_id: doctorId, reason: priorityReason });
      showToast("Priority updated successfully");
      fetchData();
    } catch (err: any) { showToast("Update failed: " + err.message, "error"); }
    setUpdating(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const doctorId = localStorage.getItem("pq_user_id") || "";
      await apiClient.post("/doctor/add-note", { report_id: reportId, doctor_id: doctorId, message: noteText });
      setNoteText("");
      showToast("Note added successfully");
      fetchData();
    } catch (err: any) { showToast("Note failed: " + err.message, "error"); }
    setAddingNote(false);
  };

  if (loading) return (
    <div className="space-y-4 max-w-6xl">
      <div className="h-8 bg-gray-100 rounded-xl w-48 animate-shimmer" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );

  if (!data?.report) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <XCircle className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">Patient report not found</p>
      <button onClick={() => router.push("/dashboard/queue")} className="mt-4 btn-secondary text-sm">← Back to Queue</button>
    </div>
  );

  const { report, patient, notes, queue } = data;
  const reasoning = report.ai_reasoning || {};
  const pdfAnalysis = report.pdf_analysis;
  const hasPdf = !!pdfAnalysis;
  const riskColor = report.risk_score >= 70 ? "#ef4444" : report.risk_score >= 40 ? "#f97316" : "#22c55e";

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-bounce-in flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 animate-slide-up">
        <button onClick={() => router.push("/dashboard/queue")}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{patient?.name || "Patient Detail"}</h1>
            <PriorityBadge priority={report.priority} />
            {hasPdf && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
                <FileText className="w-3 h-3" /> PDF Report
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {patient?.age ? `${patient.age}yr` : ""}{patient?.gender ? ` · ${patient.gender}` : ""} · Queue #{queue?.queue_position ?? "N/A"}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-center bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm">
          <div className="text-2xl font-bold" style={{ color: riskColor }}>{report.risk_score}</div>
          <div className="text-xs text-gray-400">Risk Score</div>
          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
            <div className="h-full rounded-full" style={{ width: `${report.risk_score}%`, backgroundColor: riskColor }} />
          </div>
        </div>
      </div>

      {/* ── PDF SPLIT VIEW ─────────────────────────────────────────────── */}
      {hasPdf && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: "80ms" }}>
          {/* Tab toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-gray-900">PDF Medical Report</span>
              <span className="text-xs text-gray-400">· {pdfAnalysis.filename}</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { label: "Split View", value: true },
                { label: "Document Only", value: false },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setPdfSplitView(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pdfSplitView === value ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
          {/* Content */}
          <div className={`p-4 ${pdfSplitView ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}`} style={{ height: "560px" }}>
            {/* Left: PDF text viewer */}
            <PdfTextViewer analysis={pdfAnalysis} />
            {/* Right: Structured analysis */}
            {pdfSplitView && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200">
                    <Brain className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">AI Clinical Summary</span>
                  <span className="ml-auto text-xs text-blue-500">Extracted by AI</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PdfAnalysisPanel analysis={pdfAnalysis} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vitals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "160ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-gray-900">Vitals</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "BP", value: report.vitals?.bp_systolic ? `${report.vitals.bp_systolic}/${report.vitals.bp_diastolic}` : "N/A", unit: "mmHg", icon: Heart },
                { label: "Pulse", value: report.vitals?.pulse ?? "N/A", unit: "bpm", icon: Activity },
                { label: "SpO2", value: report.vitals?.oxygen ?? "N/A", unit: "%", icon: Shield },
                { label: "Glucose", value: report.vitals?.blood_sugar ?? "N/A", unit: "mg/dL", icon: Zap },
                { label: "Temp", value: report.vitals?.temperature ?? "N/A", unit: "°F", icon: Thermometer },
                { label: "Risk", value: report.risk_score, unit: "/100", icon: AlertTriangle },
              ].map(({ label, value, unit, icon: Icon }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 hover:border-blue-200 transition-colors">
                  <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="text-sm font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-400">{unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "220ms" }}>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Reported Symptoms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{report.symptoms || "No symptoms recorded"}</p>
            {report.emergency_flags && Object.values(report.emergency_flags).some(Boolean) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(report.emergency_flags).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3" /> {k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Reasoning */}
          {(reasoning.risk_reason || reasoning.supporting_factors?.length > 0) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">AI Clinical Reasoning</h2>
                  <p className="text-xs text-blue-500">Automated triage analysis</p>
                </div>
              </div>
              {reasoning.risk_reason && <p className="text-sm text-gray-700 leading-relaxed mb-3">{reasoning.risk_reason}</p>}
              {reasoning.supporting_factors?.length > 0 && (
                <ul className="space-y-1.5">
                  {reasoning.supporting_factors.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Doctor Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "380ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-gray-900">Doctor Notes</h2>
              {notes?.length > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{notes.length}</span>
              )}
            </div>
            {notes?.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">No notes yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {notes?.map((n: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                      {n.doctor_name?.charAt(0) || "D"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{n.doctor_name}</span>
                        <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      {n.priority_change && <span className="mt-1 inline-block text-xs text-orange-600 font-medium">Priority → {n.priority_change}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 pt-4">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a clinical note..." rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-all" />
              <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                className="mt-2 btn-primary flex items-center gap-2 text-sm">
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}Add Note
              </button>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Doctor Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />Doctor Actions
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Change Priority</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Clinical Reason</label>
                <input value={priorityReason} onChange={e => setPriorityReason(e.target.value)} placeholder="Optional reason..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
              </div>
              <button onClick={handlePriorityUpdate} disabled={updating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-100 active:scale-95">
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}Update Priority
              </button>
            </div>
          </div>

          {/* Queue Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "180ms" }}>
            <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-blue-500" /><h2 className="text-sm font-bold text-gray-900">Queue Info</h2></div>
            <div className="space-y-2.5">
              {[
                { label: "Position", value: `#${queue?.queue_position ?? "N/A"}` },
                { label: "Waiting", value: `${queue?.waiting_minutes ?? 0} min` },
                { label: "Status", value: queue?.status || "waiting", green: true },
              ].map(({ label, value, green }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className={`text-sm font-semibold ${green ? "text-emerald-600" : "text-gray-900"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "260ms" }}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">Medical History</h2>
            <div className="space-y-2">
              {patient?.medical_history && Object.entries(patient.medical_history).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2.5 py-1">
                  {v ? <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300 shrink-0" />}
                  <span className={`text-sm ${v ? "text-orange-700 font-medium" : "text-gray-400"}`}>
                    {k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
