"use client";
import { useEffect, useState } from "react";
import { MessageSquare, Clock } from "lucide-react";
import apiClient from "@/lib/apiClient";

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const map: Record<string, string> = { HIGH: "text-red-600 bg-red-50", MEDIUM: "text-orange-600 bg-orange-50", LOW: "text-green-600 bg-green-50" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[priority] || ""}`}>{priority}</span>;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("pq_user_id");
    if (!uid) return;
    apiClient.get(`/patients/${uid}/notes`).then(res => setNotes(res.data.data.notes || [])).catch(() => setNotes([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Doctor Notes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Notes and updates from your medical team</p>
      </div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}</div> :
        notes.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No notes yet</h3>
            <p className="text-sm text-gray-500">Your doctor hasn't added any notes. They will appear here after your consultation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{note.doctor_name || "Attending Doctor"}</div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleString()}
                    </div>
                  </div>
                  {note.priority_change && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                      Priority: <span className="font-medium">{note.priority_change}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{note.message}</p>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
