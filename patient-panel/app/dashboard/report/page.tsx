"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2, AlertCircle, CheckCircle2, Upload, FileText,
  X, FilePlus, Stethoscope, ClipboardList, ChevronRight, Mic
} from "lucide-react";
import apiClient from "@/lib/apiClient";

// Load voice recorder client-side only
const VoiceRecorder = dynamic(() => import("@/components/VoiceRecorder"), { ssr: false });

const SYMPTOMS_GROUPED: Record<string, string[]> = {
  "Cardiovascular": ["Chest Pain", "Chest Tightness", "Palpitations", "Irregular Heartbeat", "Swelling (Ankles/Feet)", "Shortness of Breath", "Cold Extremities"],
  "Neurological": ["Headache", "Migraine", "Dizziness", "Numbness / Tingling", "Blurred Vision", "Seizure", "Loss of Consciousness", "Memory Loss", "Slurred Speech", "Facial Drooping", "Confusion"],
  "Respiratory": ["Cough", "Dry Cough", "Productive Cough", "Wheezing", "Breathlessness", "Chest Congestion", "Hemoptysis (Coughing Blood)"],
  "Gastrointestinal": ["Nausea", "Vomiting", "Abdominal Pain", "Diarrhea", "Constipation", "Bloating", "Acidity / Heartburn", "Black Stool", "Blood in Stool", "Loss of Appetite", "Jaundice"],
  "Musculoskeletal": ["Back Pain", "Joint Pain", "Muscle Weakness", "Body Ache", "Neck Pain", "Swollen Joints", "Muscle Cramps", "Bone Pain"],
  "General & Systemic": ["Fever", "High Fever (>103°F)", "Fatigue", "Weakness", "Weight Loss", "Night Sweats", "Sweating", "Chills"],
  "ENT / Head": ["Sore Throat", "Ear Pain", "Ear Discharge", "Nasal Congestion", "Runny Nose", "Nosebleed", "Mouth Ulcers", "Toothache", "Eye Pain", "Eye Redness"],
  "Skin": ["Skin Rash", "Itching (Pruritus)", "Skin Discoloration", "Wound / Injury", "Burning Sensation", "Bruising"],
  "Urological / Reproductive": ["Urinary Pain / Burning", "Frequent Urination", "Blood in Urine", "Reduced Urine Output", "Groin Pain"],
  "Mental Health": ["Anxiety", "Depression", "Insomnia / Sleep Problems", "Panic Attack", "Mood Swings"],
};

type Mode = "form" | "pdf";

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("form");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Cardiovascular");

  const [form, setForm] = useState({
    symptoms_text: "",
    bp_systolic: "", bp_diastolic: "", blood_sugar: "",
    temperature: "", pulse: "", oxygen: "",
    diabetes: false, hypertension: false, heart_disease: false, asthma: false,
    kidney_disease: false, thyroid: false, cancer: false, stroke_history: false,
    chest_pain: false, breathing_difficulty: false, loss_of_consciousness: false, severe_allergic_reaction: false,
  });

  const toggleSym = useCallback((s: string) =>
    setSelectedSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]), []);

  const handleVoiceTranscript = useCallback((text: string) => {
    setForm(p => ({ ...p, symptoms_text: p.symptoms_text ? p.symptoms_text + " " + text : text }));
  }, []);

  const handleVoiceSymptomDetected = useCallback((symptom: string) => {
    setSelectedSymptoms(p => p.includes(symptom) ? p : [...p, symptom]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "pdf" && !pdfFile) { setError("Please select a PDF file"); return; }
    if (mode === "form" && !form.symptoms_text && selectedSymptoms.length === 0) {
      setError("Please describe your symptoms or select from the list"); return;
    }
    setError(""); setLoading(true);

    const uid = localStorage.getItem("pq_user_id") || "";
    
    try {
      if (mode === "pdf") {
        const fd = new FormData();
        fd.append("patient_id", uid);
        fd.append("age", "35");
        fd.append("file", pdfFile as File);
        // Append form fields to FormData
        Object.entries(form).forEach(([k, v]) => {
          if (v !== "" && v !== false && k !== "symptoms_text") {
            fd.append(k, String(v));
          }
        });
        const res = await apiClient.post("/patients/upload-pdf", fd);
        localStorage.setItem("pq_last_report", JSON.stringify(res.data.data));
      } else {
        const allSymptoms = [form.symptoms_text, ...selectedSymptoms].filter(Boolean).join(", ");
        const res = await apiClient.post("/patients/report", {
          patient_id: uid, symptoms: allSymptoms, age: 35,
          vitals: {
            bp_systolic: form.bp_systolic ? parseFloat(form.bp_systolic) : null,
            bp_diastolic: form.bp_diastolic ? parseFloat(form.bp_diastolic) : null,
            blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
            temperature: form.temperature ? parseFloat(form.temperature) : null,
            pulse: form.pulse ? parseFloat(form.pulse) : null,
            oxygen: form.oxygen ? parseFloat(form.oxygen) : null,
          },
          medical_history: {
            diabetes: form.diabetes, hypertension: form.hypertension,
            heart_disease: form.heart_disease, asthma: form.asthma,
            kidney_disease: form.kidney_disease, thyroid: form.thyroid,
            cancer: form.cancer, stroke_history: form.stroke_history,
          },
          emergency_flags: {
            chest_pain: form.chest_pain, breathing_difficulty: form.breathing_difficulty,
            loss_of_consciousness: form.loss_of_consciousness, severe_allergic_reaction: form.severe_allergic_reaction,
          },
        });
        localStorage.setItem("pq_last_report", JSON.stringify(res.data.data));
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/prediction"), 1500);
    } catch (err: any) {
      setError(err.message || "Submission failed");
    }
    setLoading(false);
  };

  if (success) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center animate-bounce-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Report Submitted!</h2>
        <p className="text-gray-500 text-sm">AI is analyzing your information…</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-blue-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />Redirecting...
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-gray-900">Submit Medical Report</h1>
        <p className="text-sm text-gray-400 mt-0.5">Describe symptoms or upload a PDF, and provide your vitals</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1.5 animate-slide-up" style={{ animationDelay: "60ms" }}>
        {(["form", "pdf"] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === m ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-500 hover:bg-gray-50"
            }`}>
            {m === "form" ? <><ClipboardList className="w-4 h-4" />Manual Input</> : <><FileText className="w-4 h-4" />Upload PDF Report</>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
        {mode === "pdf" ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />Upload Medical PDF
            </h2>
            <p className="text-xs text-gray-500 mb-5">Upload any medical report, lab results, prescription, or discharge summary.</p>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f?.type === "application/pdf") { setPdfFile(f); setError(""); }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                dragOver ? "border-blue-400 bg-blue-50" : pdfFile ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setError(""); } }} />
              {pdfFile ? (
                <div className="space-y-3 animate-scale-in">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{pdfFile.name}</div>
                  <button type="button" onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 rounded-lg text-xs font-medium transition-all">
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{dragOver ? "Drop PDF here" : "Click or drag your PDF here"}</div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                    <FilePlus className="w-3.5 h-3.5" />Browse Files
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <VoiceRecorder onTranscript={handleVoiceTranscript} onSymptomDetected={handleVoiceSymptomDetected} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-500" />Symptoms Description
              </h2>
              <textarea value={form.symptoms_text} onChange={e => setForm(p => ({ ...p, symptoms_text: e.target.value }))} rows={3} placeholder="Describe what you're experiencing..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-all" />
              <div>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                  {Object.keys(SYMPTOMS_GROUPED).map(cat => (
                    <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCategory === cat ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{cat}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS_GROUPED[activeCategory].map(s => (
                    <button key={s} type="button" onClick={() => toggleSym(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedSymptoms.includes(s) ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"}`}>{s}</button>
                  ))}
                </div>
              </div>
              {selectedSymptoms.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                  {selectedSymptoms.map(s => ( <span key={s} onClick={() => toggleSym(s)} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium cursor-pointer">{s}<X className="w-3 h-3" /></span> ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SHARED SECTIONS (Visible in both PDF and Manual modes) */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5 mt-4">
          <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Emergency Indicators</h2>
          <div className="grid grid-cols-2 gap-2">
            {[["chest_pain", "Chest Pain / Pressure"], ["breathing_difficulty", "Breathing Difficulty"], ["loss_of_consciousness", "Loss of Consciousness"], ["severe_allergic_reaction", "Severe Allergic Reaction"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-red-100 transition-colors border border-transparent hover:border-red-200">
                <input type="checkbox" checked={form[k as keyof typeof form] as boolean} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500" />
                <span className="text-sm font-medium text-red-800">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-500" /> Vitals <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[["bp_systolic", "Systolic BP", "mmHg", "120"], ["bp_diastolic", "Diastolic BP", "mmHg", "80"], ["pulse", "Pulse", "bpm", "72"], ["temperature", "Temp", "°F", "98.6"], ["blood_sugar", "Glucose", "mg/dL", "100"], ["oxygen", "SpO2", "%", "98"]].map(([k, l, u, p]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{l} <span className="text-gray-400">({u})</span></label>
                <input type="number" step="0.1" value={form[k as keyof typeof form] as string} onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))} placeholder={p} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />Medical History</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[["diabetes", "Diabetes"], ["hypertension", "Hypertension"], ["heart_disease", "Heart Disease"], ["asthma", "Asthma / COPD"], ["kidney_disease", "Kidney Disease"], ["thyroid", "Thyroid Disorder"], ["cancer", "Cancer (any)"], ["stroke_history", "Previous Stroke"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <input type="checkbox" checked={form[k as keyof typeof form] as boolean} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
                <span className="text-sm text-gray-700 font-medium">{l}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-scale-in"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

        <button type="submit" disabled={loading}
          className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 hover:shadow-lg active:scale-[0.98]">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> :
            <>Submit Report & Get AI Assessment <ChevronRight className="w-4 h-4" /></>}
        </button>
      </form>
    </div>
  );
}
