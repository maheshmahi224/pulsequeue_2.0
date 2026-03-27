"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/apiClient";

const SYMPTOMS_LIST = ["Chest Pain","Shortness of Breath","Headache","Nausea","Vomiting","Dizziness","Fever","Fatigue","Cough","Back Pain","Abdominal Pain","Swelling","Palpitations","Numbness","Blurred Vision","Seizure","Loss of Consciousness"];

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const [form, setForm] = useState({
    symptoms_text: "",
    bp_systolic: "", bp_diastolic: "", blood_sugar: "", temperature: "", pulse: "", oxygen: "",
    diabetes: false, hypertension: false, heart_disease: false, asthma: false,
    chest_pain: false, breathing_difficulty: false, loss_of_consciousness: false,
  });

  const toggleSym = (s: string) => setSelectedSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symptoms_text && selectedSymptoms.length === 0) { setError("Please describe your symptoms"); return; }
    setError(""); setLoading(true);
    const uid = localStorage.getItem("pq_user_id") || "";
    const allSymptoms = [form.symptoms_text, ...selectedSymptoms].filter(Boolean).join(", ");
    try {
      const payload = {
        patient_id: uid,
        symptoms: allSymptoms,
        age: 35,
        vitals: {
          bp_systolic: form.bp_systolic ? parseFloat(form.bp_systolic) : null,
          bp_diastolic: form.bp_diastolic ? parseFloat(form.bp_diastolic) : null,
          blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
          temperature: form.temperature ? parseFloat(form.temperature) : null,
          pulse: form.pulse ? parseFloat(form.pulse) : null,
          oxygen: form.oxygen ? parseFloat(form.oxygen) : null,
        },
        medical_history: { diabetes: form.diabetes, hypertension: form.hypertension, heart_disease: form.heart_disease, asthma: form.asthma },
        emergency_flags: { chest_pain: form.chest_pain, breathing_difficulty: form.breathing_difficulty, loss_of_consciousness: form.loss_of_consciousness },
      };
      const res = await apiClient.post("/patients/report", payload);
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
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Report Submitted!</h2>
        <p className="text-gray-500 mt-2">Redirecting to your AI prediction...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Report Symptoms</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete medical intake form for AI triage assessment</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Symptoms */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Symptoms</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Describe your symptoms *</label>
            <textarea value={form.symptoms_text} onChange={e => setForm(p => ({ ...p, symptoms_text: e.target.value }))} rows={3} placeholder="Describe what you're experiencing in detail..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select symptoms (optional)</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS_LIST.map(s => (
                <button key={s} type="button" onClick={() => toggleSym(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedSymptoms.includes(s) ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
          <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-3">⚠ Emergency Indicators</h2>
          <div className="space-y-2">
            {[
              { key: "chest_pain", label: "Chest Pain or Pressure" },
              { key: "breathing_difficulty", label: "Difficulty Breathing" },
              { key: "loss_of_consciousness", label: "Loss of Consciousness" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500" />
                <span className="text-sm font-medium text-red-800">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Vitals */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Vitals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "bp_systolic", label: "Systolic BP", unit: "mmHg", placeholder: "120" },
              { key: "bp_diastolic", label: "Diastolic BP", unit: "mmHg", placeholder: "80" },
              { key: "pulse", label: "Pulse Rate", unit: "bpm", placeholder: "72" },
              { key: "temperature", label: "Temperature", unit: "°F", placeholder: "98.6" },
              { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", placeholder: "100" },
              { key: "oxygen", label: "Oxygen (SpO2)", unit: "%", placeholder: "98" },
            ].map(({ key, label, unit, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label} <span className="text-gray-400">({unit})</span></label>
                <input type="number" step="0.1" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Medical History */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Medical History</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "diabetes", label: "Diabetes" },
              { key: "hypertension", label: "Hypertension" },
              { key: "heart_disease", label: "Heart Disease" },
              { key: "asthma", label: "Asthma" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50">
                <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing AI Triage...</> : "Submit Report & Get AI Assessment"}
        </button>
      </form>
    </div>
  );
}
