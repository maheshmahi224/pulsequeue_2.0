"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity, LayoutDashboard, Users, BarChart2, FileText,
  Settings, LogOut, Bell, Menu, X, Stethoscope, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/queue", label: "Patient Queue", icon: Users },
  { href: "/dashboard/resolved", label: "Resolved Patients", icon: Activity },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifCount, setNotifCount] = useState(3);

  useEffect(() => {
    const token = localStorage.getItem("pq_token");
    const role = localStorage.getItem("pq_role");
    if (!token || role !== "doctor") { router.push("/"); return; }
    setName(localStorage.getItem("pq_name") || "Doctor");
    setMounted(true);
  }, [router]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "DR";

  if (!mounted) return (
    <div className="flex h-screen bg-white items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm text-gray-500">Loading command center...</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 shadow-xl shadow-gray-100/50
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-200 animate-pulse-ring">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">PulseQueue</div>
                <div className="text-xs text-blue-500 font-medium">Doctor Command</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Doctor badge */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">On Duty</span>
                </div>
              </div>
              <Stethoscope className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Main Menu</div>
            {navItems.map(({ href, label, icon: Icon, exact }, idx) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${active ? "sidebar-link-active" : "sidebar-link-inactive"}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-100 space-y-1">
            <button
              onClick={() => { localStorage.clear(); router.push("/"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-all duration-200 group"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <div className="text-xs text-gray-400">Welcome back,</div>
              <div className="text-sm font-semibold text-gray-900">{name}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-700 font-semibold">Live</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors group">
              <Bell className="w-5 h-5 group-hover:animate-bounce" />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
                  {notifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
