"use client";
// prediction items may be string OR {name, confidence} objects
const predName = (p: any): string => typeof p === "string" ? p : (p?.name ?? String(p));
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Brain, AlertTriangle, MessageSquare, CheckCircle,
  XCircle, Loader2, Clock, Activity, Thermometer, Heart, Zap, Shield,
  FileText, Pill, Stethoscope, FlaskConical, ClipboardList, ChevronRight,
  User, History, FileArchive, ChevronDown, ChevronUp, Dna,
  CheckCircle2, XOctagon, UserCheck, UserX
} from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "HIGH") return <span className="priority-high">HIGH PRIORITY</span>;
  if (priority === "MEDIUM") return <span className="priority-medium">MEDIUM PRIORITY</span>;
  return <span className="priority-low">LOW PRIORITY</span>;
}

function PdfTextViewer({ analysis }: { analysis: any }) {
  const rawText: string = analysis?.raw_text || "";
  const lines = rawText.split("\n").filter(l => l.trim());
  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">{analysis?.filename || "medical_report.pdf"}</div>
          <div className="text-xs text-gray-400">{analysis?.page_count || 1} page(s) · {(analysis?.word_count || 0).toLocaleString()} words</div>
        </div>
        <div className="shrink-0 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-semibold">AI Analyzed</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 font-mono text-[11px] leading-relaxed text-gray-700 space-y-0.5 shadow-sm">
          {lines.length > 0 ? lines.map((line, i) => {
            const isHeader = line.length < 60 && /[A-Z]{2,}/.test(line);
            const isValue = /^\d/.test(line) || line.includes(":") || line.includes("/");
            return (
              <div key={i} className={isHeader ? "text-blue-700 font-bold text-xs mt-3 mb-1 border-b border-blue-100 pb-0.5" : isValue ? "text-gray-800" : "text-gray-600"}>
                {line}
              </div>
            );
          }) : <div className="text-gray-400 text-center py-8">No text content available</div>}
        </div>
        <div className="mt-3 text-center text-xs text-gray-400">— End of document —</div>
      </div>
    </div>
  );
}

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
      {llm.chief_complaint && (
        <InfoCard icon={User} title="Chief Complaint" color="text-blue-600" bg="bg-blue-50" border="border-blue-100">
          <p className="text-sm text-blue-900 leading-relaxed">{llm.chief_complaint}</p>
        </InfoCard>
      )}
      {llm.critical_findings && (
        <InfoCard icon={AlertTriangle} title="⚠ Critical Finding" color="text-red-600" bg="bg-red-50" border="border-red-200">
          <p className="text-sm text-red-800 font-medium leading-relaxed">{llm.critical_findings}</p>
        </InfoCard>
      )}
      {(llm.diagnoses?.length > 0 || sections.diagnoses_raw) && (
        <InfoCard icon={Stethoscope} title="Diagnoses / Assessment" color="text-purple-600" bg="bg-purple-50" border="border-purple-100">
          <div className="flex flex-wrap gap-1.5">
            {llm.diagnoses?.length > 0 ? llm.diagnoses.map((d: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-xs font-semibold">{d}</span>
            )) : <p className="text-xs text-purple-700">{sections.diagnoses_raw}</p>}
          </div>
        </InfoCard>
      )}
      {llm.symptoms_summary && (
        <InfoCard icon={ClipboardList} title="Reported Symptoms" color="text-orange-600" bg="bg-orange-50" border="border-orange-100">
          <div className="flex flex-wrap gap-1.5">
            {llm.symptoms_summary.split(",").map((s: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-orange-100 border border-orange-200 text-orange-700 rounded-full text-xs font-medium">{s.trim()}</span>
            ))}
          </div>
        </InfoCard>
      )}
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
      {sections.lab_results_raw && (
        <InfoCard icon={FlaskConical} title="Lab Results" color="text-cyan-600" bg="bg-cyan-50" border="border-cyan-100">
          <p className="text-xs text-cyan-800 leading-relaxed whitespace-pre-line">{sections.lab_results_raw}</p>
        </InfoCard>
      )}
      {(meds.length > 0 || llm.key_medications?.length > 0) && (
        <InfoCard icon={Pill} title="Medications" color="text-indigo-600" bg="bg-indigo-50" border="border-indigo-100">
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set([...(llm.key_medications || []), ...meds])).map((m: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">💊 {m}</span>
            ))}
          </div>
        </InfoCard>
      )}
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
      {(llm.doctor_instructions || llm.follow_up) && (
        <InfoCard icon={MessageSquare} title="Doctor's Instructions" color="text-teal-600" bg="bg-teal-50" border="border-teal-100">
          {llm.doctor_instructions && <p className="text-xs text-teal-800 mb-2">{llm.doctor_instructions}</p>}
          {llm.follow_up && <p className="text-xs text-teal-700 italic">Follow-up: {llm.follow_up}</p>}
        </InfoCard>
      )}
    </div>
  );
}

// ── Disease Prediction Card ──────────────────────────────────────────────────
function DiseasePredictionCard({ prediction, reasoning }: { prediction: string[]; reasoning: any }) {
  if (!prediction?.length && !reasoning?.risk_reason) return null;
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-200 rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-200">
          <Dna className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">AI Disease Prediction</h2>
          <p className="text-xs text-purple-500">Automated diagnostic assessment</p>
        </div>
      </div>

      {prediction?.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Predicted Conditions</div>
          <div className="flex flex-wrap gap-2">
            {prediction.map((p: any, i: number) => (
              <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                i === 0
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                  : "bg-white text-purple-700 border-purple-200"
              }`}>
                <Stethoscope className="w-3 h-3" />{predName(p)}
              </span>
            ))}
          </div>
        </div>
      )}

      {reasoning?.risk_reason && (
        <div className="bg-white/70 rounded-xl p-3 border border-purple-100">
          <div className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" /> AI Reasoning
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{reasoning.risk_reason}</p>
        </div>
      )}

      {reasoning?.supporting_factors?.length > 0 && (
        <ul className="mt-3 space-y-1">
          {reasoning.supporting_factors.slice(0, 4).map((f: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 shrink-0" />{f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Patient History Timeline ────────────────────────────────────────────────
function PatientHistoryPanel({ patientId, currentReportId }: { patientId: string; currentReportId: string }) {
  const router = useRouter();
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<any>(null);
  const [pdfSplit, setPdfSplit] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    apiClient.get(`/doctor/patient-history/${patientId}`)
      .then(r => {
        setHistory(r.data.data);
        // Auto-select first PDF found
        const firstPdf = r.data.data?.reports?.find((rep: any) => rep.has_pdf);
        if (firstPdf) setSelectedPdf(firstPdf);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>;
  if (!history) return <p className="text-sm text-gray-400 text-center py-6">History not available</p>;

  const { reports, pdf_count } = history;
  const pdfReports = reports.filter((r: any) => r.has_pdf);

  const PRIORITY_DOT: Record<string, string> = { HIGH: "bg-red-500", MEDIUM: "bg-amber-500", LOW: "bg-green-500" };
  const PRIORITY_BG: Record<string, string> = { HIGH: "bg-red-50 border-red-200 text-red-700", MEDIUM: "bg-amber-50 border-amber-200 text-amber-700", LOW: "bg-green-50 border-green-200 text-green-700" };

  return (
    <div className="space-y-5">
      {/* PDF Gallery */}
      {pdfReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-bold text-gray-900">PDF Gallery</span>
              <span className="text-xs text-gray-400">({pdf_count} document{pdf_count !== 1 ? "s" : ""})</span>
            </div>
            <div className="flex gap-1.5">
              {[{ l: "Split", v: true }, { l: "Doc Only", v: false }].map(({ l, v }) => (
                <button key={l} onClick={() => setPdfSplit(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pdfSplit === v ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* PDF Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
            {pdfReports.map((r: any) => (
              <button key={r.report_id} onClick={() => setSelectedPdf(r)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  selectedPdf?.report_id === r.report_id
                    ? "border-blue-500 text-blue-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                <FileText className="w-3.5 h-3.5" />
                {r.pdf_filename || `Report ${r.report_id.slice(-4)}`}
                {r.report_id === currentReportId && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px]">current</span>
                )}
              </button>
            ))}
          </div>

          {/* PDF Viewer */}
          {selectedPdf?.pdf_analysis && (
            <div className={`p-4 ${pdfSplit ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}`} style={{ height: 500 }}>
              <PdfTextViewer analysis={selectedPdf.pdf_analysis} />
              {pdfSplit && (
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">AI Clinical Summary</span>
                    <span className="ml-auto text-xs text-blue-500">
                      {new Date(selectedPdf.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <PdfAnalysisPanel analysis={selectedPdf.pdf_analysis} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Timeline */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> All Reports ({reports.length})
        </div>
        <div className="space-y-2">
          {reports.map((r: any, idx: number) => {
            const isExp = expanded === r.report_id;
            const isCurrent = r.report_id === currentReportId;
            const dotColor = PRIORITY_DOT[r.priority] || "bg-gray-300";
            const badgeClass = PRIORITY_BG[r.priority] || "bg-gray-50 border-gray-200 text-gray-600";
            return (
              <div key={r.report_id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isCurrent ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-100"}`}>
                <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50/60"
                  onClick={() => setExpanded(isExp ? null : r.report_id)}>
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>{r.priority}</span>
                      {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-semibold">current</span>}
                      {r.has_pdf && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1"><FileText className="w-3 h-3" />PDF</span>}
                      <span className="text-xs text-gray-400 ml-auto">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{r.symptoms || "No symptoms"}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.risk_score >= 70 ? "bg-red-400" : r.risk_score >= 40 ? "bg-amber-400" : "bg-green-400"}`} style={{ width: `${Math.min(100, r.risk_score || 0)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-500">{r.risk_score || 0}</span>
                    </div>
                  </div>
                  {isExp ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />}
                </div>

                {isExp && (
                  <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-2">
                    {r.prediction?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-purple-600 mb-1">AI Prediction</div>
                        <div className="flex flex-wrap gap-1">
                          {r.prediction.map((p: any, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">{predName(p)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={() => router.push(`/dashboard/queue/${r.report_id}`)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-1">
                      View Full Report <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
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
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [pdfSplitView, setPdfSplitView] = useState(true);
  // Admit / Reject modal state
  const [admitModal, setAdmitModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actioning, setActioning] = useState(false);

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

  const handleAdmit = async () => {
    setActioning(true);
    try {
      const doctorId = localStorage.getItem("pq_user_id") || "";
      await apiClient.post("/doctor/admit-patient", { report_id: reportId, doctor_id: doctorId, note: actionNote });
      showToast("Patient admitted — queue updated");
      setAdmitModal(false);
      setTimeout(() => router.push("/dashboard/queue"), 1200);
    } catch (err: any) { showToast("Admission failed: " + err.message, "error"); }
    setActioning(false);
  };

  const handleReject = async () => {
    setActioning(true);
    try {
      const doctorId = localStorage.getItem("pq_user_id") || "";
      await apiClient.post("/doctor/reject-patient", { report_id: reportId, doctor_id: doctorId, reason: rejectReason, note: actionNote });
      showToast("Patient referred out — queue updated");
      setRejectModal(false);
      setTimeout(() => router.push("/dashboard/queue"), 1200);
    } catch (err: any) { showToast("Action failed: " + err.message, "error"); }
    setActioning(false);
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

      {/* Main tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1.5">
        {([
          { id: "current", icon: ClipboardList, label: "Current Report" },
          { id: "history", icon: History, label: "Patient History & All PDFs" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === id ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-500 hover:bg-gray-50"
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Current Report Tab ──────────────────────────────────────── */}
      {activeTab === "current" && (
        <div className="space-y-4">
          {/* AI Disease Prediction */}
          <DiseasePredictionCard prediction={report.prediction || []} reasoning={reasoning} />

          {/* PDF Split View */}
          {hasPdf && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: "80ms" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-gray-900">PDF Medical Report</span>
                  <span className="text-xs text-gray-400">· {pdfAnalysis.filename}</span>
                </div>
                <div className="flex gap-1.5">
                  {[{ label: "Split View", value: true }, { label: "Doc Only", value: false }].map(({ label, value }) => (
                    <button key={label} onClick={() => setPdfSplitView(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        pdfSplitView === value ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}>{label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`p-4 ${pdfSplitView ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}`} style={{ height: "560px" }}>
                <PdfTextViewer analysis={pdfAnalysis} />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

              {/* Doctor Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "300ms" }}>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-900">Doctor Notes</h2>
                  {notes?.length > 0 && <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{notes.length}</span>}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4">
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a clinical note..." rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-all" />
                  <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="mt-2 btn-primary flex items-center gap-2 text-sm">
                    {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}Add Note
                  </button>
                </div>
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4">
              {/* ADMIT / REJECT ACTIONS */}
              {report.status !== "admitted" && report.status !== "referred" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 space-y-3 animate-slide-up">
                  <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />Clinical Decision
                  </h2>

                  {/* Admit */}
                  <button onClick={() => { setActionNote(""); setAdmitModal(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-200 active:scale-95">
                    <UserCheck className="w-4 h-4" /> Admit Patient
                  </button>

                  {/* Reject/Refer */}
                  <button onClick={() => { setActionNote(""); setRejectReason(""); setRejectModal(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-bold transition-all active:scale-95">
                    <UserX className="w-4 h-4" /> Refer / Discharge
                  </button>

                  <div className="border-t border-gray-100 pt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Adjust Priority</label>
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                    <input value={priorityReason} onChange={e => setPriorityReason(e.target.value)} placeholder="Reason (optional)…"
                      className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
                    <button onClick={handlePriorityUpdate} disabled={updating}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-all active:scale-95">
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}Update Priority
                    </button>
                  </div>
                </div>
              )}

              {/* Already resolved */}
              {(report.status === "admitted" || report.status === "referred") && (
                <div className={`rounded-2xl border p-5 text-center ${
                  report.status === "admitted" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                }`}>
                  {report.status === "admitted"
                    ? <><CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" /><p className="text-sm font-bold text-emerald-700">Patient Admitted</p></>
                    : <><XOctagon className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-sm font-bold text-red-600">Patient Referred Out</p></>}
                  <p className="text-xs text-gray-500 mt-1">Removed from queue · positions recalculated</p>
                </div>
              )}

              {/* Queue Info */}
              {report.status === "waiting" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-up" style={{ animationDelay: "180ms" }}>
                  <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-blue-500" /><h2 className="text-sm font-bold text-gray-900">Queue Info</h2></div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Position", value: `#${queue?.queue_position ?? "N/A"}` },
                      { label: "Waiting", value: `${queue?.waiting_minutes ?? 0} min` },
                      { label: "Status",   value: queue?.status || "waiting", green: true },
                    ].map(({ label, value, green }) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className={`text-sm font-semibold ${green ? "text-emerald-600" : "text-gray-900"}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
      )}

      {/* ── History Tab */}
      {activeTab === "history" && data?.patient?.patient_id && (
        <PatientHistoryPanel
          patientId={data.patient.patient_id}
          currentReportId={reportId}
        />
      )}

      {/* ── ADMIT MODAL ─────────────────────────────────────────────── */}
      {admitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Admit Patient</h2>
                <p className="text-xs text-gray-400">Patient will be removed from the waiting queue</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Clinical Note (optional)</label>
              <textarea value={actionNote} onChange={e => setActionNote(e.target.value)} rows={3}
                placeholder="e.g. Admitted to Ward 4 for IV antibiotics..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdmitModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all">
                Cancel
              </button>
              <button onClick={handleAdmit} disabled={actioning}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2">
                {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT/REFER MODAL ──────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Refer / Discharge Patient</h2>
                <p className="text-xs text-gray-400">Patient will be removed from the active queue</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Reason for Referral <span className="text-red-400">*</span>
              </label>
              <select value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition-all">
                <option value="">Select reason…</option>
                <option>Referred to specialist</option>
                <option>Patient self-discharged</option>
                <option>No acute emergency found</option>
                <option>Duplicate registration</option>
                <option>Referred to higher centre</option>
                <option>Patient declined treatment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Additional Note (optional)</label>
              <textarea value={actionNote} onChange={e => setActionNote(e.target.value)} rows={2}
                placeholder="Any additional clinical context..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all">
                Cancel
              </button>
              <button onClick={handleReject} disabled={actioning || !rejectReason}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2">
                {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                Confirm Referral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
