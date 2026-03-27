"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Brain, ListOrdered, ChevronRight, RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { HIGH: "bg-red-100 text-red-700 border-red-200", MEDIUM: "bg-orange-100 text-orange-700 border-orange-200", LOW: "bg-green-100 text-green-700 border-green-200" };
  return <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${map[priority] || map.LOW}`}>{priority} PRIORITY</span>;
}

export default function PredictionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("pq_last_report");
    if (saved) { setData(JSON.parse(saved)); setLoading(false); return; }
    const uid = localStorage.getItem("pq_user_id");
    if (!uid) { setLoading(false); return; }
    apiClient.get(`/patients/${uid}`).then(res => {
      const p = res.data.data;
      if (p?.latest_report) setData({ ...p.latest_report, queue_position: p.queue_status?.queue_position });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>;
  if (!data) return (
    <div className="text-center py-16">
      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-900">No prediction available</h2>
      <p className="text-gray-500 mb-4">Submit a symptom report first</p>
      <Link href="/dashboard/report" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Report Symptoms</Link>
    </div>
  );

  const reasoning = data.reasoning || data.ai_reasoning || {};
  const predictions = data.prediction || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Prediction Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clinical decision support analysis</p>
        </div>
        <button onClick={() => { localStorage.removeItem("pq_last_report"); window.location.reload(); }} className="p-2 rounded-xl hover:bg-gray-100 transition-all"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
      </div>

      {/* Priority Banner */}
      <div className={`rounded-2xl p-6 border-2 ${data.priority === "HIGH" ? "bg-red-50 border-red-200" : data.priority === "MEDIUM" ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">Triage Priority</div>
            <PriorityBadge priority={data.priority} />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-600 mb-1">Risk Score</div>
            <div className="text-3xl font-bold text-gray-900">{data.risk_score}<span className="text-lg text-gray-400">/100</span></div>
          </div>
        </div>
      </div>

      {/* Predictions */}
      {predictions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">AI Predicted Conditions</h2>
          </div>
          <div className="space-y-3">
            {predictions.map((pred: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{pred.name}</span>
                    <span className="text-sm font-semibold text-gray-700">{Math.round(pred.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pred.confidence * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">* AI predictions are for clinical decision support only. Final diagnosis is made by your doctor.</p>
        </div>
      )}

      {/* AI Reasoning */}
      {(reasoning.risk_reason || reasoning.supporting_factors?.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-900">AI Clinical Reasoning</h2>
          </div>
          {reasoning.risk_reason && <p className="text-sm text-gray-700 mb-4 leading-relaxed">{reasoning.risk_reason}</p>}
          {reasoning.supporting_factors?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Risk Factors</div>
              <ul className="space-y-1.5">
                {reasoning.supporting_factors.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500 mt-0.5">•</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Queue */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">Queue Status</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-indigo-700">#{data.queue_position ?? "N/A"}</div>
            <div className="text-xs text-indigo-600 mt-1">Queue Position</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">Active</div>
            <div className="text-xs text-gray-500 mt-1">Status</div>
          </div>
        </div>
      </div>

      <Link href="/dashboard/queue" className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all">
        <span className="text-sm font-medium text-gray-700">View detailed queue status</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </Link>
    </div>
  );
}
