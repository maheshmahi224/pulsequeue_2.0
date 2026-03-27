"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Activity } from "lucide-react";

export default function DoctorSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  useEffect(() => {
    setName(localStorage.getItem("pq_name") || "");
    setUserId(localStorage.getItem("pq_user_id") || "");
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">{name.charAt(0)}</div>
          <div>
            <div className="font-semibold text-white">{name}</div>
            <div className="text-sm text-gray-500 font-mono">{userId.slice(0, 16)}...</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-gray-400"><User className="w-4 h-4" /> Role</div>
            <span className="text-sm font-medium text-blue-400">Doctor</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-gray-400"><Activity className="w-4 h-4" /> System</div>
            <span className="text-sm font-medium text-green-400">Online</span>
          </div>
        </div>
      </div>
      <button onClick={() => { localStorage.clear(); router.push("/"); }} className="flex items-center gap-2 px-5 py-3 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-xl text-sm font-medium transition-all border border-red-800">
        <LogOut className="w-4 h-4" />Sign Out
      </button>
    </div>
  );
}
