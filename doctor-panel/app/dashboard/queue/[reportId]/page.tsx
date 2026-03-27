"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, AlertTriangle, MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { HIGH: "bg-red-900/50 text-red-300 border-red-700", MEDIUM: "bg-orange-900/50 text-orange-300 border-orange-700", LOW: "bg-green-900/50 text-green-300 border-green-700" };
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${map[priority] || map.LOW}`}>{priority} PRIORITY</span>;
}

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
  const [toast, setToast] = useState("");

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/doctor/patient/${reportId}`);
      setData(res.data.data);
      setNewPriority(res.data.data.report?.priority || "");
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [reportId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handlePriorityUpdate = async () => {
    if (!newPriority) return;
    setUpdating(true);
    try {
      const doctorId = localStorage.getItem("pq_user_id") || "";
      await apiClient.post("/doctor/update-priority", { report_id: reportId, new_priority: newPriority, doctor_id: doctorId, reason: priorityReason });
      showToast("Priority updated successfully");
      fetchData();
    } catch (err: any) { showToast("Update failed: " + err.message); }
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
    } catch (err: any) { showToast("Note failed: " + err.message); }
    setAddingNote(false);
  };

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-gray-800 rounded-2xl animate-pulse" />)}</div>;
  if (!data?.report) return <div className="text-center py-16 text-gray-400">Patient not found</div>;

  const { report, patient, notes, queue } = data;
  const reasoning = report.ai_reasoning || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">{toast}</div>}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/queue")} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 transition-all"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="text-xl font-bold text-white">{patient?.name || "Patient Detail"}</h1><p className="text-sm text-gray-500">{patient?.age}yr · {patient?.gender}</p></div>
        <div className="ml-auto"><PriorityBadge priority={report.priority} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vitals */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Vitals</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "BP", value: report.vitals?.bp_systolic ? `${report.vitals.bp_systolic}/${report.vitals.bp_diastolic}` : "N/A", unit: "mmHg" },
                { label: "Pulse", value: report.vitals?.pulse ?? "N/A", unit: "bpm" },
                { label: "O2", value: report.vitals?.oxygen ?? "N/A", unit: "%" },
                { label: "Glucose", value: report.vitals?.blood_sugar ?? "N/A", unit: "mg/dL" },
                { label: "Temp", value: report.vitals?.temperature ?? "N/A", unit: "°F" },
                { label: "Risk", value: report.risk_score, unit: "/100" },
              ].map(({ label, value, unit }) => (
                <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="text-base font-bold text-white">{value}</div>
                  <div className="text-xs text-gray-600">{unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-2">Symptoms</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{report.symptoms || "No symptoms recorded"}</p>
            {report.emergency_flags && Object.values(report.emergency_flags).some(Boolean) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {report.emergency_flags.chest_pain && <span className="px-2 py-1 bg-red-900/40 text-red-300 border border-red-800 rounded-full text-xs">⚠ Chest Pain</span>}
                {report.emergency_flags.breathing_difficulty && <span className="px-2 py-1 bg-red-900/40 text-red-300 border border-red-800 rounded-full text-xs">⚠ Breathing Difficulty</span>}
                {report.emergency_flags.loss_of_consciousness && <span className="px-2 py-1 bg-red-900/40 text-red-300 border border-red-800 rounded-full text-xs">⚠ Loss of Consciousness</span>}
              </div>
            )}
          </div>

          {/* AI Reasoning */}
          {(reasoning.risk_reason || reasoning.supporting_factors?.length > 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-purple-400" /><h2 className="text-sm font-semibold text-gray-200">AI Clinical Reasoning</h2></div>
              {reasoning.risk_reason && <p className="text-sm text-gray-400 mb-3 leading-relaxed">{reasoning.risk_reason}</p>}
              {reasoning.supporting_factors?.length > 0 && (
                <ul className="space-y-1.5">
                  {reasoning.supporting_factors.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400"><span className="text-red-400 mt-0.5">•</span>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Notes timeline */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><MessageSquare className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-semibold text-gray-200">Doctor Notes</h2></div>
            {notes?.length === 0 ? <p className="text-sm text-gray-500">No notes yet</p> :
              <div className="space-y-3">
                {notes?.map((n: any, i: number) => (
                  <div key={i} className="border-l-2 border-blue-800 pl-3 py-1">
                    <div className="text-xs text-gray-500">{n.doctor_name} · {new Date(n.created_at).toLocaleString()}</div>
                    <div className="text-sm text-gray-300 mt-1">{n.message}</div>
                    {n.priority_change && <div className="text-xs text-orange-400 mt-1">Priority: {n.priority_change}</div>}
                  </div>
                ))}
              </div>
            }
            <div className="mt-4 pt-4 border-t border-gray-800">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add clinical note..." rows={3} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-all">
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}Add Note
              </button>
            </div>
          </div>
        </div>

        {/* Right col – actions */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Doctor Actions</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Change Priority</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reason (optional)</label>
                <input value={priorityReason} onChange={e => setPriorityReason(e.target.value)} placeholder="Clinical reason..." className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handlePriorityUpdate} disabled={updating} className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-all">
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}Update Priority
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Queue Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Position</span><span className="text-white font-medium">#{queue?.queue_position ?? "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Waiting</span><span className="text-white font-medium">{queue?.waiting_minutes ?? 0} min</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-400 font-medium">{queue?.status || "waiting"}</span></div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Medical History</h2>
            <div className="space-y-1.5">
              {patient?.medical_history && Object.entries(patient.medical_history).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  {v ? <CheckCircle className="w-3.5 h-3.5 text-orange-400" /> : <XCircle className="w-3.5 h-3.5 text-gray-700" />}
                  <span className={v ? "text-orange-300" : "text-gray-600"}>{k.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
