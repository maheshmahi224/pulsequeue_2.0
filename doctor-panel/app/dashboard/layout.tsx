"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, LayoutDashboard, Users, BarChart2, FileText, Settings, LogOut, Bell, Menu } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/queue", label: "Patient Queue", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("pq_token");
    const role = localStorage.getItem("pq_role");
    if (!token || role !== "doctor") { router.push("/"); return; }
    setName(localStorage.getItem("pq_name") || "Doctor");
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-sm font-bold text-white">PulseQueue</div>
              <div className="text-xs text-gray-500">Doctor Panel</div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}>
                  <Icon className={`w-4 h-4 ${active ? "text-blue-400" : "text-gray-500"}`} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{name}</div>
                <div className="text-xs text-gray-500">Doctor</div>
              </div>
            </div>
            <button onClick={() => { localStorage.clear(); router.push("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-900/20 hover:text-red-400 w-full transition-all">
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400"><Menu className="w-5 h-5" /></button>
          <div className="flex-1 lg:flex-none">
            <div className="text-sm text-gray-500">Command Center · <span className="font-medium text-gray-200">{name}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-800 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">System Active</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"><Bell className="w-5 h-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
