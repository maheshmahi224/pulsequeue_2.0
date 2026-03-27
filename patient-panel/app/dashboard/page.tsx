"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Clock, FileText, ListOrdered, ChevronRight } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority: string }) {
  const colors = { HIGH: "bg-red-100 text-red-700 border-red-200", MEDIUM: "bg-orange-100 text-orange-700 border-orange-200", LOW: "bg-green-100 text-green-700 border-green-200" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[priority as keyof typeof colors] || colors.LOW}`}>{priority}</span>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function PatientDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("pq_user_id");
    if (!uid) return;
    apiClient.get(`/patients/${uid}`).then(res => {
      setProfile(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded-xl w-64 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  const latest = profile?.latest_report;
  const queue = profile?.queue_status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your health triage overview</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Priority" value={latest?.priority || "—"} icon={AlertTriangle} color="bg-red-100 text-red-600" />
        <StatCard label="Queue Position" value={queue?.queue_position ?? "—"} icon={ListOrdered} color="bg-blue-100 text-blue-600" />
        <StatCard label="Risk Score" value={latest ? `${latest.risk_score}/100` : "—"} icon={Activity} color="bg-orange-100 text-orange-600" />
        <StatCard label="Reports" value={profile?.report_count ?? 0} icon={FileText} color="bg-green-100 text-green-600" />
      </div>

      {/* Priority card */}
      {latest && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Current Status</h2>
            <PriorityBadge priority={latest.priority} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Queue Position</div>
              <div className="text-2xl font-bold text-gray-900">#{queue?.queue_position ?? "N/A"}</div>
              <div className="text-xs text-gray-500 mt-1">Est. wait: {queue?.estimated_wait || "N/A"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Risk Score</div>
              <div className="text-2xl font-bold text-gray-900">{latest.risk_score}/100</div>
              <div className="text-xs text-gray-500 mt-1">Based on vitals & symptoms</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/report", label: "Report Symptoms", desc: "Submit new symptoms and vitals", color: "bg-blue-600 hover:bg-blue-700" },
          { href: "/dashboard/queue", label: "Check Queue", desc: "View your position in queue", color: "bg-indigo-600 hover:bg-indigo-700" },
          { href: "/dashboard/notes", label: "Doctor Notes", desc: "View notes from your doctor", color: "bg-purple-600 hover:bg-purple-700" },
        ].map(item => (
          <Link key={item.href} href={item.href} className={`${item.color} text-white rounded-2xl p-5 flex items-center justify-between transition-all group`}>
            <div>
              <div className="font-semibold text-sm">{item.label}</div>
              <div className="text-white/70 text-xs mt-0.5">{item.desc}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </Link>
        ))}
      </div>

      {!latest && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No reports submitted yet</h3>
          <p className="text-sm text-gray-600 mb-4">Start by reporting your symptoms to get AI-powered triage</p>
          <Link href="/dashboard/report" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all">
            Report Symptoms <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
