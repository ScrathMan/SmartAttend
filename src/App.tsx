import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "./lib/supabase";
import { getCurrentProfile, signInWithSupabase, signOutFromSupabase, signUpWithSupabase, UserProfile } from "./lib/auth";
import { CourseScheduleItem, createCourseAndSection, fetchAllAvailableSections, fetchLecturerSections, fetchStudentCourses, toggleStudentEnrollment } from "./lib/courses";
import {
  createLeaveRequestInDb,
  decideLeaveRequestInDb,
  fetchLecturerLeaveRequests,
  fetchStudentLeaveRequests,
} from "./lib/leave";
import {
  ActiveSessionInfo,
  closeAttendanceSession,
  createAttendanceSession,
  fetchLatestActiveSession,
  fetchSessionAttendees,
  fetchSemesterRecapMatrix,
  fetchStudentAttendanceHistory,
  SemesterStudentRow,
  LiveAttendeeItem,
  rotateSessionQrToken,
  submitStudentCheckIn,
} from "./lib/attendance";

type Role = "student" | "lecturer";
type Screen =
  | "login"
  | "student-dashboard"
  | "scan"
  | "history"
  | "leave-form"
  | "leave-history"
  | "leave-detail-student"
  | "lecturer-dashboard"
  | "leave-requests"
  | "leave-detail-lecturer"
  | "create-session"
  | "live"
  | "semester-recap";
type LeaveReason = "Sakit" | "Izin Keperluan Lain" | "Keperluan Keluarga";
type LeaveStatus = "Menunggu Persetujuan" | "Disetujui" | "Ditolak";
type LeaveRequest = {
  id: string | number;
  student: string;
  studentId: string;
  course: string;
  code: string;
  group: string;
  absenceDate: string;
  reason: LeaveReason;
  description: string;
  attachment?: string;
  submittedAt: string;
  status: LeaveStatus;
  lecturerNote?: string;
};
type IconName =
  | "arrow"
  | "bell"
  | "book"
  | "calendar"
  | "camera"
  | "check"
  | "chevron"
  | "clock"
  | "dashboard"
  | "history"
  | "info"
  | "live"
  | "logout"
  | "menu"
  | "plus"
  | "qr"
  | "search"
  | "shield"
  | "user"
  | "users"
  | "x";

const studentCourses = [
  { time: "08.00", end: "09.40", name: "Pemrograman Berorientasi Objek", code: "IF2140", room: "FIK-LAB 301", color: "blue" },
  { time: "10.00", end: "11.40", name: "Manajemen Proyek Perangkat Lunak", code: "IF2150", room: "FIK-LAB 202", color: "violet" },
  { time: "13.00", end: "14.40", name: "Interaksi Manusia dan Komputer", code: "IF2160", room: "Dewi Sartika 303", color: "amber" },
];

const initialHistory: Array<{ date: string; course: string; code: string; time: string; status: string }> = [];

const initialLeaveRequests: LeaveRequest[] = [];

const lecturerClasses = [
  { code: "IF2140", name: "Pemrograman Berorientasi Objek", group: "Kelas A", students: 38, attended: 34, time: "08.00 – 09.40", room: "Lab Komputer 3", color: "blue" },
  { code: "IF2150", name: "Metode Penelitian", group: "Kelas B", students: 42, attended: 39, time: "10.00 – 11.40", room: "Gedung B • 203", color: "violet" },
  { code: "IF2160", name: "Manajemen Proyek Perangkat Lunak", group: "Kelas A", students: 36, attended: 31, time: "13.00 – 14.40", room: "Gedung C • 301", color: "amber" },
];

const attendeeSeed = [
  { name: "Farrel Daiva Eka Satria Ivansyah", id: "2510511008", time: "07.54", status: "Hadir", initials: "NP", tone: "blue" },
  { name: "Yoga Tri Wibowo", id: "2510511009", time: "07.56", status: "Hadir", initials: "RA", tone: "violet" },
  { name: "Diandra Muhammad Azka", id: "2510511020", time: "07.58", status: "Hadir", initials: "SN", tone: "amber" },
  { name: "Muhammad Ridwan Dzikriansyah", id: "2510511024", time: "08.01", status: "Hadir", initials: "MF", tone: "emerald" },
  { name: "Reinaldo Sebastian Sirait", id: "2310511036 ", time: "08.04", status: "Hadir", initials: "CM", tone: "rose" },

];

function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14h1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    book: <><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2zM20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    live: <><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" /><circle cx="12" cy="12" r="1.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    arrow: <path d="m15 18-6-6 6-6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Button({ children, onClick, variant = "primary", type = "button", className = "", disabled = false }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; type?: "button" | "submit"; className?: string; disabled?: boolean }) {
  const styles = {
    primary: "bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}

function Field({ label, type = "text", value, onChange, placeholder, icon }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: IconName }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <span className="relative block">
      {icon && <Icon name={icon} size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full rounded-xl border border-slate-200 bg-white py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 ${icon ? "pl-11 pr-4" : "px-4"}`} />
    </span>
  </label>;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50">{children}</select>
  </label>;
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
  </label>;
}

function formatAbsenceDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"><Icon name="qr" size={22} /></div>
    {!compact && <div><div className="text-lg font-bold tracking-tight text-slate-900">Smart<span className="text-blue-600">Attend</span></div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Kampus digital</div></div>}
  </div>;
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "Hadir" || status === "Sakit" || status === "Izin"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Terlambat" || status === "Menunggu Verifikasi"
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-700";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const cls = status === "Disetujui"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Ditolak"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

function Feedback({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-6 ${styles[tone]}`}><Icon name={tone === "success" ? "check" : tone === "error" ? "x" : "info"} size={19} className="mt-0.5 shrink-0" /><span>{children}</span></div>;
}

function Avatar({ initials, tone = "blue", small = false }: { initials: string; tone?: string; small?: boolean }) {
  const tones: Record<string, string> = { blue: "bg-blue-100 text-blue-700", violet: "bg-violet-100 text-violet-700", amber: "bg-amber-100 text-amber-700", emerald: "bg-emerald-100 text-emerald-700", rose: "bg-rose-100 text-rose-700", slate: "bg-slate-200 text-slate-700" };
  return <div className={`grid shrink-0 place-items-center rounded-full font-bold ${small ? "size-9 text-xs" : "size-11 text-sm"} ${tones[tone]}`}>{initials}</div>;
}

function Sidebar({
  role,
  screen,
  navigate,
  profile,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: {
  role: Role;
  screen: Screen;
  navigate: (s: Screen) => void;
  profile: UserProfile | null;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const displayName = profile?.full_name || (role === "student" ? "Agoy Salloh" : "Dr. Bima Santoso");
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const studentNav = [
    { label: "Beranda", icon: "dashboard" as IconName, screen: "student-dashboard" as Screen },
    { label: "Scan QR", icon: "camera" as IconName, screen: "scan" as Screen },
    { label: "Riwayat Absensi", icon: "history" as IconName, screen: "history" as Screen },
    { label: "Ajukan Izin", icon: "plus" as IconName, screen: "leave-form" as Screen },
    { label: "Riwayat Izin", icon: "calendar" as IconName, screen: "leave-history" as Screen },
  ];
  const lecturerNav = [
    { label: "Beranda", icon: "dashboard" as IconName, screen: "lecturer-dashboard" as Screen },
    { label: "Buat Sesi", icon: "plus" as IconName, screen: "create-session" as Screen },
    { label: "Presensi Live", icon: "live" as IconName, screen: "live" as Screen },
    { label: "Rekap Semester", icon: "history" as IconName, screen: "semester-recap" as Screen },
    { label: "Permohonan Izin", icon: "calendar" as IconName, screen: "leave-requests" as Screen },
  ];
  const nav = role === "student" ? studentNav : lecturerNav;

  const sidebarBody = (isMobile: boolean) => (
    <>
      <div className="flex items-center justify-between px-2">
        <Logo />
        {isMobile && (
          <Button variant="ghost" onClick={onCloseMobile} aria-label="Tutup menu" className="!size-9 !p-0 text-slate-400 hover:text-slate-700">
            <Icon name="x" size={18} />
          </Button>
        )}
      </div>
      <nav className="mt-10 space-y-1.5">
        {nav.map((item) => (
          <Button
            key={item.screen}
            onClick={() => {
              navigate(item.screen);
              if (isMobile) onCloseMobile();
            }}
            variant="ghost"
            className={`w-full !justify-start !px-3.5 ${screen === item.screen ? "!bg-blue-50 !text-blue-700" : ""}`}
          >
            <Icon name={item.icon} size={19} />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-100 pt-5">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar initials={initials} small />
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold text-slate-800">{displayName}</span>
            <span className="block text-xs font-normal text-slate-400">{role === "student" ? "Akun Mahasiswa" : "Akun Dosen"}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (isMobile) onCloseMobile();
            onLogout();
          }}
          className="mt-1 w-full !justify-start !px-3 text-slate-500"
        >
          <Icon name="logout" size={18} />
          Keluar
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        {sidebarBody(false)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col border-r border-slate-200 bg-white px-5 py-6 shadow-2xl">
            {sidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
}

type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: "blue" | "emerald" | "red" | "amber";
  targetScreen: Screen;
  leaveId?: string | number;
};

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const notes = [1046.5, 1318.51]; // C6 -> E6 soft bell chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.38);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // Abaikan jika browser memblokir autoplay audio sebelum interaksi pertama
  }
}

function Topbar({
  title,
  role,
  profile,
  onLogout,
  notifications,
  onOpenNotification,
  onOpenMenu,
}: {
  title: string;
  role: Role;
  profile: UserProfile | null;
  onLogout: () => void;
  notifications: AppNotification[];
  onOpenNotification: (item: AppNotification) => void;
  onOpenMenu: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const currentIds = notifications.map((n) => n.id);
    if (knownIdsRef.current === null) {
      knownIdsRef.current = new Set(currentIds);
      return;
    }
    const hasNewUnread = currentIds.some(
      (id) => !knownIdsRef.current!.has(id) && !readIds.includes(id)
    );
    currentIds.forEach((id) => knownIdsRef.current!.add(id));
    if (hasNewUnread && soundEnabled) {
      playNotificationChime();
    }
  }, [notifications, readIds, soundEnabled]);

  const displayName = profile?.full_name || (role === "student" ? "Agoy Salloh" : "Dr. Bima Santoso");
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    setReadIds(notifications.map((n) => n.id));
  };

  const toneBadge: Record<AppNotification["tone"], string> = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return <header className={`sticky top-0 z-20 flex h-16 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8 items-center justify-between w-full`}>
    <button
      type="button"
      onClick={onOpenMenu}
      aria-label="Buka menu navigasi"
      className="group flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-2 py-1.5 shadow-2xs transition hover:border-blue-200 hover:bg-blue-50/60 active:scale-95 lg:hidden"
    >
      <Logo compact />
      <span className="font-bold text-slate-900">{title}</span>
      <span className="grid size-5 place-items-center rounded-lg bg-white text-slate-500 shadow-2xs ring-1 ring-slate-200/80 transition group-hover:text-blue-600">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>
    <div className="hidden lg:block text-sm font-semibold text-slate-500">{title}</div>
    <div className="flex items-center gap-2">
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          aria-label="Notifikasi"
          className="relative !size-10 !p-0"
        >
          <Icon name="bell" size={19} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {open && (
          <div className="absolute -right-9 sm:right-0 mt-2 w-[min(17.5rem,calc(100vw-2rem))] sm:w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
            <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
              <div>
                <div className="text-xs font-bold text-slate-900">Notifikasi</div>
                <div className="text-[10px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playNotificationChime();
                  }}
                  title={soundEnabled ? "Suara notifikasi aktif (klik untuk bisukan)" : "Suara notifikasi dibisukan (klik untuk aktifkan)"}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${soundEnabled ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                >
                  {soundEnabled ? "🔔 Bunyi" : "🔕 Bisu"}
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3.5 py-6 text-center text-xs text-slate-400">
                  Belum ada pemberitahuan terbaru.
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = !readIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (isUnread) setReadIds((prev) => [...prev, item.id]);
                        setOpen(false);
                        onOpenNotification(item);
                      }}
                      className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-slate-50 ${isUnread ? "bg-blue-50/40" : ""}`}
                    >
                      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${toneBadge[item.tone]}`}>
                        <Icon name={item.tone === "emerald" ? "check" : item.tone === "red" ? "x" : item.tone === "amber" ? "clock" : "qr"} size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-[11px] font-bold text-slate-800">{item.title}</span>
                          {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600">{item.body}</p>
                        <div className="mt-0.5 text-[10px] text-slate-400">{item.time}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"><Avatar initials={initials} small /><span>{role === "student" ? "Mahasiswa" : "Dosen"}</span></div>
      <Button variant="ghost" onClick={onLogout} className="!px-3 !py-2 text-slate-500 hover:text-red-600"><Icon name="logout" size={18} /><span className="hidden sm:inline">Keluar</span></Button>
    </div>
  </header>;
}

function AppShell({
  children,
  role,
  screen,
  navigate,
  title,
  profile,
  onLogout,
  notifications,
  onOpenNotification,
}: {
  children: ReactNode;
  role: Role;
  screen: Screen;
  navigate: (s: Screen) => void;
  title: string;
  profile: UserProfile | null;
  onLogout: () => void;
  notifications: AppNotification[];
  onOpenNotification: (item: AppNotification) => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Sidebar role={role} screen={screen} navigate={navigate} profile={profile} onLogout={onLogout} mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} /><div className="lg:pl-64"><Topbar role={role} title={title} profile={profile} onLogout={onLogout} notifications={notifications} onOpenNotification={onOpenNotification} onOpenMenu={() => setMobileMenuOpen(true)} /><main className="mx-auto max-w-7xl px-5 py-7 pb-12 md:px-8 md:py-9 lg:pb-10">{children}</main></div></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <div className="mb-1 text-sm font-semibold text-blue-600">{eyebrow}</div>}<div className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</div><p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p></div>
    {action}
  </div>;
}


const DEMO_LECTURERS = [
  { label: "Dr. Desta Sandya Prasvita (Metlit, PBO)", email: "desta.sandya@dosen.upnvj.ac.id" },
  { label: "Sanggi Bayu Ardika (IMK)", email: "sanggi.bayu@dosen.upnvj.ac.id" },
  { label: "I Wayan Rangga Pinastawa (Sistem Operasi)", email: "wayan.rangga@dosen.upnvj.ac.id" },
  { label: "Henki Bayu Seta (Keamanan Siber)", email: "henki.bayu@dosen.upnvj.ac.id" },
  { label: "Dr. Widya Cholil (MPPL)", email: "widya.cholil@dosen.upnvj.ac.id" },
  { label: "Dr. Mayanda Mega Santoni (Kompleksitas Algo)", email: "mayanda.mega@dosen.upnvj.ac.id" },
  { label: "Dr. Indra Permana Solihin (Jaringan Komputer)", email: "indra.permana@dosen.upnvj.ac.id" },
];

function Login({ onLogin }: { onLogin: (profile: UserProfile) => void }) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [department, setDepartment] = useState("S1 Informatika - FIK UPNVJ");
  const [email, setEmail] = useState("2510511009@mahasiswa.upnvj.ac.id");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (authMode === "register") {
        if (!fullName.trim() || !studentNumber.trim() || !email.trim() || password.length < 6) {
          throw new Error("Lengkapi nama, NIM/NIP, email, dan kata sandi minimal 6 karakter.");
        }
        const profile = await signUpWithSupabase({
          fullName,
          studentNumber,
          role,
          department,
          email,
          password,
        });
        onLogin(profile);
      } else {
        const profile = await signInWithSupabase(email, password);
        onLogin(profile);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memproses autentikasi.";
      setError(message.includes("Invalid login credentials") ? "Email atau kata sandi salah." : message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="relative min-h-screen overflow-hidden bg-slate-50">
    <div className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden bg-blue-700 lg:block">
      <div className="absolute -right-32 -top-32 size-[34rem] rounded-full border border-white/10" />
      <div className="absolute -right-12 -top-12 size-[22rem] rounded-full border border-white/10" />
      <div className="absolute -bottom-32 -left-32 size-[30rem] rounded-full bg-blue-600" />
      <div className="relative z-10 flex h-full flex-col justify-between p-16 text-white">
        <div className="flex items-center gap-3 text-sm font-semibold text-blue-100"><Icon name="shield" />Fakultas Ilmu Komputer • UPNVJ</div>
        <div className="max-w-lg">
          <div className="mb-8 grid size-20 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur"><Icon name="qr" size={42} /></div>
          <div className="text-4xl font-bold leading-tight">Presensi kampus,<br />lebih cepat dan transparan.</div>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100">Terintegrasi dengan jadwal kuliah Senin–Jumat dan plotting dosen pengampu masing-masing mata kuliah.</p>
          <div className="mt-10 flex gap-8 border-t border-white/15 pt-8">
            <div><div className="text-2xl font-bold">11 Matkul</div><div className="mt-1 text-xs text-blue-200">Teori & Praktikum</div></div>
            <div><div className="text-2xl font-bold">7 Dosen</div><div className="mt-1 text-xs text-blue-200">Plotting SIAKAD</div></div>
            <div><div className="text-2xl font-bold">Real-Time</div><div className="mt-1 text-xs text-blue-200">Scan QR langsung</div></div>
          </div>
        </div>
        <div className="text-xs text-blue-200">SmartAttend • Sistem Presensi Akademik FIK UPNVJ</div>
      </div>
    </div>
    <div className="flex min-h-screen w-full items-center justify-center p-6 lg:w-1/2 lg:p-10">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{authMode === "login" ? "Selamat datang kembali" : "Buat akun baru"}</div>
            <p className="mt-1 text-sm text-slate-500">{authMode === "login" ? "Masuk ke portal SmartAttend." : "Daftarkan akun mahasiswa atau dosen baru."}</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button type="button" onClick={() => { setAuthMode("login"); setPassword("demo1234"); setError(""); }} className={`rounded-lg px-3 py-1.5 transition ${authMode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>Masuk</button>
            <button type="button" onClick={() => { setAuthMode("register"); setEmail(""); setPassword("demo1234"); setError(""); }} className={`rounded-lg px-3 py-1.5 transition ${authMode === "register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>Daftar</button>
          </div>
        </div>
        <div className="mt-6 rounded-xl bg-slate-100 p-1">
          <div className="grid grid-cols-2 gap-1">
            <Button variant="ghost" onClick={() => { setRole("student"); if (authMode === "login") setEmail("2510511009@mahasiswa.upnvj.ac.id"); }} className={`!py-2.5 ${role === "student" ? "!bg-white !text-blue-700 shadow-sm" : ""}`}><Icon name="user" size={17} />Mahasiswa</Button>
            <Button variant="ghost" onClick={() => { setRole("lecturer"); if (authMode === "login") setEmail(DEMO_LECTURERS[0].email); }} className={`!py-2.5 ${role === "lecturer" ? "!bg-white !text-blue-700 shadow-sm" : ""}`}><Icon name="book" size={17} />Dosen</Button>
          </div>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {error && <Feedback tone="error">{error}</Feedback>}

          {authMode === "login" && role === "lecturer" && (
            <SelectField label="Pilih Akun Dosen Pengampu (Simulasi)" value={email} onChange={setEmail}>
              {DEMO_LECTURERS.map((d) => (
                <option key={d.email} value={d.email}>{d.label}</option>
              ))}
            </SelectField>
          )}
          {authMode === "register" && <>
            <Field label="Nama lengkap" icon="user" value={fullName} onChange={setFullName} placeholder="Masukkan nama lengkap" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={role === "student" ? "NIM" : "NIP / NIDN"} value={studentNumber} onChange={setStudentNumber} placeholder="25105110xx" />
              <SelectField label="Program Studi" value={department} onChange={setDepartment}>
                <option value="S1 Informatika - FIK UPNVJ">S1 Informatika</option>
                <option value="S1 Sistem Informasi - FIK UPNVJ">S1 Sistem Informasi</option>
                <option value="S1 Sains Data - FIK UPNVJ">S1 Sains Data</option>
                <option value="D3 Sistem Informasi - FIK UPNVJ">D3 Sistem Informasi</option>
              </SelectField>
            </div>
          </>}
          <Field label="Email institusi" icon="user" type="email" value={email} onChange={setEmail} placeholder="nama@upnvj.ac.id" />
          <Field label="Kata sandi" icon="shield" type="password" value={password} onChange={setPassword} placeholder="Minimal 6 karakter" />
          <Button type="submit" disabled={loading} className="w-full !py-3.5">{loading ? "Memproses..." : authMode === "login" ? `Masuk sebagai ${role === "student" ? "Mahasiswa" : "Dosen"}` : `Daftar & Masuk sebagai ${role === "student" ? "Mahasiswa" : "Dosen"}`}<Icon name="chevron" size={18} /></Button>
        </form>
      </div>
    </div>
  </div>;
}
function StudentDashboard({ navigate, history, leaveRequests, courses, profile, onRefreshCourses }: { navigate: (s: Screen) => void; history: Array<{ date: string; course: string; code: string; time: string; status: string }>; leaveRequests: LeaveRequest[]; courses: CourseScheduleItem[]; profile: UserProfile | null; onRefreshCourses?: () => Promise<void> }) {
  const [catalog, setCatalog] = useState<CourseScheduleItem[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const now = new Date();
  const todayName = dayNames[now.getDay()];
  const currentHour = now.getHours();
  const greeting =
    currentHour < 11
      ? "Selamat pagi"
      : currentHour < 15
      ? "Selamat siang"
      : currentHour < 18
      ? "Selamat sore"
      : "Selamat malam";
  const todayFullDate = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [selectedDay, setSelectedDay] = useState<string>(() =>
    ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].includes(todayName) ? todayName : "Semua"
  );

  useEffect(() => {
    fetchAllAvailableSections().then(setCatalog);
  }, [courses]);

  const handleToggleEnroll = async (sectionId: string, alreadyEnrolled: boolean) => {
    if (!profile) return;
    setEnrollingId(sectionId);
    try {
      await toggleStudentEnrollment({
        studentId: profile.id,
        sectionId,
        enroll: !alreadyEnrolled,
      });
      if (onRefreshCourses) await onRefreshCourses();
      const updated = await fetchAllAvailableSections();
      setCatalog(updated);
    } finally {
      setEnrollingId(null);
    }
  };

  const enrolledIds = new Set(courses.map((c) => c.sectionId));
  const dayOrder: Record<string, number> = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 7 };
  const parseStartMinutes = (timeStr?: string) => {
    const match = (timeStr || "").match(/(\d{1,2})[.:](\d{2})/);
    return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 9999;
  };
  const sortCoursesBySchedule = (list: any[]) =>
    [...list].sort((a, b) => {
      const dayDiff = (dayOrder[a.dayOfWeek || "Senin"] || 99) - (dayOrder[b.dayOfWeek || "Senin"] || 99);
      return dayDiff !== 0 ? dayDiff : parseStartMinutes(a.time) - parseStartMinutes(b.time);
    });

  const rawCourses = sortCoursesBySchedule(
    courses.length > 0 ? courses : studentCourses.map((c) => ({ ...c, dayOfWeek: "Senin", department: profile?.department || "Informatika", lecturerName: "Dosen Pengampu" }))
  );
  const todayCourses = rawCourses.filter((c: any) => (c.dayOfWeek || "Senin") === todayName);
  const displayCourses = selectedDay === "Semua"
    ? rawCourses
    : rawCourses.filter((c: any) => (c.dayOfWeek || "Senin") === selectedDay);
  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "Agoy";
  const deptLabel = profile?.department || "Informatika";
  const pending = leaveRequests.filter((request) => request.studentId === (profile?.student_number || "2510511009") && request.status === "Menunggu Persetujuan").length;
  return <div>
    <PageHeading eyebrow={`Prodi ${deptLabel} • NIM ${profile?.student_number || "2510511009"} • ${todayFullDate}`} title={`${greeting}, ${firstName}!`} description={`Jadwal hari ini (${todayName}): ${todayCourses.length} mata kuliah terjadwal.`} action={<div className="flex flex-wrap gap-2 sm:self-center"><Button variant="secondary" onClick={() => setShowCatalog((v) => !v)}><Icon name="book" size={18} />{showCatalog ? "Tutup Katalog KRS" : "Ambil Kelas / KRS"}</Button><Button onClick={() => navigate("scan")}><Icon name="camera" size={18} />Scan QR Sekarang</Button></div>} />
    {showCatalog && (
      <section className="mb-7 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-slate-900">Katalog Mata Kuliah & Kelas (Multi-Prodi & Multi-Dosen)</div>
            <p className="text-xs text-slate-600">Pilih kelas dari berbagai prodi dan hari kuliah untuk ditambahkan ke jadwal presensimu.</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{catalog.length} kelas tersedia</span>
        </div>
        {catalog.length === 0 ? (
          <div className="rounded-xl bg-white p-4 text-sm text-slate-500">Belum ada kelas tambahan dari dosen. Minta akun dosen menambahkan mata kuliah baru.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {catalog.map((item) => {
              const isEnrolled = enrolledIds.has(item.sectionId);
              return (
                <div key={item.sectionId} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{item.code} • {item.sectionName}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{item.department}</span>
                    </div>
                    <div className="mt-2 font-bold text-slate-900">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-500">Dosen: <span className="font-semibold text-slate-700">{item.lecturerName}</span></div>
                    <div className="mt-1 text-xs text-slate-500">{item.dayOfWeek}, {item.time} • {item.room}</div>
                  </div>
                  <Button
                    variant={isEnrolled ? "secondary" : "primary"}
                    disabled={enrollingId === item.sectionId}
                    onClick={() => handleToggleEnroll(item.sectionId, isEnrolled)}
                    className="mt-4 w-full !py-2 text-xs"
                  >
                    {enrollingId === item.sectionId ? "Menyimpan..." : isEnrolled ? "✓ Terdaftar (Klik untuk batal)" : "+ Ambil Kelas Ini"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    )}
    {(() => {
      const validRecords = (history || []).filter((h) => h.status !== "Menunggu Verifikasi");
      const hadirCount = validRecords.filter((h) => h.status === "Hadir").length;
      const lateCount = validRecords.filter((h) => h.status === "Terlambat").length;
      const izinCount = validRecords.filter((h) => h.status === "Izin").length;
      const sakitDispenCount = validRecords.filter((h) => h.status === "Sakit" || h.status === "Dispensasi").length;
      const attendedCount = hadirCount + lateCount;
      const totalSessions = validRecords.length;
      const totalPoints = hadirCount * 1.0 + sakitDispenCount * 1.0 + izinCount * 0.75 + lateCount * 0.5;
      const pct = totalSessions > 0 ? Math.min(100, Math.round((totalPoints / totalSessions) * 100)) : 0;

      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon="check"
            label="Kehadiran semester ini"
            value={`${attendedCount}/${totalSessions}`}
            detail={totalSessions > 0 ? `${pct}% tingkat kehadiran` : "Belum ada catatan presensi"}
            tone="emerald"
          />
          <StatCard
            icon="calendar"
            label={`Jadwal hari ini (${todayName})`}
            value={`${todayCourses.length} Kelas`}
            detail={todayCourses.length > 0 ? `Kelas pertama pukul ${todayCourses[0]?.time}` : "Tidak ada jadwal kuliah hari ini"}
            tone="blue"
          />
          <StatCard
            icon="clock"
            label="Total keterlambatan"
            value={`${lateCount} Kali`}
            detail={lateCount > 0 ? "Berusahalah datang lebih tepat waktu" : "Belum ada keterlambatan"}
            tone="amber"
          />
        </div>
      );
    })()}
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="text-lg font-bold">Pengajuan izin</div><p className="mt-1 text-sm text-slate-500">Ajukan ketidakhadiran dan pantau keputusan dosen.</p></div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={() => navigate("leave-form")}><Icon name="plus" size={17} />Ajukan Izin</Button>
          <Button variant="secondary" onClick={() => navigate("leave-history")}><Icon name="history" size={17} />Riwayat Pengajuan</Button>
          <Button variant="secondary" onClick={() => navigate("leave-history")}><Icon name="clock" size={17} />Status Pengajuan{pending > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{pending}</span>}</Button>
        </div>
      </div>
    </section>
    <div className="mt-7 grid gap-7 xl:grid-cols-[1.55fr_0.75fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="text-lg font-bold">Jadwal perkuliahan</div><div className="mt-1 text-xs text-slate-400">{displayCourses.length} mata kuliah ditampilkan {selectedDay === todayName ? `(Hari ini • ${todayName})` : ""}</div></div><div className="flex flex-wrap gap-1.5">{["Semua", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${selectedDay === d ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{d === todayName ? `${d} (Hari ini)` : d}</button>)}</div></div>
        <div className="space-y-3">{displayCourses.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Tidak ada jadwal perkuliahan pada hari {selectedDay}.</div> : displayCourses.map((course: any) => <ScheduleRow key={course.sectionId || course.code} course={course} active={(course.dayOfWeek || "Senin") === todayName} onScan={() => navigate("scan")} />)}</div>
      </section>
      <section className="overflow-hidden rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-100">
        <div className="flex items-start justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-white/15"><Icon name="qr" size={25} /></div><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Siap dipindai</span></div>
        <div className="mt-10 text-xl font-bold">Presensi semudah satu pindai</div>
        <p className="mt-2 text-sm leading-6 text-blue-100">Pastikan kamu berada di ruang kelas dan pindai QR yang ditampilkan dosen.</p>
        <Button onClick={() => navigate("scan")} className="mt-6 w-full !bg-white !text-blue-700 hover:!bg-blue-50">Buka Pemindai <Icon name="camera" size={18} /></Button>
      </section>
    </div>
    <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div><div className="text-lg font-bold">Ringkasan kehadiran</div><p className="mt-1 text-sm text-slate-500">Semester Genap</p></div>
        {(() => {
          const valid = (history || []).filter((h) => h.status !== "Menunggu Verifikasi");
          const hCount = valid.filter((h) => h.status === "Hadir").length;
          const tCount = valid.filter((h) => h.status === "Terlambat").length;
          const iCount = valid.filter((h) => h.status === "Izin").length;
          const sdCount = valid.filter((h) => h.status === "Sakit" || h.status === "Dispensasi").length;
          const aCount = valid.filter((h) => h.status === "Tidak hadir").length;
          const total = valid.length;
          const pts = hCount * 1.0 + sdCount * 1.0 + iCount * 0.75 + tCount * 0.5;
          const pct = total > 0 ? Math.min(100, Math.round((pts / total) * 100)) : 0;
          return (
            <div className="flex items-center gap-6">
              <div
                className="relative grid size-20 place-items-center rounded-full"
                style={{ background: `conic-gradient(#2563eb ${pct}%, #e2e8f0 0)` }}
              >
                <div className="grid size-14 place-items-center rounded-full bg-white text-sm font-bold text-slate-800">
                  {pct}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-7 gap-y-2 text-sm">
                <Legend color="bg-emerald-500" label="Hadir" value={String(hCount)} />
                <Legend color="bg-amber-500" label="Terlambat" value={String(tCount)} />
                <Legend color="bg-blue-500" label="Izin/Sakit" value={String(iCount + sdCount)} />
                <Legend color="bg-red-500" label="Tidak hadir" value={String(aCount)} />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  </div>;
}

function LeaveRequestForm({
  navigate,
  onSubmit,
  courses,
}: {
  navigate: (s: Screen) => void;
  onSubmit: (data: { courseCode: string; sectionId?: string; absenceDate: string; reason: LeaveReason; description: string; attachment?: string }) => Promise<void> | void;
  courses: CourseScheduleItem[];
}) {
  const [courseCode, setCourseCode] = useState("");
  const [meetingNumber, setMeetingNumber] = useState("");
  const [absenceDate, setAbsenceDate] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const courseOptions = courses.length > 0
    ? courses.map((c) => ({ code: c.code, name: c.name, sectionId: c.sectionId, sectionName: c.sectionName }))
    : studentCourses.map((c) => ({ code: c.code, name: c.name, sectionId: "", sectionName: "" }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseCode || !meetingNumber || !absenceDate || !reason) {
      setError("Lengkapi mata kuliah, pertemuan, tanggal ketidakhadiran, dan alasan sebelum mengirim pengajuan.");
      setSent(false);
      return;
    }
    const chosen = courseOptions.find((c) => c.code === courseCode);
    setSubmitting(true);
    try {
      const fullDescription = `[Pertemuan ${meetingNumber}] ${description.trim() || `Pengajuan ${reason}`}`;
      await onSubmit({
        courseCode,
        sectionId: chosen?.sectionId,
        absenceDate,
        reason: reason as LeaveReason,
        description: fullDescription,
        attachment: attachment || undefined,
      });
      setError("");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pengajuan izin.");
      setSent(false);
    } finally {
      setSubmitting(false);
    }
  };
  return <div>
    <Button variant="ghost" onClick={() => navigate("student-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Ajukan izin ketidakhadiran" description="Sampaikan alasan ketidakhadiran untuk diperiksa oleh dosen pengampu." />
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5"><div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon name="calendar" size={20} /></div><div><div className="font-bold">Detail pengajuan</div><div className="text-xs text-slate-400">Kolom bertanda wajib harus dilengkapi</div></div></div>
        <div className="space-y-5">
          {error && <Feedback tone="error">{error}</Feedback>}
          {sent && <Feedback tone="success">Pengajuan berhasil dikirim ke Supabase dengan status <strong>Menunggu Persetujuan</strong> dan langsung diteruskan ke dosen pengampu.</Feedback>}
          <SelectField label="Mata kuliah *" value={courseCode} onChange={(value) => { setCourseCode(value); setSent(false); }}>
            <option value="">Pilih mata kuliah</option>
            {courseOptions.map((course) => <option key={course.code} value={course.code}>{course.code} — {course.name}{course.sectionName ? ` (${course.sectionName})` : ""}</option>)}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Pertemuan ke- *" value={meetingNumber} onChange={(value) => { setMeetingNumber(value); setSent(false); }}>
              <option value="">Pilih pertemuan</option>
              {Array.from({ length: 16 }, (_, i) => String(i + 1)).map((num) => (
                <option key={num} value={num}>Pertemuan {num}</option>
              ))}
            </SelectField>
            <div>
              <Field label="Tanggal ketidakhadiran *" type="date" value={absenceDate} onChange={(value) => { setAbsenceDate(value); setSent(false); }} />
              {absenceDate && (
                <div className="mt-1.5 text-xs text-slate-500">
                  Terpilih: <span className="font-medium text-slate-700">{formatAbsenceDate(absenceDate)}</span>
                </div>
              )}
            </div>
          </div>
          <SelectField label="Alasan *" value={reason} onChange={(value) => { setReason(value); setSent(false); }}>
            <option value="">Pilih alasan</option>
            <option value="Sakit">Sakit</option>
            <option value="Izin">Izin (Keperluan Pribadi / Keluarga)</option>
            <option value="Dispensasi">Dispensasi Kampus / Lomba</option>
          </SelectField>
          <TextareaField label="Keterangan tambahan" value={description} onChange={setDescription} placeholder="Jelaskan kondisi atau keperluan secara ringkas." />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Dokumen pendukung <span className="font-normal text-slate-400">(opsional)</span></span>
            <span className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-600"><Icon name="book" size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-700">{attachment || "Pilih surat atau dokumen"}</span><span className="mt-0.5 block text-xs text-slate-400">PDF, JPG, atau PNG untuk simulasi</span></span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="max-w-28 text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" onChange={(e) => setAttachment(e.target.files?.[0]?.name || "")} />
            </span>
          </label>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate("student-dashboard")}>Batal</Button>
            {sent ? <Button onClick={() => navigate("leave-history")}><Icon name="history" size={18} />Lihat Riwayat Pengajuan</Button> : <Button type="submit"><Icon name="plus" size={18} />Ajukan Izin</Button>}
          </div>
        </div>
      </form>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-900"><div className="flex items-center gap-2 font-bold"><Icon name="info" size={18} />Alur persetujuan</div><div className="mt-4 space-y-4 text-sm"><div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span><span>Pengajuan dikirim ke dosen pengampu.</span></div><div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span><span>Status awal adalah Menunggu Persetujuan.</span></div><div className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span><span>Riwayat absensi diperbarui setelah keputusan.</span></div></div></div>
        <Feedback tone="info">Lampiran bersifat opsional dan tidak benar-benar diunggah ke server pada prototype ini.</Feedback>
      </aside>
    </div>
  </div>;
}

function LeaveHistory({ requests, navigate, onSelect, studentNumber }: { requests: LeaveRequest[]; navigate: (s: Screen) => void; onSelect: (id: string | number) => void; studentNumber?: string }) {
  const targetNim = studentNumber || "2510511009";
  const studentRequests = requests.filter((request) => request.studentId === targetNim);
  return <div>
    <Button variant="ghost" onClick={() => navigate("student-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Riwayat pengajuan izin" description="Pantau status dan keputusan dosen untuk setiap pengajuan ketidakhadiran." action={<Button onClick={() => navigate("leave-form")}><Icon name="plus" size={18} />Ajukan Izin Baru</Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon="clock" label="Menunggu Persetujuan" value={String(studentRequests.filter((item) => item.status === "Menunggu Persetujuan").length)} detail="Belum diputuskan dosen" tone="amber" />
      <StatCard icon="check" label="Disetujui" value={String(studentRequests.filter((item) => item.status === "Disetujui").length)} detail="Tercatat sebagai izin atau sakit" tone="emerald" />
      <StatCard icon="x" label="Ditolak" value={String(studentRequests.filter((item) => item.status === "Ditolak").length)} detail="Tidak mengubah status kehadiran" tone="red" />
    </div>
    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5"><div className="font-bold">Semua pengajuan</div><div className="mt-1 text-xs text-slate-400">{studentRequests.length} pengajuan dalam simulasi</div></div>
      <div className="divide-y divide-slate-100">{studentRequests.map((request) => <div key={request.id} className="grid gap-4 p-5 transition hover:bg-slate-50 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
        <div><div className="font-semibold text-slate-800">{request.course}</div><div className="mt-1 text-xs text-slate-400">{request.code} • {request.group}</div></div>
        <div><div className="text-xs text-slate-400">Tanggal ketidakhadiran</div><div className="mt-1 text-sm font-medium text-slate-700">{formatAbsenceDate(request.absenceDate)}</div></div>
        <div><div className="text-xs text-slate-400">{request.reason} • diajukan {request.submittedAt}</div><div className="mt-2"><LeaveStatusBadge status={request.status} /></div></div>
        <Button variant="secondary" onClick={() => { onSelect(request.id); navigate("leave-detail-student"); }}>Lihat Detail <Icon name="chevron" size={15} /></Button>
      </div>)}</div>
    </section>
  </div>;
}

function StudentLeaveDetail({ request, navigate }: { request?: LeaveRequest; navigate: (s: Screen) => void }) {
  if (!request) return <div><Feedback tone="error">Pengajuan tidak ditemukan.</Feedback><Button onClick={() => navigate("leave-history")} className="mt-4">Kembali ke Riwayat</Button></div>;
  return <div>
    <Button variant="ghost" onClick={() => navigate("leave-history")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke riwayat</Button>
    <PageHeading title="Detail pengajuan izin" description={`Pengajuan #${request.id} • dikirim ${request.submittedAt}`} action={<LeaveStatusBadge status={request.status} />} />
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <InfoItem label="Mata kuliah" value={`${request.course} (${request.code})`} />
          <InfoItem label="Kelas" value={request.group} />
          <InfoItem label="Tanggal ketidakhadiran" value={formatAbsenceDate(request.absenceDate)} />
          <InfoItem label="Alasan" value={request.reason} />
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6"><InfoItem label="Keterangan tambahan" value={request.description || "Tidak ada keterangan tambahan."} /></div>
        <div className="mt-6"><InfoItem label="Dokumen pendukung" value={request.attachment || "Tidak ada dokumen terlampir."} /></div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="font-bold">Keputusan dosen</div><div className="mt-3"><LeaveStatusBadge status={request.status} /></div><p className="mt-4 text-sm leading-6 text-slate-500">{request.lecturerNote || "Belum ada catatan. Dosen pengampu masih memeriksa pengajuan ini."}</p></div>
        {request.status === "Menunggu Persetujuan" && <Feedback tone="info">Status absensi sementara: Menunggu Verifikasi.</Feedback>}
        {request.status === "Disetujui" && <Feedback tone="success">Status absensi diperbarui menjadi {request.reason === "Sakit" ? "Sakit" : "Izin"}.</Feedback>}
        {request.status === "Ditolak" && <Feedback tone="error">Pengajuan ditolak dan tidak dicatat sebagai Izin atau Sakit.</Feedback>}
      </aside>
    </div>
  </div>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</div></div>;
}

function StatCard({ icon, label, value, detail, tone }: { icon: IconName; label: string; value: string; detail: string; tone: string }) {
  const tones: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon name={icon} size={21} /></div><div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-slate-400">{detail}</div></div></div></div>;
}

function ScheduleRow({ course, active, onScan }: { course: typeof studentCourses[number]; active: boolean; onScan: () => void }) {
  const colors: Record<string, string> = { blue: "bg-blue-500", violet: "bg-violet-500", amber: "bg-amber-500" };
  return <div className={`group flex flex-col gap-4 rounded-xl border p-4 transition sm:flex-row sm:items-center ${active ? "border-blue-200 bg-blue-50/60" : "border-slate-100 hover:border-slate-200"}`}>
    <div className="flex items-center gap-4 sm:w-28"><div className={`h-11 w-1 rounded-full ${colors[course.color]}`} /><div><div className="text-sm font-bold">{course.time}</div><div className="text-xs text-slate-400">{course.end}</div></div></div>
    <div className="min-w-0 flex-1"><div className="font-semibold text-slate-800">{course.name}</div><div className={`mt-1 flex flex-wrap text-xs text-slate-400 ${course.code === "IF2150" ? "gap-x-px gap-y-1" : "gap-x-4 gap-y-1"}`}>{course.code === "IF2150" && <span></span>}<span>{course.room}</span></div></div>
    {active ? <Button onClick={onScan} className="!py-2">Scan QR</Button> : <span className="text-xs font-semibold text-slate-400">Belum dimulai</span>}
  </div>;
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return <div><div className="flex items-center gap-2 text-xs text-slate-500"><span className={`size-2 rounded-full ${color}`} />{label}</div><div className="ml-4 mt-0.5 font-bold">{value}</div></div>;
}

function DynamicSessionQRBox({
  session,
  onTokenRotated,
}: {
  session: ActiveSessionInfo | null;
  onTokenRotated?: (newToken: string, expiresAt: string) => void;
}) {
  const ROTATION_SECONDS = 60;
  const [token, setToken] = useState(session?.qrTokenHash || "QR-DEMO");
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    setToken(session?.qrTokenHash || "QR-DEMO");
    setSecondsLeft(ROTATION_SECONDS);
  }, [session?.id, session?.qrTokenHash]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token || "SMARTATTEND-DEMO", {
      width: 512,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!session || session.status !== "open") return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          rotateSessionQrToken(session.id, 75).then((res) => {
            if (res) {
              setToken(res.token);
              onTokenRotated?.(res.token, res.expiresAt);
            }
          });
          return ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session?.id, session?.status]);

  const pct = Math.max(0, Math.min(100, (secondsLeft / ROTATION_SECONDS) * 100));

  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-Presensi-${token}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mx-auto w-fit">
        <SessionQR value={token} dataUrl={qrDataUrl} />
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm font-bold text-blue-700">
        <span>{token}</span>
        {session && (
          <span className="rounded bg-blue-600 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-white">
            {secondsLeft}d
          </span>
        )}
      </div>
      {session && (
        <div className="mt-2.5 w-full max-w-[12rem]">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            QR otomatis diperbarui tiap 60 detik
          </div>
          <button
            type="button"
            onClick={handleDownloadQrImage}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Icon name="qr" size={14} />
            Unduh Gambar QR (PNG)
          </button>
        </div>
      )}
    </div>
  );
}

function SessionQR({
  value,
  small = false,
  dataUrl,
}: {
  value: string;
  small?: boolean;
  dataUrl?: string;
}) {
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    if (dataUrl) return;
    let active = true;
    QRCode.toDataURL(value || "SMARTATTEND-DEMO", {
      width: 512,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setGeneratedUrl(url);
      })
      .catch(() => {
        if (active) setGeneratedUrl("");
      });
    return () => {
      active = false;
    };
  }, [value, dataUrl]);

  const src = dataUrl || generatedUrl;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${small ? "size-36" : "size-48"}`}
    >
      {src ? (
        <img
          src={src}
          alt={`QR Code ${value}`}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-xs text-slate-400">
          Memuat QR...
        </div>
      )}
    </div>
  );
}

function Scanner({
  navigate,
  scanned,
  onSuccess,
  activeSession,
  profile,
}: {
  navigate: (s: Screen) => void;
  scanned: boolean;
  onSuccess: (session?: ActiveSessionInfo | null, timeLabel?: string) => void;
  activeSession: ActiveSessionInfo | null;
  profile: UserProfile | null;
}) {
  const [state, setState] = useState<"ready" | "success" | "expired" | "invalid" | "duplicate">("ready");
  const [timeLabel, setTimeLabel] = useState("07.56");
  const [lastAttendanceLabel, setLastAttendanceLabel] = useState<"Hadir" | "Terlambat">("Hadir");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanLockRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stopCamera = async () => {
    const inst = qrScannerRef.current;
    qrScannerRef.current = null;
    setCameraActive(false);
    if (inst) {
      try {
        if (inst.isScanning) {
          await inst.stop();
        }
        inst.clear();
      } catch {
        // abaikan error saat menutup kamera
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const verifyScannedToken = async (rawToken: string) => {
    const clean = rawToken.trim().toUpperCase();
    if (!clean) {
      setState("invalid");
      return;
    }

    if (profile) {
      setSubmitting(true);
      try {
        const { data: matchedSession } = await supabase
          .from("attendance_sessions")
          .select(`
            id,
            section_id,
            title,
            starts_at,
            ends_at,
            qr_token_hash,
            qr_expires_at,
            status,
            class_sections (
              section_name,
              courses (
                course_code,
                course_name
              )
            )
          `)
          .eq("qr_token_hash", clean)
          .eq("status", "open")
          .maybeSingle();

        if (!matchedSession) {
          setState("invalid");
          return;
        }

        if (matchedSession.qr_expires_at) {
          const expMs = new Date(matchedSession.qr_expires_at).getTime();
          if (!Number.isNaN(expMs) && Date.now() > expMs) {
            setState("expired");
            return;
          }
        }

        const sec = Array.isArray(matchedSession.class_sections)
          ? matchedSession.class_sections[0]
          : matchedSession.class_sections;
        const crs = sec?.courses
          ? Array.isArray(sec.courses)
            ? sec.courses[0]
            : sec.courses
          : null;

        const targetSession: ActiveSessionInfo = {
          id: matchedSession.id,
          sectionId: matchedSession.section_id,
          courseCode: crs?.course_code || activeSession?.courseCode || "IF2140",
          courseName: crs?.course_name || activeSession?.courseName || "Mata Kuliah",
          sectionName: sec?.section_name || activeSession?.sectionName || "Kelas A",
          title: matchedSession.title,
          startsAt: matchedSession.starts_at,
          endsAt: matchedSession.ends_at,
          qrTokenHash: matchedSession.qr_token_hash,
          qrExpiresAt: matchedSession.qr_expires_at,
          status: matchedSession.status,
        };

        const res = await submitStudentCheckIn({
          sessionId: targetSession.id,
          studentId: profile.id,
          startsAt: matchedSession.starts_at,
        });
        setTimeLabel(`${res.timeLabel} (${res.attendanceLabel})`);
        if (res.status === "duplicate") {
          setState("duplicate");
        } else {
          setState("success");
          onSuccess(targetSession, res.timeLabel);
        }
      } catch {
        setState("invalid");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (clean.startsWith("SA-")) {
      if (scanned) setState("duplicate");
      else {
        setState("success");
        onSuccess(null, timeLabel);
      }
    } else {
      setState("invalid");
    }
  };

  const startCamera = async () => {
    setCameraError("");
    scanLockRef.current = false;
    try {
      await stopCamera();
      const html5Qr = new Html5Qrcode("smartattend-qr-reader", {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      qrScannerRef.current = html5Qr;
      setCameraActive(true);
      await html5Qr.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.max(180, Math.floor(minEdge * 0.72));
            return { width: boxSize, height: boxSize };
          },
        },
        async (decodedText) => {
          if (scanLockRef.current) return;
          scanLockRef.current = true;
          await stopCamera();
          await verifyScannedToken(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setCameraActive(false);
      setCameraError(
        err instanceof Error
          ? `Kamera tidak dapat diakses (${err.message}). Gunakan unggah gambar QR atau input token di samping.`
          : "Kamera tidak ditemukan atau izin ditolak."
      );
    }
  };

  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCameraError("");
    try {
      await stopCamera();
      const html5Qr = new Html5Qrcode("smartattend-qr-file-reader", {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      const decodedText = await html5Qr.scanFile(file, false);
      html5Qr.clear();
      await verifyScannedToken(decodedText);
    } catch {
      setCameraError(
        "Kode QR tidak terdeteksi pada gambar tersebut. Pastikan gambar QR jelas, tidak terpotong, atau gunakan tombol Unduh Gambar QR dari layar dosen."
      );
    }
  };

  const scan = async (result: "success" | "expired" | "invalid" | "duplicate") => {
    if (result !== "success") {
      setState(result);
      return;
    }

    if (activeSession && profile) {
      setSubmitting(true);
      try {
        const res = await submitStudentCheckIn({
          sessionId: activeSession.id,
          studentId: profile.id,
          startsAt: activeSession.startsAt,
        });
        setTimeLabel(res.timeLabel);
        setLastAttendanceLabel(res.attendanceLabel);
        if (res.status === "duplicate") {
          setState("duplicate");
        } else {
          setState("success");
          onSuccess(activeSession, res.timeLabel);
        }
      } catch {
        setState("invalid");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (scanned) setState("duplicate");
    else {
      setState("success");
      onSuccess(null, timeLabel);
    }
  };

  const sessionCourseName = activeSession?.courseName || "Pemrograman Berorientasi Objek";
  const graceMs = 15 * 60 * 1000;
  const startMs = activeSession?.startsAt ? new Date(activeSession.startsAt).getTime() : NaN;
  const elapsedMs = !Number.isNaN(startMs) ? Math.max(0, nowMs - startMs) : 0;
  const remainingMs = Math.max(0, graceMs - elapsedMs);
  const isPastGrace = !Number.isNaN(startMs) && elapsedMs > graceMs;
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);
  const lateMin = Math.floor((elapsedMs - graceMs) / 60000);
  const countdownText = `${String(remMin).padStart(2, "0")}:${String(remSec).padStart(2, "0")}`;

  const messages = {
    success:
      lastAttendanceLabel === "Terlambat"
        ? { icon: "clock" as IconName, title: "Presensi tercatat (Terlambat)", text: `Kehadiranmu untuk ${sessionCourseName} tercatat Terlambat pukul ${timeLabel} (melewati batas 15 menit).`, color: "amber" }
        : { icon: "check" as IconName, title: "Presensi berhasil!", text: `Kehadiranmu untuk ${sessionCourseName} telah tercatat Hadir pukul ${timeLabel}.`, color: "emerald" },
    expired: { icon: "clock" as IconName, title: "Kode QR kedaluwarsa", text: "Sesi ini telah berakhir. Minta dosen membuat sesi baru.", color: "amber" },
    invalid: { icon: "x" as IconName, title: "Sesi tidak valid", text: "Kode QR ini tidak dikenali atau bukan untuk jadwal kuliahmu.", color: "red" },
    duplicate: { icon: "info" as IconName, title: "Presensi sudah tercatat", text: `Kamu sudah melakukan presensi untuk sesi ini pukul ${timeLabel}.`, color: "blue" },
  };
  return <div>
    <Button variant="ghost" onClick={() => { stopCamera(); navigate("student-dashboard"); }} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Pindai kode QR" description="Arahkan kamera ke kode QR yang ditampilkan oleh dosen atau unggah gambar QR." />
    <div id="smartattend-qr-file-reader" className="hidden" />
    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleQrImageUpload} className="hidden" />
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-2xl bg-slate-900 p-4 shadow-xl md:p-8">
        <div className="relative mx-auto aspect-[4/3] max-h-[32rem] overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-950">
          <div id="smartattend-qr-reader" className={`h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover ${cameraActive ? "block" : "hidden"}`} />
          {!cameraActive && (
            <>
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,#94a3b8_1px,transparent_1px)] [background-size:18px_18px]" />
              <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 md:size-64">
                <span className="absolute left-0 top-0 size-12 rounded-tl-xl border-l-4 border-t-4 border-blue-400" /><span className="absolute right-0 top-0 size-12 rounded-tr-xl border-r-4 border-t-4 border-blue-400" /><span className="absolute bottom-0 left-0 size-12 rounded-bl-xl border-b-4 border-l-4 border-blue-400" /><span className="absolute bottom-0 right-0 size-12 rounded-br-xl border-b-4 border-r-4 border-blue-400" />
                <span className="scan-line absolute inset-x-4 top-1/2 h-0.5 bg-blue-400 shadow-[0_0_12px_#60a5fa]" />
              </div>
            </>
          )}
          <div className="absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-3 px-4 text-center">
            <div className="text-sm font-medium text-slate-200 drop-shadow">
              {cameraActive ? "Kamera aktif — arahkan ke QR Code dosen" : "Posisikan kode QR di dalam bingkai"}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-blue-500"
                >
                  <Icon name="camera" size={16} /> Aktifkan Kamera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500"
                >
                  <Icon name="x" size={16} /> Matikan Kamera
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-100 shadow transition hover:bg-slate-700"
              >
                <Icon name="qr" size={16} /> Unggah Gambar QR
              </button>
            </div>
          </div>
        </div>
        {cameraError && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
            {cameraError}
          </div>
        )}
      </section>
      <aside className="space-y-4">
        {activeSession && (
          <div className={`rounded-2xl border p-4 text-xs ${isPastGrace ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            <div className={`flex items-center gap-2 font-bold ${isPastGrace ? "text-amber-800" : "text-emerald-800"}`}>
              <span className={`size-2 animate-pulse rounded-full ${isPastGrace ? "bg-amber-500" : "bg-emerald-500"}`} />
              Sesi aktif terdeteksi: {activeSession.courseCode}
            </div>
            <div className="mt-1 font-semibold">{activeSession.courseName} ({activeSession.sectionName})</div>
            <div className={`mt-0.5 ${isPastGrace ? "text-amber-800" : "text-emerald-700"}`}>
              {activeSession.title} • Silakan pindai QR yang ditampilkan dosen
            </div>
            {!Number.isNaN(startMs) && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 font-semibold ${isPastGrace ? "border border-amber-300 bg-amber-100/80 text-amber-900" : "border border-emerald-200 bg-white/80 text-emerald-800"}`}>
                <Icon name="clock" size={15} />
                {isPastGrace ? (
                  <span>
                    Peringatan: Batas tepat waktu 15 menit telah lewat ({lateMin} menit). Scan sekarang akan tercatat <strong>Terlambat (T)</strong>.
                  </span>
                ) : (
                  <span>
                    Batas tepat waktu (Hadir): sisa <strong>{countdownText}</strong> sebelum status menjadi Terlambat.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {state !== "ready" && <ScanResult data={messages[state]} onAgain={() => { setState("ready"); scanLockRef.current = false; }} onHome={() => navigate("student-dashboard")} />}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-bold">Verifikasi token manual</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Masukkan kode token sesi (contoh: SA-UV99KU) jika kamera tidak digunakan.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyScannedToken(manualToken);
            }}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="SA-XXXXXX"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs uppercase outline-none focus:border-blue-500"
            />
            <Button type="submit" disabled={submitting} className="!px-3.5 !py-2 text-xs">
              Cek
            </Button>
          </form>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-bold">Simulasi hasil scan</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{activeSession ? "Klik Berhasil untuk mencatat kehadiranmu ke database Supabase." : "Pilih skenario untuk melihat respons validasi sistem."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={submitting} onClick={() => scan("success")} className="!justify-start !px-3 text-xs"><span className="size-2 rounded-full bg-emerald-500" />{submitting ? "Menyimpan..." : "Berhasil"}</Button>
            <Button variant="secondary" onClick={() => scan("expired")} className="!justify-start !px-3 text-xs"><span className="size-2 rounded-full bg-amber-500" />Kedaluwarsa</Button>
            <Button variant="secondary" onClick={() => scan("invalid")} className="!justify-start !px-3 text-xs"><span className="size-2 rounded-full bg-red-500" />Tidak valid</Button>
            <Button variant="secondary" onClick={() => scan("duplicate")} className="!justify-start !px-3 text-xs"><span className="size-2 rounded-full bg-blue-500" />Duplikat</Button>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800"><Icon name="shield" size={18} className="shrink-0" /><span>Kamera hanya disimulasikan. Tidak ada gambar atau data perangkat yang disimpan.</span></div>
      </aside>
    </div>
  </div>;
}

function ScanResult({ data, onAgain, onHome }: { data: { icon: IconName; title: string; text: string; color: string }; onAgain: () => void; onHome: () => void }) {
  const tones: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100", amber: "bg-amber-50 text-amber-600 ring-amber-100", red: "bg-red-50 text-red-600 ring-red-100", blue: "bg-blue-50 text-blue-600 ring-blue-100" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><div className={`mx-auto grid size-14 place-items-center rounded-full ring-8 ${tones[data.color]}`}><Icon name={data.icon} size={27} /></div><div className="mt-6 text-lg font-bold">{data.title}</div><p className="mt-2 text-sm leading-6 text-slate-500">{data.text}</p><div className="mt-5 grid gap-2"><Button onClick={onHome}>Kembali ke Beranda</Button><Button variant="ghost" onClick={onAgain}>Pindai lagi</Button></div></div>;
}

function AttendanceHistory({ history }: { history: typeof initialHistory }) {
  const [filter, setFilter] = useState("Semua");
  const visible = filter === "Semua" ? history : history.filter((row) => row.status === filter);
  return <div>
    <PageHeading title="Riwayat presensi" description="Informasi terkait seluruh catatan kehadiranmu selama semester berjalan." />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1">{["Semua", "Hadir", "Izin", "Sakit", "Menunggu Verifikasi", "Tidak hadir"].map((x) => <Button key={x} variant={filter === x ? "primary" : "secondary"} onClick={() => setFilter(x)} className="whitespace-nowrap !rounded-full !px-4 !py-2">{x}</Button>)}</div>
      <div className="relative"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 sm:w-64" placeholder="Cari mata kuliah..." /></div>
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1.2fr_1.5fr_0.6fr_0.7fr] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:grid"><span>Tanggal</span><span>Mata kuliah</span><span>Waktu</span><span>Status</span></div>
      <div className="divide-y divide-slate-100">{visible.map((row, i) => <div key={i} className="grid gap-3 px-5 py-4 hover:bg-slate-50 md:grid-cols-[1.2fr_1.5fr_0.6fr_0.7fr] md:items-center md:px-6"><div className="text-sm font-medium text-slate-700">{row.date}</div><div><div className="text-sm font-semibold text-slate-800">{row.course}</div><div className="mt-0.5 text-xs text-slate-400">{row.code}</div></div><div className="flex items-center gap-2 text-sm text-slate-600"><Icon name="clock" size={15} className="text-slate-400" />{row.time}</div><div><StatusPill status={row.status} /></div></div>)}</div>
    </section>
  </div>;
}

function LecturerDashboard({ navigate, leaveRequests, sections, profile, activeSession }: { navigate: (s: Screen) => void; leaveRequests: LeaveRequest[]; sections: CourseScheduleItem[]; profile: UserProfile | null; activeSession?: ActiveSessionInfo | null; onRefreshSections?: () => Promise<void> }) {
  const [selectedDay, setSelectedDay] = useState<string>("Semua");
  const rawClasses = sections.length > 0
    ? sections.map((item) => ({
        code: item.code,
        name: item.name,
        group: item.sectionName,
        dayOfWeek: item.dayOfWeek || "Senin",
        students: item.students,
        attended: item.attended,
        time: item.time,
        room: item.room,
        color: item.color,
      }))
    : lecturerClasses.map((c) => ({ ...c, dayOfWeek: "Senin" }));
  const displayClasses = selectedDay === "Semua"
    ? rawClasses
    : rawClasses.filter((item) => item.dayOfWeek === selectedDay);
  const totalStudents = rawClasses.reduce((sum, item) => sum + item.students, 0);
  const lecturerName = profile?.full_name || "Dr. Desta Sandya Prasvita, M.Kom";
  const deptLabel = profile?.department || "S1 Informatika - FIK UPNVJ";
  const pending = leaveRequests.filter((request) => request.status === "Menunggu Persetujuan").length;
  return <div>
    <PageHeading eyebrow={deptLabel} title={`Selamat datang, ${lecturerName}`} description="Daftar mata kuliah dan kelas yang ditetapkan kampus untuk Anda ampu." action={<Button onClick={() => navigate("create-session")}><Icon name="plus" size={18} />Buat Sesi Presensi</Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon="book" label="Mata kuliah diampu" value={`${rawClasses.length} Kelas`} detail={`${totalStudents} mahasiswa terdaftar`} tone="blue" />
      <StatCard icon="users" label="Jadwal mengajar" value={`${new Set(rawClasses.map((c) => c.dayOfWeek)).size} Hari`} detail={Array.from(new Set(rawClasses.map((c) => c.dayOfWeek))).join(", ") || "Senin"} tone="emerald" />
      <StatCard icon="live" label="Sesi aktif" value="Siap Dibuka" detail={`${rawClasses[0]?.code || "IF3101"} • ${rawClasses[0]?.name || "Metode Penelitian"}`} tone="amber" />
    </div>
    <section className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Icon name="calendar" size={21} /></div><div><div className="font-bold text-blue-950">Permohonan izin mahasiswa</div><p className="mt-1 text-sm leading-6 text-blue-800">{pending > 0 ? `${pending} pengajuan menunggu keputusan Anda.` : "Tidak ada pengajuan baru yang menunggu."}</p></div></div>
        <Button onClick={() => navigate("leave-requests")}>Buka Permohonan <Icon name="chevron" size={16} /></Button>
      </div>
    </section>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold">Jadwal mengampu Anda</div>
          <div className="mt-1 text-xs text-slate-400">Plotting resmi SIAKAD • Pilih kelas untuk membuka sesi presensi QR</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Semua", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => (
            <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${selectedDay === d ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{d}</button>
          ))}
        </div>
      </div>
      {displayClasses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Tidak ada jadwal mengampu pada hari {selectedDay}.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">{displayClasses.map((c, i) => <ClassCard key={`${c.code}-${i}`} course={c} active={Boolean(activeSession && ((c as any).sectionId ? activeSession.sectionId === (c as any).sectionId : activeSession.courseCode === c.code))} onLive={() => navigate("live")} onCreate={() => navigate("create-session")} />)}</div>
      )}
    </section>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="text-lg font-bold">Ringkasan kehadiran semester</div><p className="mt-1 text-sm text-slate-500">Rata-rata seluruh kelas yang Anda ampu</p></div>
        <div className="flex flex-1 flex-col gap-4 sm:flex-row lg:max-w-2xl">
          {rawClasses.slice(0, 3).map((cls) => <div key={cls.code} className="flex-1"><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">{cls.name}</span><span className="font-bold text-slate-800">94%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: "94%" }} /></div></div>)}
        </div>
      </div>
    </section>
  </div>;
}
function LecturerLeaveRequests({ requests, navigate, onSelect }: { requests: LeaveRequest[]; navigate: (s: Screen) => void; onSelect: (id: string | number) => void }) {
  return <div>
    <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Permohonan izin mahasiswa" description="Periksa pengajuan dari kelas yang Anda ampu dan simpan keputusan." />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon="clock" label="Pengajuan menunggu" value={String(requests.filter((item) => item.status === "Menunggu Persetujuan").length)} detail="Perlu segera diperiksa" tone="amber" />
      <StatCard icon="check" label="Pengajuan disetujui" value={String(requests.filter((item) => item.status === "Disetujui").length)} detail="Absensi telah diperbarui" tone="emerald" />
      <StatCard icon="x" label="Pengajuan ditolak" value={String(requests.filter((item) => item.status === "Ditolak").length)} detail="Disertai alasan keputusan" tone="red" />
    </div>
    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">Daftar permohonan</div><div className="mt-1 text-xs text-slate-400">Hanya menampilkan kelas yang Anda ampu dalam simulasi</div></div><span className="text-xs font-semibold text-slate-500">{requests.length} pengajuan</span></div>
      <div className="divide-y divide-slate-100">{requests.map((request) => <div key={request.id} className="grid gap-4 p-5 transition hover:bg-slate-50 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] lg:items-center">
        <div className="flex items-center gap-3"><Avatar initials={request.student.split(" ").map((part) => part[0]).slice(0, 2).join("")} small /><div><div className="text-sm font-semibold text-slate-800">{request.student}</div><div className="text-xs text-slate-400">{request.studentId}</div></div></div>
        <div><div className="text-sm font-semibold text-slate-700">{request.course}</div><div className="mt-1 text-xs text-slate-400">{request.code} • {request.group}</div></div>
        <div><div className="text-xs text-slate-400">Ketidakhadiran</div><div className="mt-1 text-sm text-slate-700">{formatAbsenceDate(request.absenceDate)}</div></div>
        <div><div className="text-xs text-slate-400">{request.reason} • {request.submittedAt}</div><div className="mt-2"><LeaveStatusBadge status={request.status} /></div></div>
        <Button variant="secondary" onClick={() => { onSelect(request.id); navigate("leave-detail-lecturer"); }}>Periksa <Icon name="chevron" size={15} /></Button>
      </div>)}</div>
    </section>
  </div>;
}

function LecturerLeaveDetail({ request, navigate, onDecision }: { request?: LeaveRequest; navigate: (s: Screen) => void; onDecision: (id: string | number, status: "Disetujui" | "Ditolak", note: string) => void }) {
  const [note, setNote] = useState(request?.lecturerNote || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  if (!request) return <div><Feedback tone="error">Permohonan tidak ditemukan.</Feedback><Button onClick={() => navigate("leave-requests")} className="mt-4">Kembali ke Permohonan</Button></div>;
  const decide = (status: "Disetujui" | "Ditolak") => {
    if (status === "Ditolak" && !note.trim()) {
      setError("Alasan penolakan wajib diisi pada kolom catatan dosen.");
      setSaved("");
      return;
    }
    onDecision(request.id, status, note.trim() || "Pengajuan telah diperiksa dan disetujui oleh dosen pengampu.");
    setError("");
    setSaved(status === "Disetujui" ? "Pengajuan disetujui. Keputusan berhasil disimpan dan status absensi mahasiswa telah diperbarui." : "Pengajuan ditolak. Keputusan dan alasan penolakan berhasil disimpan.");
  };
  return <div>
    <Button variant="ghost" onClick={() => navigate("leave-requests")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke permohonan</Button>
    <PageHeading title="Detail pengajuan izin" description={`Permohonan #${request.id} • diajukan ${request.submittedAt}`} action={<LeaveStatusBadge status={request.status} />} />
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-6"><Avatar initials={request.student.split(" ").map((part) => part[0]).slice(0, 2).join("")} /><div><div className="font-bold text-slate-900">{request.student}</div><div className="mt-1 text-xs text-slate-400">NIM {request.studentId}</div></div></div>
        <div className="grid gap-6 sm:grid-cols-2">
          <InfoItem label="Mata kuliah dan kelas" value={`${request.course} • ${request.code} • ${request.group}`} />
          <InfoItem label="Tanggal ketidakhadiran" value={formatAbsenceDate(request.absenceDate)} />
          <InfoItem label="Alasan pengajuan" value={request.reason} />
          <InfoItem label="Dokumen pendukung" value={request.attachment || "Tidak ada dokumen terlampir."} />
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6"><InfoItem label="Keterangan tambahan" value={request.description || "Tidak ada keterangan tambahan."} /></div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-bold">Keputusan dosen</div><p className="mt-1 text-xs leading-5 text-slate-400">Catatan wajib diisi jika permohonan ditolak.</p>
          <div className="mt-4"><TextareaField label="Catatan dosen" value={note} onChange={(value) => { setNote(value); setError(""); setSaved(""); }} placeholder="Tuliskan pertimbangan atau arahan untuk mahasiswa." /></div>
          {error && <div className="mt-4"><Feedback tone="error">{error}</Feedback></div>}
          {saved && <div className="mt-4"><Feedback tone="success">{saved}</Feedback></div>}
          {request.status === "Menunggu Persetujuan" ? <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="danger" onClick={() => decide("Ditolak")}><Icon name="x" size={17} />Tolak</Button><Button onClick={() => decide("Disetujui")}><Icon name="check" size={17} />Setujui</Button></div> : <div className="mt-5"><LeaveStatusBadge status={request.status} /></div>}
        </div>
        <Feedback tone="info">Keputusan pada prototype ini hanya disimpan di state lokal selama sesi berjalan.</Feedback>
      </aside>
    </div>
  </div>;
}

function ClassCard({ course, active, onLive, onCreate }: { course: typeof lecturerClasses[number]; active: boolean; onLive: () => void; onCreate: () => void }) {
  const tones: Record<string, string> = { blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="rounded-xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${tones[course.color]}`}>{course.code}</span>{active && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />Sedang berlangsung</span>}</div>
    <div className="mt-4 text-base font-bold">{course.name}</div><div className="mt-1 text-xs text-slate-400">{course.group} • {course.students} mahasiswa</div>
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><div className="flex gap-2"><Icon name="clock" size={15} />{course.time}</div><div className="flex gap-2"><Icon name="calendar" size={15} />{course.room}</div></div>
    <div className="mt-5 flex items-center justify-between"><div><span className="text-xl font-bold">{course.attended}</span><span className="text-xs text-slate-400">/{course.students} hadir</span></div><Button variant={active ? "primary" : "secondary"} onClick={active ? onLive : onCreate} className="!py-2">{active ? "Pantau Live" : "Buat Sesi"}</Button></div>
  </div>;
}

function CreateSession({
  navigate,
  onCreate,
  sections,
}: {
  navigate: (s: Screen) => void;
  onCreate: (session: ActiveSessionInfo) => void;
  sections: CourseScheduleItem[];
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.sectionId || "");
  const [meeting, setMeeting] = useState("1");
  const [sessionDate, setSessionDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [start, setStart] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [end, setEnd] = useState(() => {
    const later = new Date(Date.now() + 100 * 60 * 1000);
    return `${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`;
  });
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdSession, setCreatedSession] = useState<ActiveSessionInfo | null>(null);

  useEffect(() => {
    if (!selectedSectionId && sections.length > 0) {
      setSelectedSectionId(sections[0].sectionId);
    }
  }, [sections, selectedSectionId]);

  const currentSection = sections.find((s) => s.sectionId === selectedSectionId) || sections[0];

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!currentSection) {
      setError("Belum ada kelas yang tersedia untuk dosen ini.");
      return;
    }
    if (!sessionDate) {
      setError("Pilih tanggal pertemuan terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const session = await createAttendanceSession({
        sectionId: currentSection.sectionId,
        meetingNumber: meeting,
        startTime: start,
        endTime: end,
        sessionDate,
      });
      setCreatedSession(session);
      setGenerated(true);
      onCreate(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat sesi presensi.");
    } finally {
      setLoading(false);
    }
  };

  return <div>
    <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Buat sesi presensi" description="Atur detail pertemuan dan buat kode QR untuk mahasiswa." />
    <div className="grid gap-6 lg:grid-cols-[1fr_25rem]">
      <form onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5"><div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon name="calendar" size={20} /></div><div><div className="font-bold">Detail sesi</div><div className="text-xs text-slate-400">Kolom bertanda wajib harus dilengkapi</div></div></div>
        <div className="space-y-5">
          {error && <Feedback tone="error">{error}</Feedback>}
          <SelectField label="Mata kuliah & Kelas *" value={currentSection?.sectionId || ""} onChange={setSelectedSectionId}>
            {sections.length > 0 ? (
              sections.map((sec) => (
                <option key={sec.sectionId} value={sec.sectionId}>
                  {sec.code} — {sec.name} ({sec.sectionName})
                </option>
              ))
            ) : (
              <option value="">Memuat daftar kelas...</option>
            )}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Pertemuan ke- *" value={meeting} onChange={setMeeting}>
              {Array.from({ length: 16 }, (_, i) => String(i + 1)).map((num) => (
                <option key={num} value={num}>Pertemuan {num}</option>
              ))}
            </SelectField>
            <div>
              <Field label="Tanggal pertemuan *" type="date" value={sessionDate} onChange={setSessionDate} />
              {sessionDate && (
                <div className="mt-1.5 text-xs text-slate-500">
                  Terpilih: <span className="font-medium text-slate-700">{formatAbsenceDate(sessionDate)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Waktu mulai" type="time" value={start} onChange={setStart} /><Field label="Waktu selesai" type="time" value={end} onChange={setEnd} /></div>
          <div className="rounded-xl bg-slate-50 p-4"><label className="flex items-start gap-3"><input type="checkbox" defaultChecked className="mt-0.5 size-4 accent-blue-600" /><span><span className="block text-sm font-semibold text-slate-700">Validasi waktu otomatis</span><span className="mt-1 block text-xs leading-5 text-slate-500">QR akan kedaluwarsa setelah waktu selesai dan presensi ganda akan ditolak.</span></span></label></div>
          <Button type="submit" disabled={loading} className="w-full !py-3.5"><Icon name="qr" size={19} />{loading ? "Membuat sesi..." : "Buat & Tampilkan QR"}</Button>
        </div>
      </form>
      <aside className={`rounded-2xl p-6 text-center transition-all ${generated ? "border border-blue-200 bg-blue-50" : "border border-dashed border-slate-300 bg-white"}`}>
        {generated && createdSession ? <><div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />Sesi aktif</div><div className="mt-5"><DynamicSessionQRBox session={createdSession} onTokenRotated={(t, exp) => { const updated = { ...createdSession, qrTokenHash: t, qrExpiresAt: exp }; setCreatedSession(updated); onCreate(updated); }} /></div><div className="mt-4 font-bold">{createdSession.courseName}</div><div className="mt-1 text-xs text-slate-500">{createdSession.title} • {createdSession.sectionName}</div><div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700"><Icon name="clock" size={17} />{start} – {end} WIB</div><Button onClick={() => navigate("live")} className="mt-6 w-full">Pantau Presensi Live <Icon name="chevron" size={17} /></Button></> : <div className="flex min-h-80 flex-col items-center justify-center"><div className="grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="qr" size={30} /></div><div className="mt-5 font-bold text-slate-700">QR belum dibuat</div><p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">Lengkapi detail sesi, lalu tekan tombol buat untuk menghasilkan kode QR.</p></div>}
      </aside>
    </div>
  </div>;
}

function LiveAttendance({
  navigate,
  sessionCreated,
  leaveRequests,
  activeSession,
  onCloseSession,
}: {
  navigate: (s: Screen) => void;
  sessionCreated: boolean;
  leaveRequests: LeaveRequest[];
  activeSession: ActiveSessionInfo | null;
  onCloseSession: () => void;
}) {
  const [tab, setTab] = useState<"live" | "recap">("live");
  const [query, setQuery] = useState("");
  const [dbAttendees, setDbAttendees] = useState<LiveAttendeeItem[]>([]);

  useEffect(() => {
    if (!activeSession) {
      setDbAttendees([]);
      return;
    }
    let active = true;
    const loadAttendees = () => {
      fetchSessionAttendees(activeSession.id).then((rows) => {
        if (active) setDbAttendees(rows);
      });
    };
    loadAttendees();
    const interval = window.setInterval(loadAttendees, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeSession?.id]);

  const sourceList = activeSession
    ? dbAttendees.map((a) => ({
        id: a.studentNumber,
        name: a.name,
        initials: a.initials,
        time: a.time,
        status: a.status,
        tone: a.tone,
      }))
    : attendeeSeed;

  const attendees = useMemo(
    () => sourceList.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) || x.id.includes(query)),
    [query, sourceList]
  );

  if (!activeSession) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0">
          <Icon name="arrow" size={18} />
          Kembali ke beranda
        </Button>
        <PageHeading
          title="Presensi Live"
          description="Pantau kehadiran mahasiswa secara real-time saat sesi perkuliahan berlangsung."
        />
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon name="live" size={26} />
          </div>
          <div className="mt-4 text-base font-bold text-slate-900">Belum ada sesi presensi aktif</div>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            Buat sesi presensi terlebih dahulu untuk menampilkan kode QR dinamis dan daftar kehadiran mahasiswa secara langsung.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Button onClick={() => navigate("create-session")}>
              <Icon name="plus" size={17} />
              Buat Sesi Presensi
            </Button>
            <Button variant="secondary" onClick={() => navigate("lecturer-dashboard")}>
              Ke Beranda Dosen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sessionTitle = `Presensi ${activeSession.courseName}`;
  const sessionDesc = `${activeSession.courseCode} • ${activeSession.title} • ${activeSession.sectionName}`;

  return <div>
    <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title={sessionTitle} description={sessionDesc} action={<div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />Sesi aktif</div>} />
    <div className="mb-6 flex w-fit rounded-xl bg-slate-100 p-1"><Button variant="ghost" onClick={() => setTab("live")} className={tab === "live" ? "!bg-white !text-blue-700 shadow-sm" : ""}><Icon name="live" size={17} />Daftar Live</Button><Button variant="ghost" onClick={() => setTab("recap")} className={tab === "recap" ? "!bg-white !text-blue-700 shadow-sm" : ""}><Icon name="history" size={17} />Rekap Presensi</Button></div>
    {tab === "live" ? <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">Mahasiswa hadir</div><div className="mt-1 text-xs text-slate-400">{activeSession ? "Data langsung dari Supabase attendance_records" : "Diperbarui secara otomatis dalam simulasi"}</div></div><div className="relative"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 sm:w-64" placeholder="Cari nama atau NIM" /></div></div>
        {attendees.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Belum ada mahasiswa yang melakukan presensi pada sesi ini.</div>
        ) : (
          <div className="divide-y divide-slate-100">{attendees.map((person, i) => <div key={person.id + i} className="flex items-center gap-3 px-5 py-4"><span className="hidden w-6 text-xs text-slate-400 sm:block">{String(i + 1).padStart(2, "0")}</span><Avatar initials={person.initials} tone={person.tone} small /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{person.name}</div><div className="text-xs text-slate-400">{person.id}</div></div><div className="hidden text-right sm:block"><div className="text-sm font-semibold">{person.time}</div><div className="text-xs text-slate-400">WIB</div></div><StatusPill status={person.status} /></div>)}</div>
        )}
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl bg-blue-600 p-5 text-white"><div className="text-sm text-blue-100">Kehadiran saat ini</div><div className="mt-2 text-4xl font-bold">{activeSession ? dbAttendees.length : 34}<span className="text-xl text-blue-200">/{activeSession ? 1 : 38}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-500"><div className="h-full w-full rounded-full bg-white" /></div><div className="mt-2 text-xs text-blue-100">{activeSession ? "Tersinkronisasi dengan database" : "89% mahasiswa telah hadir"}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-3 font-bold">Kode QR dinamis</div><DynamicSessionQRBox session={activeSession} /></div>
        <Button variant="danger" onClick={onCloseSession} className="w-full"><Icon name="x" size={17} />Akhiri sesi</Button>
      </aside>
    </div> : <Recap leaveRequests={leaveRequests} activeSession={activeSession} dbAttendees={dbAttendees} />}
  </div>;
}

function Recap({
  leaveRequests,
  activeSession,
  dbAttendees,
}: {
  leaveRequests: LeaveRequest[];
  activeSession: ActiveSessionInfo | null;
  dbAttendees: LiveAttendeeItem[];
}) {
  const sessionDateStr =
    activeSession?.sessionDate ||
    (activeSession?.startTime ? new Date(activeSession.startTime).toLocaleDateString("en-CA") : "");

  const seenStudentLeaves = new Set<string>();
  const verifiedLeaves = leaveRequests.filter((request) => {
    if (request.status !== "Disetujui") return false;
    if (!activeSession) return true;
    const sameCourse = request.code.trim().toUpperCase() === activeSession.courseCode.trim().toUpperCase();
    const sameDate = !sessionDateStr || String(request.absenceDate).slice(0, 10) === sessionDateStr;
    if (!sameCourse || !sameDate) return false;
    // Jangan hitung izin jika mahasiswa sudah tercatat Hadir/Terlambat/Izin/Sakit di attendance_records sesi ini
    if (dbAttendees.some((a) => a.studentNumber === request.studentId)) return false;
    // Deduplikasi per mahasiswa agar 1 mahasiswa maksimal terhitung 1 kali pada sesi ini
    if (seenStudentLeaves.has(request.studentId)) return false;
    seenStudentLeaves.add(request.studentId);
    return true;
  });

  const dbSickCount = activeSession ? dbAttendees.filter((a) => a.status === "Sakit").length : 0;
  const dbLeaveCount = activeSession ? dbAttendees.filter((a) => a.status === "Izin" || a.status === "Dispensasi").length : 0;
  const extraLeaves = verifiedLeaves;

  const approvedSick = dbSickCount + extraLeaves.filter((request) => request.reason === "Sakit").length;
  const approvedLeave = dbLeaveCount + extraLeaves.filter((request) => request.reason !== "Sakit").length;

  const presentCount = activeSession
    ? dbAttendees.filter((a) => a.status === "Hadir").length
    : 34;
  const lateCount = activeSession
    ? dbAttendees.filter((a) => a.status === "Terlambat").length
    : 3;
  const absentCount = activeSession ? 0 : 1;
  const totalCount = Math.max(1, presentCount + lateCount + approvedLeave + approvedSick + absentCount);

  const toPct = (val: number) => `${Math.round((val / totalCount) * 100)}%`;

  const topCards = [
    { label: "Hadir", value: presentCount, pct: toPct(presentCount), color: "bg-emerald-500", box: "bg-emerald-50 text-emerald-700", icon: "check" as IconName },
    { label: "Terlambat", value: lateCount, pct: toPct(lateCount), color: "bg-amber-500", box: "bg-amber-50 text-amber-700", icon: "clock" as IconName },
    { label: "Tidak hadir", value: absentCount, pct: toPct(absentCount), color: "bg-red-500", box: "bg-red-50 text-red-700", icon: "x" as IconName },
  ];

  const recap = [
    { label: "Hadir", value: presentCount, pct: toPct(presentCount), color: "bg-emerald-500" },
    { label: "Terlambat", value: lateCount, pct: toPct(lateCount), color: "bg-amber-500" },
    { label: "Izin", value: approvedLeave, pct: toPct(approvedLeave), color: "bg-blue-500" },
    { label: "Sakit", value: approvedSick, pct: toPct(approvedSick), color: "bg-violet-500" },
    { label: "Tidak hadir", value: absentCount, pct: toPct(absentCount), color: "bg-red-500" },
  ];

  const handleDownloadCsv = () => {
    const combinedRows = activeSession
      ? [
          ...dbAttendees.map((a) => [
            a.studentNumber,
            a.name,
            activeSession.courseCode,
            activeSession.courseName,
            activeSession.title,
            a.time,
            a.status,
          ]),
          ...verifiedLeaves
            .filter((lv) => !dbAttendees.some((a) => a.studentNumber === lv.studentId))
            .map((lv) => [
              lv.studentId,
              lv.student,
              activeSession.courseCode,
              activeSession.courseName,
              activeSession.title,
              "-",
              lv.reason === "Sakit" ? "Sakit" : "Izin",
            ]),
        ]
      : attendeeSeed.map((a) => [
          a.id,
          a.name,
          "IF2140",
          "Pemrograman Berorientasi Objek",
          "Pertemuan 12",
          a.time,
          a.status,
        ]);

    const rows = combinedRows.map((cols, idx) => [String(idx + 1), ...cols]);
    const header = ["No", "NIM", "Nama Mahasiswa", "Kode MK", "Mata Kuliah", "Sesi", "Waktu Check-In (WIB)", "Status"];
    const csvLines = [
      "sep=,",
      ...[header, ...rows].map((cols) =>
        cols.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = (activeSession?.courseCode || "IF2140").toLowerCase();
    link.href = url;
    link.download = `rekap-presensi-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sessionWindowLabel = activeSession
    ? `${new Date(activeSession.startsAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} – ${new Date(activeSession.endsAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`
    : "08.00 – 09.40 WIB";
  const firstCheckInLabel = activeSession
    ? dbAttendees.length > 0
      ? `${dbAttendees[0].time} • ${dbAttendees[0].name}`
      : "Belum ada scan"
    : "07.54 • Nadia Putri";

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">{topCards.map((x) => <div key={x.label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div className={`grid size-10 place-items-center rounded-xl ${x.box}`}><Icon name={x.icon} size={19} /></div><span className="text-sm font-bold text-slate-400">{x.pct}</span></div><div className="mt-4 text-3xl font-bold">{x.value}</div><div className="mt-1 text-sm text-slate-500">{x.label}</div></div>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-lg font-bold">Izin dan sakit terverifikasi</div><p className="mt-1 text-sm text-slate-500">Berasal dari pengajuan yang telah disetujui dosen.</p></div><div className="flex gap-3"><div className="rounded-xl bg-blue-50 px-4 py-3 text-center"><div className="text-xl font-bold text-blue-700">{approvedLeave}</div><div className="text-xs text-blue-600">Izin</div></div><div className="rounded-xl bg-violet-50 px-4 py-3 text-center"><div className="text-xl font-bold text-violet-700">{approvedSick}</div><div className="text-xs text-violet-600">Sakit</div></div></div></div>
      <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">{verifiedLeaves.length === 0 ? <div className="py-4 text-sm text-slate-400">Belum ada izin atau sakit terverifikasi untuk mata kuliah ini.</div> : verifiedLeaves.map((request) => <div key={request.id} className="grid gap-3 py-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"><div><div className="text-sm font-semibold">{request.student}</div><div className="text-xs text-slate-400">{request.studentId} • {request.course}</div></div><div className="text-sm text-slate-600">{formatAbsenceDate(request.absenceDate)}</div><StatusPill status={request.reason === "Sakit" ? "Sakit" : "Izin"} /></div>)}</div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="text-lg font-bold">Ringkasan sesi</div><p className="mt-1 text-sm text-slate-500">Distribusi status kehadiran {activeSession ? activeSession.title : "pertemuan 12"}</p></div><Button variant="secondary" onClick={handleDownloadCsv}>Unduh rekap CSV</Button></div>
      <div className="mt-8 space-y-5">{recap.map((x) => <div key={x.label}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-600">{x.label}</span><span className="font-bold">{x.value} mahasiswa</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${x.color}`} style={{ width: x.pct }} /></div></div>)}</div>
      <div className="mt-8 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3"><div><div className="text-xs text-slate-400">Waktu sesi</div><div className="mt-1 text-sm font-semibold">{sessionWindowLabel}</div></div><div><div className="text-xs text-slate-400">Kehadiran pertama</div><div className="mt-1 text-sm font-semibold">{firstCheckInLabel}</div></div><div><div className="text-xs text-slate-400">Sumber data</div><div className="mt-1 text-sm font-semibold">{activeSession ? "Supabase Real-Time" : "Mode Simulasi"}</div></div></div>
    </section>
  </div>;
}


function SemesterRecap({
  navigate,
  sections,
}: {
  navigate: (s: Screen) => void;
  sections: CourseScheduleItem[];
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.sectionId || "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedMeetings, setCompletedMeetings] = useState<number[]>([]);
  const [rows, setRows] = useState<SemesterStudentRow[]>([]);

  useEffect(() => {
    if (!selectedSectionId && sections.length > 0) {
      setSelectedSectionId(sections[0].sectionId);
    }
  }, [sections, selectedSectionId]);

  useEffect(() => {
    let active = true;
    if (!selectedSectionId) return;
    setLoading(true);
    fetchSemesterRecapMatrix(selectedSectionId)
      .then((res) => {
        if (!active) return;
        setCompletedMeetings(res.completedMeetings);
        setRows(res.rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSectionId]);

  const currentSection = sections.find((s) => s.sectionId === selectedSectionId) || sections[0];
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.studentNumber.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.hadir += r.hadir;
        acc.terlambat += r.terlambat;
        acc.izin += r.izin;
        acc.sakit += r.sakit;
        acc.dispensasi += r.dispensasi;
        acc.alpha += r.alpha;
        return acc;
      },
      { hadir: 0, terlambat: 0, izin: 0, sakit: 0, dispensasi: 0, alpha: 0 }
    );
  }, [rows]);

  const avgAttendance = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length);
  }, [rows]);

  const badgeStyle: Record<string, string> = {
    H: "bg-emerald-50 text-emerald-700 border-emerald-200",
    T: "bg-amber-50 text-amber-700 border-amber-200",
    I: "bg-blue-50 text-blue-700 border-blue-200",
    S: "bg-violet-50 text-violet-700 border-violet-200",
    D: "bg-cyan-50 text-cyan-700 border-cyan-200",
    A: "bg-red-50 text-red-700 border-red-200",
    "-": "bg-slate-50 text-slate-300 border-slate-100",
  };

  const handleExportAllMeetingsCsv = () => {
    const meetingHeaders = Array.from({ length: 16 }, (_, i) => `P${i + 1}`);
    const header = [
      "No",
      "NIM",
      "Nama Mahasiswa",
      "Kode MK",
      "Mata Kuliah",
      "Kelas",
      ...meetingHeaders,
      "Hadir",
      "Terlambat",
      "Izin",
      "Sakit",
      "Dispensasi",
      "Alpha",
      "Total Poin",
      "Kehadiran (%)",
    ];

    const csvRows = filteredRows.map((r, idx) => [
      String(idx + 1),
      r.studentNumber,
      r.name,
      currentSection?.code || "-",
      currentSection?.name || "-",
      currentSection?.sectionName || "-",
      ...Array.from({ length: 16 }, (_, i) => r.meetings[i + 1] || "-"),
      String(r.hadir),
      String(r.terlambat),
      String(r.izin),
      String(r.sakit),
      String(r.dispensasi),
      String(r.alpha),
      String(r.points),
      `${r.percentage}%`,
    ]);

    const csvLines = [
      "sep=,",
      ...[header, ...csvRows].map((cols) =>
        cols.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = (currentSection?.code || "rekap").toLowerCase();
    link.href = url;
    link.download = `rekap-semester-p1-p16-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0">
        <Icon name="arrow" size={18} />
        Kembali ke beranda
      </Button>
      <PageHeading
        title="Rekap Presensi Semester (Pertemuan 1–16)"
        description="Akumulasi kehadiran, keterlambatan, izin, sakit, dispensasi, dan alpha seluruh pertemuan."
        action={
          <Button onClick={handleExportAllMeetingsCsv} disabled={filteredRows.length === 0}>
            Unduh Rekap P1–P16 (CSV)
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="calendar"
          label="Pertemuan terlaksana"
          value={`${completedMeetings.length} / 16`}
          detail={completedMeetings.length > 0 ? `Terakhir: Pertemuan ${completedMeetings[completedMeetings.length - 1]}` : "Belum ada sesi"}
          tone="blue"
        />
        <StatCard
          icon="check"
          label="Total Hadir & Terlambat"
          value={String(totals.hadir + totals.terlambat)}
          detail={`${totals.hadir} Hadir • ${totals.terlambat} Terlambat`}
          tone="emerald"
        />
        <StatCard
          icon="shield"
          label="Izin / Sakit / Dispen"
          value={String(totals.izin + totals.sakit + totals.dispensasi)}
          detail={`${totals.izin} Izin • ${totals.sakit} Sakit • ${totals.dispensasi} Dispen`}
          tone="amber"
        />
        <StatCard
          icon="users"
          label="Rata-rata Kehadiran"
          value={`${avgAttendance}%`}
          detail={`${rows.length} mahasiswa terdaftar`}
          tone="blue"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-md">
            <SelectField label="Pilih Mata Kuliah & Kelas" value={selectedSectionId} onChange={setSelectedSectionId}>
              {sections.length > 0 ? (
                sections.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    {sec.code} — {sec.name} ({sec.sectionName})
                  </option>
                ))
              ) : (
                <option value="">Belum ada kelas</option>
              )}
            </SelectField>
          </div>
          <div className="relative w-full lg:w-72">
            <Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
              placeholder="Cari nama atau NIM..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Keterangan & Bobot Poin:</span>
          <span><b className="text-emerald-700">H</b> = Hadir (1.0)</span>
          <span><b className="text-violet-700">S</b> = Sakit (1.0)</span>
          <span><b className="text-cyan-700">D</b> = Dispensasi (1.0)</span>
          <span><b className="text-blue-700">I</b> = Izin (0.75)</span>
          <span><b className="text-amber-700">T</b> = Terlambat (0.5)</span>
          <span><b className="text-red-700">A</b> = Alpha (0)</span>
          <span><b className="text-slate-400">-</b> = Belum ada sesi</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat matriks presensi Pertemuan 1–16...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">Belum ada mahasiswa terdaftar pada kelas ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold">Mahasiswa</th>
                  {Array.from({ length: 16 }, (_, i) => (
                    <th key={i + 1} className="px-2 py-3 text-center font-semibold">
                      P{i + 1}
                    </th>
                  ))}
                  <th className="px-2.5 py-3 text-center font-bold text-emerald-700">H</th>
                  <th className="px-2.5 py-3 text-center font-bold text-amber-700">T</th>
                  <th className="px-2.5 py-3 text-center font-bold text-blue-700">I</th>
                  <th className="px-2.5 py-3 text-center font-bold text-violet-700">S</th>
                  <th className="px-2.5 py-3 text-center font-bold text-cyan-700">D</th>
                  <th className="px-2.5 py-3 text-center font-bold text-red-700">A</th>
                  <th className="px-2.5 py-3 text-center font-bold text-slate-600">Poin</th>
                  <th className="px-3 py-3 text-right font-bold text-slate-700">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      <div className="font-semibold text-slate-800">{row.name}</div>
                      <div className="text-[11px] text-slate-400">{row.studentNumber}</div>
                    </td>
                    {Array.from({ length: 16 }, (_, i) => {
                      const code = row.meetings[i + 1] || "-";
                      return (
                        <td key={i + 1} className="px-1.5 py-3 text-center">
                          <span className={`inline-flex size-6 items-center justify-center rounded-md border font-bold ${badgeStyle[code]}`}>
                            {code}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2.5 py-3 text-center font-bold text-emerald-700">{row.hadir}</td>
                    <td className="px-2.5 py-3 text-center font-bold text-amber-700">{row.terlambat}</td>
                    <td className="px-2.5 py-3 text-center font-bold text-blue-700">{row.izin}</td>
                    <td className="px-2.5 py-3 text-center font-bold text-violet-700">{row.sakit}</td>
                    <td className="px-2.5 py-3 text-center font-bold text-cyan-700">{row.dispensasi}</td>
                    <td className="px-2.5 py-3 text-center font-bold text-red-700">{row.alpha}</td>
                    <td className="px-2.5 py-3 text-center font-semibold text-slate-600">{row.points}/{completedMeetings.length}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-800">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() { 
useEffect(() => {
  async function testSupabase() {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error("Supabase gagal:", sessionError.message);
      return;
    }

    console.log("Supabase berhasil terhubung!");

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .limit(5);

    if (error) {
      console.error("Gagal membaca tabel courses:", error.message);
    } else {
      console.log("Berhasil membaca tabel courses:", data);
    }
  }

  testSupabase();
}, []);


  const [screen, setScreen] = useState<Screen>("login");
  const [role, setRole] = useState<Role>("student");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dbStudentCourses, setDbStudentCourses] = useState<CourseScheduleItem[]>([]);
  const [dbLecturerSections, setDbLecturerSections] = useState<CourseScheduleItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [scanned, setScanned] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | number>("");
  const navigate = (next: Screen) => setScreen(next);
  const login = (userProfile: UserProfile) => {
    setProfile(userProfile);
    setRole(userProfile.role);
    setScreen(userProfile.role === "student" ? "student-dashboard" : "lecturer-dashboard");
  };
  const logout = () => {
    setProfile(null);
    setScreen("login");
    void signOutFromSupabase();
  };


  useEffect(() => {
    getCurrentProfile().then((existing) => {
      if (existing) {
        setProfile(existing);
        setRole(existing.role);
        setScreen(existing.role === "student" ? "student-dashboard" : "lecturer-dashboard");
      }
    });
  }, []);

  useEffect(() => {
    if (!profile) {
      setDbStudentCourses([]);
      setDbLecturerSections([]);
      setActiveSession(null);
      return;
    }
    if (profile.role === "student") {
      fetchStudentCourses(profile.id).then((courses) => {
        setDbStudentCourses(courses);
        const ids = courses.map((c) => c.sectionId);
        fetchLatestActiveSession(ids).then(setActiveSession);
      });
      fetchStudentAttendanceHistory(profile.id).then((dbHist) => {
        if (dbHist.length > 0) {
          setHistory(dbHist);
        }
      });
      const loadStudentLeaves = () => {
        fetchStudentLeaveRequests(profile.id).then((dbLeaves) => {
          setLeaveRequests(dbLeaves);
        });
      };
      loadStudentLeaves();
      const timer = window.setInterval(loadStudentLeaves, 3000);
      return () => window.clearInterval(timer);
    } else {
      let timer: number | undefined;
      fetchLecturerSections(profile.id).then((sections) => {
        setDbLecturerSections(sections);
        const ids = sections.map((s) => s.sectionId);
        fetchLatestActiveSession(ids).then(setActiveSession);
        const loadLecturerLeaves = () => {
          fetchLecturerLeaveRequests(ids).then((dbLeaves) => {
            setLeaveRequests(dbLeaves);
          });
        };
        loadLecturerLeaves();
        timer = window.setInterval(loadLecturerLeaves, 3000);
      });
      return () => { if (timer) window.clearInterval(timer); };
    }
  }, [profile]);

  const scanSuccess = (session?: ActiveSessionInfo | null, timeLabel = "07.56") => {
    setScanned(true);
    const todayLabel = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const attendance = {
      date: session ? todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1) : "Senin, 20 Mei 2024",
      course: session?.courseName || "Pemrograman Berorientasi Objek",
      code: session?.courseCode || "IF2140",
      time: timeLabel,
      status: "Hadir",
    };
    setHistory((rows) => [attendance, ...rows]);
    if (profile) {
      fetchStudentAttendanceHistory(profile.id).then((dbHist) => {
        if (dbHist.length > 0) setHistory(dbHist);
      });
    }
  };

  const handleCloseSession = async () => {
    if (activeSession) {
      await closeAttendanceSession(activeSession.id);
      setActiveSession(null);
      setSessionCreated(false);
    }
    navigate("lecturer-dashboard");
  };
  const submitLeaveRequest = async (data: { courseCode: string; sectionId?: string; absenceDate: string; reason: LeaveReason; description: string; attachment?: string }) => {
    if (profile && data.sectionId) {
      const created = await createLeaveRequestInDb({
        studentId: profile.id,
        sectionId: data.sectionId,
        absenceDate: data.absenceDate,
        reason: data.reason,
        description: data.description,
        attachment: data.attachment,
      });
      setLeaveRequests((requests) => [created, ...requests]);
      setSelectedLeaveId(created.id);
      const pendingRecord = { date: formatAbsenceDate(data.absenceDate), course: created.course, code: created.code, time: "—", status: "Menunggu Verifikasi" };
      setHistory((rows) => [pendingRecord, ...rows]);
      return;
    }

    const course = studentCourses.find((item) => item.code === data.courseCode)!;
    const id = Date.now();
    const request: LeaveRequest = {
      id,
      student: profile?.full_name || "Agoy Salloh",
      studentId: profile?.student_number || "2510511009",
      course: course.name,
      code: course.code,
      group: course.code === "IF2150" ? "Kelas B" : "Kelas A",
      absenceDate: data.absenceDate,
      reason: data.reason,
      description: data.description,
      attachment: data.attachment,
      submittedAt: "Hari ini",
      status: "Menunggu Persetujuan",
    };
    setLeaveRequests((requests) => [request, ...requests]);
    setSelectedLeaveId(id);
    const pendingRecord = { date: formatAbsenceDate(data.absenceDate), course: course.name, code: course.code, time: "—", status: "Menunggu Verifikasi" };
    setHistory((rows) => {
      const existing = rows.findIndex((row) => row.date === pendingRecord.date && row.code === pendingRecord.code);
      return existing >= 0 ? rows.map((row, index) => index === existing ? pendingRecord : row) : [pendingRecord, ...rows];
    });
  };
  const decideLeaveRequest = async (id: string | number, status: "Disetujui" | "Ditolak", lecturerNote: string) => {
    const request = leaveRequests.find((item) => item.id === id);
    if (!request) return;
    if (typeof id === "string" && profile) {
      await decideLeaveRequestInDb({
        id,
        lecturerId: profile.id,
        status,
        lecturerNote,
      });
    }
    setLeaveRequests((requests) => requests.map((item) => item.id === id ? { ...item, status, lecturerNote } : item));
    const attendanceStatus = status === "Disetujui" ? (request.reason === "Sakit" ? "Sakit" : "Izin") : "Tidak hadir";
    const attendanceRecord = { date: formatAbsenceDate(request.absenceDate), course: request.course, code: request.code, time: "—", status: attendanceStatus };
    setHistory((rows) => {
      const existing = rows.findIndex((row) => row.date === attendanceRecord.date && row.code === attendanceRecord.code);
      return existing >= 0 ? rows.map((row, index) => index === existing ? attendanceRecord : row) : [attendanceRecord, ...rows];
    });
  };
  if (screen === "login") return <Login onLogin={login} />;
  const title = role === "student" ? "Portal Mahasiswa" : "Portal Dosen";
  const selectedLeave = leaveRequests.find((request) => request.id === selectedLeaveId);

  const notifications: AppNotification[] =
    role === "student"
      ? [
          ...(activeSession
            ? [
                {
                  id: `session-${activeSession.id}`,
                  title: `Sesi Presensi Dibuka: ${activeSession.courseCode}`,
                  body: `${activeSession.courseName} (${activeSession.title}) sedang berlangsung. Klik untuk scan QR.`,
                  time: "Sedang aktif",
                  tone: "blue" as const,
                  targetScreen: "scan" as Screen,
                },
              ]
            : []),
          ...leaveRequests
            .filter(
              (req) =>
                req.studentId === (profile?.student_number || "2510511009") &&
                req.status !== "Menunggu Persetujuan"
            )
            .slice(0, 5)
            .map((req) => ({
              id: `leave-decision-${req.id}-${req.status}`,
              title: `Pengajuan ${req.reason} ${req.status}`,
              body: `${req.course} (${formatAbsenceDate(req.absenceDate)})${req.lecturerNote ? ` • Catatan: ${req.lecturerNote}` : ""}`,
              time: req.submittedAt,
              tone: req.status === "Disetujui" ? ("emerald" as const) : ("red" as const),
              targetScreen: "leave-detail-student" as Screen,
              leaveId: req.id,
            })),
        ]
      : [
          ...(activeSession
            ? [
                {
                  id: `lecturer-session-${activeSession.id}`,
                  title: `Sesi Live Berjalan: ${activeSession.courseCode}`,
                  body: `${activeSession.courseName} (${activeSession.title}) masih terbuka. Klik untuk memantau.`,
                  time: "Sedang aktif",
                  tone: "blue" as const,
                  targetScreen: "live" as Screen,
                },
              ]
            : []),
          ...leaveRequests
            .filter((req) => req.status === "Menunggu Persetujuan")
            .slice(0, 6)
            .map((req) => ({
              id: `lecturer-pending-${req.id}`,
              title: `Permohonan ${req.reason} dari ${req.student}`,
              body: `${req.course} (${req.group}) • ${formatAbsenceDate(req.absenceDate)}`,
              time: req.submittedAt,
              tone: "amber" as const,
              targetScreen: "leave-detail-lecturer" as Screen,
              leaveId: req.id,
            })),
        ];

  const handleOpenNotification = (item: AppNotification) => {
    if (item.leaveId !== undefined) {
      setSelectedLeaveId(item.leaveId);
    }
    navigate(item.targetScreen);
  };

  return <AppShell role={role} screen={screen} navigate={navigate} title={title} profile={profile} onLogout={logout} notifications={notifications} onOpenNotification={handleOpenNotification}>
    {screen === "student-dashboard" && <StudentDashboard navigate={navigate} history={history} leaveRequests={leaveRequests} courses={dbStudentCourses} profile={profile} onRefreshCourses={async () => { if (profile) setDbStudentCourses(await fetchStudentCourses(profile.id)); }} />}
    {screen === "scan" && <Scanner navigate={navigate} scanned={scanned} onSuccess={scanSuccess} activeSession={activeSession} profile={profile} />}
    {screen === "history" && <AttendanceHistory history={history} />}
    {screen === "leave-form" && <LeaveRequestForm navigate={navigate} onSubmit={submitLeaveRequest} courses={dbStudentCourses} />}
    {screen === "leave-history" && <LeaveHistory requests={leaveRequests} navigate={navigate} onSelect={setSelectedLeaveId} studentNumber={profile?.student_number} />}
    {screen === "leave-detail-student" && <StudentLeaveDetail request={selectedLeave} navigate={navigate} />}
    {screen === "lecturer-dashboard" && <LecturerDashboard navigate={navigate} leaveRequests={leaveRequests} sections={dbLecturerSections} profile={profile} activeSession={activeSession} onRefreshSections={async () => { if (profile) setDbLecturerSections(await fetchLecturerSections(profile.id)); }} />}
    {screen === "leave-requests" && <LecturerLeaveRequests requests={leaveRequests} navigate={navigate} onSelect={setSelectedLeaveId} />}
    {screen === "leave-detail-lecturer" && <LecturerLeaveDetail request={selectedLeave} navigate={navigate} onDecision={decideLeaveRequest} />}
    {screen === "create-session" && <CreateSession navigate={navigate} sections={dbLecturerSections} onCreate={(session) => { setActiveSession(session); setSessionCreated(true); }} />}
    {screen === "live" && <LiveAttendance navigate={navigate} sessionCreated={sessionCreated} leaveRequests={leaveRequests} activeSession={activeSession} onCloseSession={handleCloseSession} />}
    {screen === "semester-recap" && <SemesterRecap navigate={navigate} sections={dbLecturerSections} />}
  </AppShell>;
}
















































