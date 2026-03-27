"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2, AlertCircle, CheckCircle2, Upload, FileText,
  X, FilePlus, Stethoscope, ClipboardList, ChevronRight, Mic
} from "lucide-react";
import apiClient from "@/lib/apiClient";

// Load voice recorder client-side only (uses browser APIs)
const VoiceRecorder = dynamic(() => import("@/components/VoiceRecorder"), { ssr: false });

// Comprehensive symptom list grouped by category
const SYMPTOMS_GROUPED: Record<string, string[]> = {
  "Cardiovascular": [
    "Chest Pain", "Chest Tightness", "Palpitations", "Irregular Heartbeat",
    "Swelling (Ankles/Feet)", "Shortness of Breath", "Cold Extremities"
  ],
  "Neurological": [
    "Headache", "Migraine", "Dizziness", "Numbness / Tingling",
    "Blurred Vision", "Seizure", "Loss of Consciousness", "Memory Loss",
    "Slurred Speech", "Facial Drooping", "Confusion"
  ],
  "Respiratory": [
    "Cough", "Dry Cough", "Productive Cough", "Wheezing",
    "Breathlessness", "Chest Congestion", "Hemoptysis (Coughing Blood)"
  ],
  "Gastrointestinal": [
    "Nausea", "Vomiting", "Abdominal Pain", "Diarrhea",
    "Constipation", "Bloating", "Acidity / Heartburn", "Black Stool",
    "Blood in Stool", "Loss of Appetite", "Jaundice"
  ],
  "Musculoskeletal": [
    "Back Pain", "Joint Pain", "Muscle Weakness", "Body Ache",
    "Neck Pain", "Swollen Joints", "Muscle Cramps", "Bone Pain"
  ],
  "General & Systemic": [
    "Fever", "High Fever (>103°F)", "Fatigue", "Weakness",
    "Weight Loss", "Night Sweats", "Sweating", "Chills"
  ],
  "ENT / Head": [
    "Sore Throat", "Ear Pain", "Ear Discharge", "Nasal Congestion",
    "Runny Nose", "Nosebleed", "Mouth Ulcers", "Toothache", "Eye Pain", "Eye Redness"
  ],
  "Skin": [
    "Skin Rash", "Itching (Pruritus)", "Skin Discoloration", "Wound / Injury",
    "Burning Sensation", "Bruising"
  ],
  "Urological / Reproductive": [
    "Urinary Pain / Burning", "Frequent Urination", "Blood in Urine",
    "Reduced Urine Output", "Groin Pain"
  ],
  "Mental Health": [
    "Anxiety", "Depression", "Insomnia / Sleep Problems",
    "Panic Attack", "Mood Swings"
  ],
};

const ALL_SYMPTOMS = Object.values(SYMPTOMS_GROUPED).flat();

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
  const [showAllCategories, setShowAllCategories] = useState(false);

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

  // Voice recorder callbacks
  const handleVoiceTranscript = useCallback((text: string) => {
    setForm(p => ({
      ...p,
      symptoms_text: p.symptoms_text ? p.symptoms_text + " " + text : text
    }));
  }, []);

  const handleVoiceSymptomDetected = useCallback((symptom: string) => {
    setSelectedSymptoms(p => p.includes(symptom) ? p : [...p, symptom]);
  }, []);

  // ── PDF Submit ─────────────────────────────────────────────────────────
  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) { setError("Please select a PDF file"); return; }
    setError(""); setLoading(true);
    const uid = localStorage.getItem("pq_user_id") || "";
    const fd = new FormData();
    fd.append("patient_id", uid);
    fd.append("age", "35");
    fd.append("file", pdfFile);
    try {
      const res = await apiClient.post("/patients/upload-pdf", fd);
      localStorage.setItem("pq_last_report", JSON.stringify(res.data.data));
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/prediction"), 1800);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "PDF upload failed");
    }
    setLoading(false);
  };

  // ── Form Submit ────────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symptoms_text && selectedSymptoms.length === 0) {
      setError("Please describe your symptoms or select from the list"); return;
    }
    setError(""); setLoading(true);
    const uid = localStorage.getItem("pq_user_id") || "";
    const allSymptoms = [form.symptoms_text, ...selectedSymptoms].filter(Boolean).join(", ");
    try {
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
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirecting to AI prediction...
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-gray-900">Submit Medical Report</h1>
        <p className="text-sm text-gray-400 mt-0.5">Describe symptoms by voice, form, or upload a PDF report</p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1.5 animate-slide-up" style={{ animationDelay: "60ms" }}>
        {(["form", "pdf"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === m ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {m === "form" ? <><ClipboardList className="w-4 h-4" />Fill Out Form</> : <><FileText className="w-4 h-4" />Upload PDF Report</>}
          </button>
        ))}
      </div>

      {/* ── PDF Mode ─────────────────────────────────────────────────── */}
      {mode === "pdf" && (
        <form onSubmit={handlePdfSubmit} className="space-y-4 animate-slide-up">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />Upload Medical PDF
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Upload any medical report, lab results, prescription, or discharge summary. Our AI will extract structured health data and generate a triage assessment.
            </p>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f?.type === "application/pdf") { setPdfFile(f); setError(""); }
                else setError("Only PDF files are accepted");
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                dragOver ? "border-blue-400 bg-blue-50" :
                pdfFile ? "border-green-300 bg-green-50" :
                "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setError(""); } }} />
              {pdfFile ? (
                <div className="space-y-3 animate-scale-in">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{pdfFile.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB · PDF</div>
                  </div>
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
                  <div>
                    <div className="text-sm font-semibold text-gray-700">{dragOver ? "Drop PDF here" : "Click or drag your PDF here"}</div>
                    <div className="text-xs text-gray-400 mt-1">PDF files up to 10MB</div>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                    <FilePlus className="w-3.5 h-3.5" />Browse Files
                  </div>
                </div>
              )}
            </div>
            {/* What AI extracts */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />AI extracts from your PDF:
              </div>
              <div className="grid grid-cols-2 gap-1">
                {["Symptoms & complaints", "Diagnoses & conditions", "Lab values & vitals", "Medication history",
                  "Risk keywords", "Doctor notes", "Test results", "Treatment history"].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-blue-600">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {error && <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-scale-in">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>}
          <button type="submit" disabled={loading || !pdfFile}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 hover:shadow-lg active:scale-[0.98]">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing PDF with AI...</> :
              <><Upload className="w-4 h-4" />Upload & Get AI Assessment<ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}

      {/* ── Form Mode ────────────────────────────────────────────────── */}
      {mode === "form" && (
        <form onSubmit={handleFormSubmit} className="space-y-4 animate-slide-up">
          {/* Voice Recorder */}
          <VoiceRecorder
            onTranscript={handleVoiceTranscript}
            onSymptomDetected={handleVoiceSymptomDetected}
          />

          {/* Symptom Text */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-500" />Symptoms Description
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Describe in detail <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-2 font-normal">(or use voice input above)</span>
              </label>
              <textarea
                value={form.symptoms_text}
                onChange={e => setForm(p => ({ ...p, symptoms_text: e.target.value }))}
                rows={3}
                placeholder="Describe what you're experiencing — pain location, severity (1-10), when it started, triggers…"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-all"
              />
            </div>

            {/* Category tabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Quick-select symptoms</span>
                <span className="text-xs text-gray-400">{selectedSymptoms.length} selected</span>
              </div>
              {/* Category scroll */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {Object.keys(SYMPTOMS_GROUPED).map(cat => (
                  <button
                    key={cat} type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeCategory === cat ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >{cat}</button>
                ))}
              </div>
              {/* Symptom chips for active category */}
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS_GROUPED[activeCategory].map(s => (
                  <button key={s} type="button" onClick={() => toggleSym(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedSymptoms.includes(s)
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Selected symptoms summary */}
            {selectedSymptoms.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Selected ({selectedSymptoms.length}):</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSymptoms.map(s => (
                    <span key={s} onClick={() => toggleSym(s)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                      {s}<X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emergency flags */}
          <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
            <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />Emergency Indicators
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "chest_pain", label: "Chest Pain / Pressure" },
                { key: "breathing_difficulty", label: "Breathing Difficulty" },
                { key: "loss_of_consciousness", label: "Loss of Consciousness" },
                { key: "severe_allergic_reaction", label: "Severe Allergic Reaction" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-red-100 transition-colors border border-transparent hover:border-red-200">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500" />
                  <span className="text-sm font-medium text-red-800">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-500" />
              Vitals <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "bp_systolic", label: "Systolic BP", unit: "mmHg", placeholder: "120" },
                { key: "bp_diastolic", label: "Diastolic BP", unit: "mmHg", placeholder: "80" },
                { key: "pulse", label: "Pulse Rate", unit: "bpm", placeholder: "72" },
                { key: "temperature", label: "Temperature", unit: "°F", placeholder: "98.6" },
                { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", placeholder: "100" },
                { key: "oxygen", label: "SpO2", unit: "%", placeholder: "98" },
              ].map(({ key, label, unit, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label} <span className="text-gray-400">({unit})</span></label>
                  <input type="number" step="0.1" value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />Medical History
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "diabetes", label: "Diabetes" }, { key: "hypertension", label: "Hypertension" },
                { key: "heart_disease", label: "Heart Disease" }, { key: "asthma", label: "Asthma / COPD" },
                { key: "kidney_disease", label: "Kidney Disease" }, { key: "thyroid", label: "Thyroid Disorder" },
                { key: "cancer", label: "Cancer (any)" }, { key: "stroke_history", label: "Previous Stroke" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
                  <span className="text-sm text-gray-700 font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-scale-in">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 hover:shadow-lg active:scale-[0.98]">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing AI Triage...</> :
              <>Submit Report & Get AI Assessment <ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}
    </div>
  );
}
