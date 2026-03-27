"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  useEffect(() => {
    setName(localStorage.getItem("pq_name") || "");
    setUserId(localStorage.getItem("pq_user_id") || "");
  }, []);
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">{name.charAt(0)}</div>
          <div><div className="font-semibold text-gray-900">{name}</div><div className="text-sm text-gray-500 font-mono">{userId.slice(0, 12)}...</div></div>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3 text-sm text-gray-700"><User className="w-4 h-4" />Role</div>
          <span className="text-sm font-medium text-blue-600">Patient</span>
        </div>
      </div>
      <button onClick={() => { localStorage.clear(); router.push("/"); }} className="flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-all">
        <LogOut className="w-4 h-4" />Sign Out
      </button>
    </div>
  );
}
