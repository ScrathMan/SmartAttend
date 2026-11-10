import { FormEvent, ReactNode, useMemo, useState } from "react";

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
  | "live";
type LeaveReason = "Sakit" | "Izin Keperluan Lain" | "Keperluan Keluarga";
type LeaveStatus = "Menunggu Persetujuan" | "Disetujui" | "Ditolak";
type LeaveRequest = {
  id: number;
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

const initialHistory = [
  { date: "Rabu, 22 Mei 2024", course: "Basis Data", code: "IF2150", time: "â€”", status: "Menunggu Verifikasi" },
  { date: "Rabu, 15 Mei 2024", course: "Interaksi Manusia dan Komputer", code: "IF2160", time: "â€”", status: "Izin" },
  { date: "Senin, 6 Mei 2024", course: "Pemrograman Berorientasi Objek", code: "IF2140", time: "â€”", status: "Sakit" },
  { date: "Senin, 20 Mei 2024", course: "Pemrograman Berorientasi Objek", code: "FIK-LAB 201", time: "07.56", status: "Hadir" },
  { date: "Jumat, 17 Mei 2024", course: "Metode Penelitian", code: "Dewi Sartika 301", time: "09.58", status: "Hadir" },
  { date: "Kamis, 16 Mei 2024", course: "Manajemen Proyek Perangkat Lunak", code: "FIK-LAB 302", time: "10.14", status: "Terlambat" },
  { date: "Selasa, 14 Mei 2024", course: "Interaksi Manusia dan Komputer", code: "Dewi Sartika 303", time: "â€”", status: "Tidak hadir" },
  { date: "Senin, 13 Mei 2024", course: "Jaringan Komputer", code: "FIK-LAB 301", time: "08.02", status: "Hadir" },
  { date: "Jumat, 10 Mei 2024", course: "Metode Penelitian", code: "Dewi Sartika 301", time: "09.55", status: "Hadir" },
];

const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 1001,
    student: "Agoy Salloh",
    studentId: "2510511009",
    course: "Basis Data",
    code: "IF2150",
    group: "Kelas B",
    absenceDate: "2024-05-22",
    reason: "Keperluan Keluarga",
    description: "Menghadiri acara keluarga di luar kota.",
    attachment: "surat-keterangan-keluarga.pdf",
    submittedAt: "21 Mei 2024, 14.25",
    status: "Menunggu Persetujuan",
  },
  {
    id: 1002,
    student: "Agoy Salloh",
    studentId: "2510511009",
    course: "Interaksi Manusia dan Komputer",
    code: "IF2160",
    group: "Kelas A",
    absenceDate: "2024-05-15",
    reason: "Izin Keperluan Lain",
    description: "Mengikuti kegiatan kompetisi mahasiswa tingkat nasional.",
    submittedAt: "13 Mei 2024, 09.10",
    status: "Disetujui",
    lecturerNote: "Izin disetujui. Silakan pelajari materi pertemuan secara mandiri.",
  },
  {
    id: 1003,
    student: "Agoy Salloh",
    studentId: "2510511009",
    course: "Pemrograman Berorientasi Objek",
    code: "IF2140",
    group: "Kelas A",
    absenceDate: "2024-05-06",
    reason: "Sakit",
    description: "Demam dan perlu beristirahat sesuai arahan dokter.",
    attachment: "surat-keterangan-dokter.pdf",
    submittedAt: "6 Mei 2024, 06.45",
    status: "Disetujui",
    lecturerNote: "Semoga lekas pulih. Materi dapat diakses melalui portal kelas.",
  },
  {
    id: 1004,
    student: "Agoy Salloh",
    studentId: "2510511009",
    course: "Interaksi Manusia dan Komputer",
    code: "IF2160",
    group: "Kelas A",
    absenceDate: "2024-05-14",
    reason: "Keperluan Keluarga",
    description: "Mengantar anggota keluarga untuk pemeriksaan kesehatan.",
    submittedAt: "13 Mei 2024, 18.20",
    status: "Ditolak",
    lecturerNote: "Dokumen pendukung belum tersedia. Silakan hubungi dosen untuk klarifikasi.",
  },
  {
    id: 1005,
    student: "Raka Aditya Pratama",
    studentId: "18222007",
    course: "Pemrograman",
    code: "IF2140",
    group: "Kelas A",
    absenceDate: "2024-05-20",
    reason: "Izin Keperluan Lain",
    description: "Ada agenda organisasi di luar kampus.",
    submittedAt: "19 Mei 2024, 20.30",
    status: "Ditolak",
    lecturerNote: "Agenda tidak disertai surat tugas resmi dan diajukan melewati batas waktu.",
  },
];

const lecturerClasses = [
  { code: "IF2140", name: "Pemrograman Berorientasi Objek", group: "Kelas A", students: 38, attended: 34, time: "08.00 â€“ 09.40", room: "Lab Komputer 3", color: "blue" },
  { code: "IF2150", name: "Metode Penelitian", group: "Kelas B", students: 42, attended: 39, time: "10.00 â€“ 11.40", room: "Gedung B â€¢ 203", color: "violet" },
  { code: "IF2160", name: "Manajemen Proyek Perangkat Lunak", group: "Kelas A", students: 36, attended: 31, time: "13.00 â€“ 14.40", room: "Gedung C â€¢ 301", color: "amber" },
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

function Sidebar({ role, screen, navigate, switchRole }: { role: Role; screen: Screen; navigate: (s: Screen) => void; switchRole: () => void }) {
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
    { label: "Permohonan Izin", icon: "calendar" as IconName, screen: "leave-requests" as Screen },
  ];
  const nav = role === "student" ? studentNav : lecturerNav;
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
      <div className="px-2"><Logo /></div>
      <nav className="mt-10 space-y-1.5">
        {nav.map((item) => <Button key={item.screen} onClick={() => navigate(item.screen)} variant="ghost" className={`w-full !justify-start !px-3.5 ${screen === item.screen ? "!bg-blue-50 !text-blue-700" : ""}`}><Icon name={item.icon} size={19} />{item.label}</Button>)}
      </nav>
      <div className="mt-auto border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={switchRole} className="w-full !justify-start !px-3">
          <Avatar initials={role === "student" ? "AS" : "PA"} small />
          <span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-slate-800">{role === "student" ? "Agoy Salloh" : "Pak Andra"}</span><span className="block text-xs font-normal text-slate-400">Ganti ke {role === "student" ? "Dosen" : "Mahasiswa"}</span></span>
          <Icon name="chevron" size={16} />
        </Button>
        <Button variant="ghost" onClick={() => navigate("login")} className="mt-1 w-full !justify-start !px-3 text-slate-500"><Icon name="logout" size={18} />Keluar dari demo</Button>
      </div>
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      {nav.map((item) => <Button key={item.screen} onClick={() => navigate(item.screen)} variant="ghost" className={`flex-1 !flex-col !gap-1 !px-1 !py-1.5 text-[11px] ${screen === item.screen ? "!bg-blue-50 !text-blue-700" : ""}`}><Icon name={item.icon} size={19} />{item.label}</Button>)}
    </nav>
  </>;
}

function Topbar({ title, role, onSwitch }: { title: string; role: Role; onSwitch: () => void }) {
  return <header className={`sticky top-0 z-20 flex h-16 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8 ${role === "student" ? "w-[1156px] items-center justify-center gap-x-[816px] gap-y-0" : "items-center justify-between"}`}>
    <div className="flex items-center gap-3 lg:hidden"><Logo compact /><span className="font-bold text-slate-900">{title}</span></div>
    <div className="hidden lg:block text-sm font-semibold text-slate-500">{title}</div>
    <div className="flex items-center gap-2">
      <Button variant="ghost" className="!size-10 !p-0"><Icon name="bell" size={19} /></Button>
      <Button variant="secondary" onClick={onSwitch} className="hidden sm:inline-flex !rounded-full !py-2"><Avatar initials={role === "student" ? "AS" : "PA"} small /><span>{role === "student" ? "Mahasiswa" : "Dosen"}</span><Icon name="chevron" size={15} /></Button>
    </div>
  </header>;
}

function AppShell({ children, role, screen, navigate, title, switchRole }: { children: ReactNode; role: Role; screen: Screen; navigate: (s: Screen) => void; title: string; switchRole: () => void }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Sidebar role={role} screen={screen} navigate={navigate} switchRole={switchRole} /><div className="lg:pl-64"><Topbar role={role} title={title} onSwitch={switchRole} /><main className="mx-auto max-w-7xl px-5 py-7 pb-28 md:px-8 md:py-9 lg:pb-10">{children}</main></div></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <div className="mb-1 text-sm font-semibold text-blue-600">{eyebrow}</div>}<div className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</div><p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p></div>
    {action}
  </div>;
}

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("2510511009@mahasiswa.upnvj.ac.id");
  const [password, setPassword] = useState("demo12345");
  const submit = (e: FormEvent) => { e.preventDefault(); onLogin(role); };
  return <div className="relative min-h-screen overflow-hidden bg-slate-50">
    <div className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden bg-blue-700 lg:block">
      <div className="absolute -right-32 -top-32 size-[34rem] rounded-full border border-white/10" />
      <div className="absolute -right-12 -top-12 size-[22rem] rounded-full border border-white/10" />
      <div className="absolute -bottom-32 -left-32 size-[30rem] rounded-full bg-blue-600" />
      <div className="relative z-10 flex h-full flex-col justify-between p-16 text-white">
        <div className="flex items-center gap-3 text-sm font-semibold text-blue-100"><Icon name="shield" />Simulasi akademik yang aman</div>
        <div className="max-w-lg">
          <div className="mb-8 grid size-20 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur"><Icon name="qr" size={42} /></div>
          <div className="text-4xl font-bold leading-tight">Presensi kampus,<br />lebih cepat dan transparan.</div>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100">Kelola kehadiran perkuliahan melalui kode QR dalam satu platform yang ringkas dan mudah digunakan.</p>
          <div className="mt-10 flex gap-8 border-t border-white/15 pt-8">
            <div><div className="text-2xl font-bold">10 dtk</div><div className="mt-1 text-xs text-blue-200">Rata-rata presensi</div></div>
            <div><div className="text-2xl font-bold">100%</div><div className="mt-1 text-xs text-blue-200">Data lokal demo</div></div>
            <div><div className="text-2xl font-bold">2 peran</div><div className="mt-1 text-xs text-blue-200">Mahasiswa & dosen</div></div>
          </div>
        </div>
        <div className="text-xs text-blue-200">SmartAttend â€¢ Prototipe Akademik 2024</div>
      </div>
    </div>
    <div className="flex min-h-screen w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-12">
          <div className="text-3xl font-bold tracking-tight text-slate-900">Selamat datang kembali</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Masuk untuk mengakses sistem presensi SmartAttend.</p>
        </div>
        <div className="mt-8 rounded-xl bg-slate-100 p-1">
          <div className="grid grid-cols-2 gap-1">
            <Button variant="ghost" onClick={() => { setRole("student"); setEmail("nadia.ramadhani@mahasiswa.ac.id"); }} className={`!py-2.5 ${role === "student" ? "!bg-white !text-blue-700 shadow-sm" : ""}`}><Icon name="user" size={17} />Mahasiswa</Button>
            <Button variant="ghost" onClick={() => { setRole("lecturer"); setEmail("bima.santoso@dosen.ac.id"); }} className={`!py-2.5 ${role === "lecturer" ? "!bg-white !text-blue-700 shadow-sm" : ""}`}><Icon name="book" size={17} />Dosen</Button>
          </div>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <Field label="Email institusi" icon="user" type="email" value={email} onChange={setEmail} />
          <Field label="Kata sandi" icon="shield" type="password" value={password} onChange={setPassword} />
          <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-slate-600"><input type="checkbox" defaultChecked className="size-4 rounded border-slate-300 accent-blue-600" />Ingat saya</label><span className="font-semibold text-blue-600">Lupa kata sandi?</span></div>
          <Button type="submit" className="w-full !py-3.5">Masuk sebagai {role === "student" ? "Mahasiswa" : "Dosen"}<Icon name="chevron" size={18} /></Button>
        </form>
        <div className="mt-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><Icon name="info" size={18} className="mt-0.5 shrink-0" /><span>Ini adalah demo prototype interactive. seluruh data merupakan dummy dan tidak ada data yang dikirim ke sistem universitas.</span></div>
      </div>
    </div>
  </div>;
}

function StudentDashboard({ navigate, attendanceCount, leaveRequests }: { navigate: (s: Screen) => void; attendanceCount: number; leaveRequests: LeaveRequest[] }) {
  const pending = leaveRequests.filter((request) => request.studentId === "2510511009" && request.status === "Menunggu Persetujuan").length;
  return <div>
    <PageHeading eyebrow="Selasa, 20 Oktober 2026" title="Selamat pagi, Agoy!" description={"Berikut jadwal kuliah dan\u00a0\u00a0presensimu hari ini."} action={<Button onClick={() => navigate("scan")} className="sm:self-center"><Icon name="camera" size={18} />Scan QR Sekarang</Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon="check" label="Kehadiran semester ini" value={`${attendanceCount}/42`} detail="92% tingkat kehadiran" tone="emerald" />
      <StatCard icon="calendar" label="Jadwal hari ini" value="3 Kelas" detail="Kelas pertama pukul 08.00" tone="blue" />
      <StatCard icon="clock" label="Total keterlambatan" value="2 Kali" detail="Berusahalah datang lebih tepat waktu" tone="amber" />
    </div>
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
        <div className="mb-6 flex items-center justify-between"><div><div className="text-lg font-bold">Jadwal hari ini</div><div className="mt-1 text-xs text-slate-400">3 mata kuliah terjadwal</div></div><Button variant="ghost" className="!px-2 text-blue-600">Lihat kalender <Icon name="chevron" size={15} /></Button></div>
        <div className="space-y-3">{studentCourses.map((course, i) => <ScheduleRow key={course.code} course={course} active={i === 0} onScan={() => navigate("scan")} />)}</div>
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
        <div className="flex items-center gap-6"><div className="relative grid size-20 place-items-center rounded-full bg-[conic-gradient(#2563eb_92%,#e2e8f0_0)]"><div className="grid size-14 place-items-center rounded-full bg-white text-sm font-bold text-slate-800">92%</div></div><div className="grid grid-cols-2 gap-x-7 gap-y-2 text-sm"><Legend color="bg-emerald-500" label="Hadir" value={attendanceCount.toString()} /><Legend color="bg-amber-500" label="Terlambat" value="2" /><Legend color="bg-red-500" label="Tidak hadir" value="2" /><Legend color="bg-slate-300" label="Sisa kelas" value="4" /></div></div>
      </div>
    </div>
  </div>;
}

function LeaveRequestForm({ navigate, onSubmit }: { navigate: (s: Screen) => void; onSubmit: (data: { courseCode: string; absenceDate: string; reason: LeaveReason; description: string; attachment?: string }) => void }) {
  const [courseCode, setCourseCode] = useState("");
  const [absenceDate, setAbsenceDate] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!courseCode || !absenceDate || !reason) {
      setError("Lengkapi mata kuliah, tanggal ketidakhadiran, dan alasan sebelum mengirim pengajuan.");
      setSent(false);
      return;
    }
    onSubmit({ courseCode, absenceDate, reason: reason as LeaveReason, description, attachment: attachment || undefined });
    setError("");
    setSent(true);
  };
  return <div>
    <Button variant="ghost" onClick={() => navigate("student-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Ajukan izin ketidakhadiran" description="Sampaikan alasan ketidakhadiran untuk diperiksa oleh dosen pengampu." />
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5"><div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon name="calendar" size={20} /></div><div><div className="font-bold">Detail pengajuan</div><div className="text-xs text-slate-400">Kolom bertanda wajib harus dilengkapi</div></div></div>
        <div className="space-y-5">
          {error && <Feedback tone="error">{error}</Feedback>}
          {sent && <Feedback tone="success">Pengajuan berhasil dikirim dengan status <strong>Menunggu Persetujuan</strong>. Data hanya tersimpan selama sesi prototype ini.</Feedback>}
          <SelectField label="Mata kuliah *" value={courseCode} onChange={(value) => { setCourseCode(value); setSent(false); }}>
            <option value="">Pilih mata kuliah</option>
            {studentCourses.map((course) => <option key={course.code} value={course.code}>{course.code} â€” {course.name}</option>)}
          </SelectField>
          <Field label="Tanggal ketidakhadiran *" type="date" value={absenceDate} onChange={(value) => { setAbsenceDate(value); setSent(false); }} />
          <SelectField label="Alasan *" value={reason} onChange={(value) => { setReason(value); setSent(false); }}>
            <option value="">Pilih alasan</option>
            <option value="Sakit">Sakit</option>
            <option value="Izin Keperluan Lain">Izin Keperluan Lain</option>
            <option value="Keperluan Keluarga">Keperluan Keluarga</option>
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

function LeaveHistory({ requests, navigate, onSelect }: { requests: LeaveRequest[]; navigate: (s: Screen) => void; onSelect: (id: number) => void }) {
  const studentRequests = requests.filter((request) => request.studentId === "2510511009");
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
        <div><div className="font-semibold text-slate-800">{request.course}</div><div className="mt-1 text-xs text-slate-400">{request.code} â€¢ {request.group}</div></div>
        <div><div className="text-xs text-slate-400">Tanggal ketidakhadiran</div><div className="mt-1 text-sm font-medium text-slate-700">{formatAbsenceDate(request.absenceDate)}</div></div>
        <div><div className="text-xs text-slate-400">{request.reason} â€¢ diajukan {request.submittedAt}</div><div className="mt-2"><LeaveStatusBadge status={request.status} /></div></div>
        <Button variant="secondary" onClick={() => { onSelect(request.id); navigate("leave-detail-student"); }}>Lihat Detail <Icon name="chevron" size={15} /></Button>
      </div>)}</div>
    </section>
  </div>;
}

function StudentLeaveDetail({ request, navigate }: { request?: LeaveRequest; navigate: (s: Screen) => void }) {
  if (!request) return <div><Feedback tone="error">Pengajuan tidak ditemukan.</Feedback><Button onClick={() => navigate("leave-history")} className="mt-4">Kembali ke Riwayat</Button></div>;
  return <div>
    <Button variant="ghost" onClick={() => navigate("leave-history")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke riwayat</Button>
    <PageHeading title="Detail pengajuan izin" description={`Pengajuan #${request.id} â€¢ dikirim ${request.submittedAt}`} action={<LeaveStatusBadge status={request.status} />} />
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

function FakeQR({ small = false }: { small?: boolean }) {
  const cells = [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 16, 20, 22, 23, 24, 25, 26, 28, 30, 32, 34, 36, 38, 40, 41, 42, 43, 44, 46, 48, 49, 50, 52, 54, 56, 58, 60, 62, 64, 65, 66, 67, 68, 70, 72, 74, 76, 77, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 101, 102, 103, 104, 106, 108, 110, 112, 114, 116, 118, 120];
  return <div className={`grid grid-cols-11 gap-[2px] rounded-xl bg-white p-3 shadow-sm ${small ? "size-36" : "size-52"}`}>{Array.from({ length: 121 }, (_, i) => <span key={i} className={`rounded-[1px] ${cells.includes(i) || ((i * 7 + 3) % 13 < 4) ? "bg-slate-900" : "bg-white"}`} />)}</div>;
}

function Scanner({ navigate, scanned, onSuccess }: { navigate: (s: Screen) => void; scanned: boolean; onSuccess: () => void }) {
  const [state, setState] = useState<"ready" | "success" | "expired" | "invalid" | "duplicate">("ready");
  const scan = (result: "success" | "expired" | "invalid" | "duplicate") => {
    if (result === "success" && scanned) setState("duplicate");
    else { setState(result); if (result === "success") onSuccess(); }
  };
  const messages = {
    success: { icon: "check" as IconName, title: "Presensi berhasil!", text: "Kehadiranmu untuk Pemrograman Berorientasi Objek telah tercatat pukul 07.56.", color: "emerald" },
    expired: { icon: "clock" as IconName, title: "Kode QR kedaluwarsa", text: "Sesi ini telah berakhir pukul 09.40. Minta dosen membuat sesi baru.", color: "amber" },
    invalid: { icon: "x" as IconName, title: "Sesi tidak valid", text: "Kode QR ini tidak dikenali atau bukan untuk jadwal kuliahmu.", color: "red" },
    duplicate: { icon: "info" as IconName, title: "Presensi sudah tercatat", text: "Kamu sudah melakukan presensi untuk sesi ini pukul 07.56.", color: "blue" },
  };
  return <div>
    <Button variant="ghost" onClick={() => navigate("student-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Pindai kode QR" description="Arahkan kamera ke kode QR yang ditampilkan oleh dosen." />
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-2xl bg-slate-900 p-4 shadow-xl md:p-8">
        <div className="relative mx-auto aspect-[4/3] max-h-[32rem] overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-950">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,#94a3b8_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 md:size-64">
            <span className="absolute left-0 top-0 size-12 rounded-tl-xl border-l-4 border-t-4 border-blue-400" /><span className="absolute right-0 top-0 size-12 rounded-tr-xl border-r-4 border-t-4 border-blue-400" /><span className="absolute bottom-0 left-0 size-12 rounded-bl-xl border-b-4 border-l-4 border-blue-400" /><span className="absolute bottom-0 right-0 size-12 rounded-br-xl border-b-4 border-r-4 border-blue-400" />
            <span className="scan-line absolute inset-x-4 top-1/2 h-0.5 bg-blue-400 shadow-[0_0_12px_#60a5fa]" />
          </div>
          <div className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-slate-300">Posisikan kode QR di dalam bingkai</div>
        </div>
      </section>
      <aside className="space-y-4">
        {state !== "ready" && <ScanResult data={messages[state]} onAgain={() => setState("ready")} onHome={() => navigate("student-dashboard")} />}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-bold">Simulasi hasil scan</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Pilih skenario untuk melihat respons validasi sistem.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => scan("success")} className="!justify-start !px-3 text-xs"><span className="size-2 rounded-full bg-emerald-500" />Berhasil</Button>
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

function LecturerDashboard({ navigate, leaveRequests }: { navigate: (s: Screen) => void; leaveRequests: LeaveRequest[] }) {
  const pending = leaveRequests.filter((request) => request.status === "Menunggu Persetujuan").length;
  return <div>
    <PageHeading eyebrow="Senin, 20 Mei 2024" title="Selamat pagi, Pak Andra!" description="Kelola kelas, sesi presensi, dan pantau kehadiran mahasiswa." action={<Button onClick={() => navigate("create-session")}><Icon name="plus" size={18} />Buat Sesi Presensi</Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon="book" label="Kelas hari ini" value="3 Kelas" detail="116 mahasiswa terdaftar" tone="blue" />
      <StatCard icon="users" label="Hadir hari ini" value="104" detail="89,6% tingkat kehadiran" tone="emerald" />
      <StatCard icon="live" label="Sesi aktif" value="1 Sesi" detail="IF2140 â€¢ berakhir 09.40" tone="amber" />
    </div>
    <section className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Icon name="calendar" size={21} /></div><div><div className="font-bold text-blue-950">Permohonan izin mahasiswa</div><p className="mt-1 text-sm leading-6 text-blue-800">{pending > 0 ? `${pending} pengajuan menunggu keputusan Anda.` : "Tidak ada pengajuan baru yang menunggu."}</p></div></div>
        <Button onClick={() => navigate("leave-requests")}>Buka Permohonan <Icon name="chevron" size={16} /></Button>
      </div>
    </section>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6 flex items-center justify-between"><div><div className="text-lg font-bold">Kelas hari ini</div><div className="mt-1 text-xs text-slate-400">Senin, 20 Mei 2024</div></div><Button variant="ghost" className="!px-2 text-blue-600">Lihat semua kelas <Icon name="chevron" size={15} /></Button></div>
      <div className="grid gap-4 lg:grid-cols-3">{lecturerClasses.map((c, i) => <ClassCard key={c.code} course={c} active={i === 0} onLive={() => navigate("live")} onCreate={() => navigate("create-session")} />)}</div>
    </section>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="text-lg font-bold">Ringkasan kehadiran semester</div><p className="mt-1 text-sm text-slate-500">Rata-rata seluruh kelas yang Anda ampu</p></div>
        <div className="flex flex-1 flex-col gap-4 sm:flex-row lg:max-w-2xl">
          {[["Pemrograman Berorientasi Objek", "94%", 94], ["Basis Data", "91%", 91], ["Interaksi Manusia Komputer", "86%", 86]].map(([name, val, num]) => <div key={name as string} className="flex-1"><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">{name}</span><span className="font-bold text-slate-800">{val}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${num}%` }} /></div></div>)}
        </div>
      </div>
    </section>
  </div>;
}

function LecturerLeaveRequests({ requests, navigate, onSelect }: { requests: LeaveRequest[]; navigate: (s: Screen) => void; onSelect: (id: number) => void }) {
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
        <div><div className="text-sm font-semibold text-slate-700">{request.course}</div><div className="mt-1 text-xs text-slate-400">{request.code} â€¢ {request.group}</div></div>
        <div><div className="text-xs text-slate-400">Ketidakhadiran</div><div className="mt-1 text-sm text-slate-700">{formatAbsenceDate(request.absenceDate)}</div></div>
        <div><div className="text-xs text-slate-400">{request.reason} â€¢ {request.submittedAt}</div><div className="mt-2"><LeaveStatusBadge status={request.status} /></div></div>
        <Button variant="secondary" onClick={() => { onSelect(request.id); navigate("leave-detail-lecturer"); }}>Periksa <Icon name="chevron" size={15} /></Button>
      </div>)}</div>
    </section>
  </div>;
}

function LecturerLeaveDetail({ request, navigate, onDecision }: { request?: LeaveRequest; navigate: (s: Screen) => void; onDecision: (id: number, status: "Disetujui" | "Ditolak", note: string) => void }) {
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
    <PageHeading title="Detail pengajuan izin" description={`Permohonan #${request.id} â€¢ diajukan ${request.submittedAt}`} action={<LeaveStatusBadge status={request.status} />} />
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-6"><Avatar initials={request.student.split(" ").map((part) => part[0]).slice(0, 2).join("")} /><div><div className="font-bold text-slate-900">{request.student}</div><div className="mt-1 text-xs text-slate-400">NIM {request.studentId}</div></div></div>
        <div className="grid gap-6 sm:grid-cols-2">
          <InfoItem label="Mata kuliah dan kelas" value={`${request.course} â€¢ ${request.code} â€¢ ${request.group}`} />
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
    <div className="mt-4 text-base font-bold">{course.name}</div><div className="mt-1 text-xs text-slate-400">{course.group} â€¢ {course.students} mahasiswa</div>
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><div className="flex gap-2"><Icon name="clock" size={15} />{course.time}</div><div className="flex gap-2"><Icon name="calendar" size={15} />{course.room}</div></div>
    <div className="mt-5 flex items-center justify-between"><div><span className="text-xl font-bold">{course.attended}</span><span className="text-xs text-slate-400">/{course.students} hadir</span></div><Button variant={active ? "primary" : "secondary"} onClick={active ? onLive : onCreate} className="!py-2">{active ? "Pantau Live" : "Buat Sesi"}</Button></div>
  </div>;
}

function CreateSession({ navigate, onCreate }: { navigate: (s: Screen) => void; onCreate: () => void }) {
  const [course, setCourse] = useState("IF2140");
  const [meeting, setMeeting] = useState("12");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:40");
  const [generated, setGenerated] = useState(false);
  const generate = (e: FormEvent) => { e.preventDefault(); setGenerated(true); onCreate(); };
  return <div>
    <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Buat sesi presensi" description="Atur detail pertemuan dan buat kode QR untuk mahasiswa." />
    <div className="grid gap-6 lg:grid-cols-[1fr_25rem]">
      <form onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5"><div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon name="calendar" size={20} /></div><div><div className="font-bold">Detail sesi</div><div className="text-xs text-slate-400">Pastikan informasi kelas sudah sesuai</div></div></div>
        <div className="space-y-5">
          <SelectField label="Mata kuliah" value={course} onChange={setCourse}><option value="IF2140">IF2140 â€” Pemrograman Berorientasi Objek</option><option value="IF2150">IF2150 â€” Basis Data</option><option value="IF2160">IF2160 â€” Interaksi Manusia Komputer</option></SelectField>
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Pertemuan ke-" value={meeting} onChange={setMeeting} /><SelectField label="Kelas" value="A" onChange={() => { }}><option>A â€” Reguler</option><option>B â€” Reguler</option></SelectField></div>
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Waktu mulai" type="time" value={start} onChange={setStart} /><Field label="Waktu selesai" type="time" value={end} onChange={setEnd} /></div>
          <div className="rounded-xl bg-slate-50 p-4"><label className="flex items-start gap-3"><input type="checkbox" defaultChecked className="mt-0.5 size-4 accent-blue-600" /><span><span className="block text-sm font-semibold text-slate-700">Validasi waktu otomatis</span><span className="mt-1 block text-xs leading-5 text-slate-500">QR akan kedaluwarsa setelah waktu selesai dan presensi ganda akan ditolak.</span></span></label></div>
          <Button type="submit" className="w-full !py-3.5"><Icon name="qr" size={19} />Buat & Tampilkan QR</Button>
        </div>
      </form>
      <aside className={`rounded-2xl p-6 text-center transition-all ${generated ? "border border-blue-200 bg-blue-50" : "border border-dashed border-slate-300 bg-white"}`}>
        {generated ? <><div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />Sesi aktif</div><div className="mx-auto mt-5 w-fit"><FakeQR small /></div><div className="mt-5 font-bold">Pemrograman Berorientasi Objek</div><div className="mt-1 text-xs text-slate-500">Pertemuan {meeting} â€¢ Kelas A</div><div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700"><Icon name="clock" size={17} />{start} â€“ {end} WIB</div><Button onClick={() => navigate("live")} className="mt-6 w-full">Pantau Presensi Live <Icon name="chevron" size={17} /></Button></> : <div className="flex min-h-80 flex-col items-center justify-center"><div className="grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="qr" size={30} /></div><div className="mt-5 font-bold text-slate-700">QR belum dibuat</div><p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">Lengkapi detail sesi, lalu tekan tombol buat untuk menghasilkan kode QR demo.</p></div>}
      </aside>
    </div>
  </div>;
}

function LiveAttendance({ navigate, sessionCreated, leaveRequests }: { navigate: (s: Screen) => void; sessionCreated: boolean; leaveRequests: LeaveRequest[] }) {
  const [tab, setTab] = useState<"live" | "recap">("live");
  const [query, setQuery] = useState("");
  const attendees = useMemo(() => attendeeSeed.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) || x.id.includes(query)), [query]);
  return <div>
    <Button variant="ghost" onClick={() => navigate("lecturer-dashboard")} className="mb-5 !px-0"><Icon name="arrow" size={18} />Kembali ke beranda</Button>
    <PageHeading title="Presensi Pemrograman Berorientasi Objek" description="IF2140 â€¢ Pertemuan 12 â€¢ Senin, 20 Mei 2024" action={<div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />{sessionCreated ? "Sesi aktif" : "Sesi demo aktif"} â€¢ 32:18</div>} />
    <div className="mb-6 flex w-fit rounded-xl bg-slate-100 p-1"><Button variant="ghost" onClick={() => setTab("live")} className={tab === "live" ? "!bg-white !text-blue-700 shadow-sm" : ""}><Icon name="live" size={17} />Daftar Live</Button><Button variant="ghost" onClick={() => setTab("recap")} className={tab === "recap" ? "!bg-white !text-blue-700 shadow-sm" : ""}><Icon name="history" size={17} />Rekap Presensi</Button></div>
    {tab === "live" ? <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">Mahasiswa hadir</div><div className="mt-1 text-xs text-slate-400">Diperbarui secara otomatis dalam simulasi</div></div><div className="relative"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 sm:w-64" placeholder="Cari nama atau NIM" /></div></div>
        <div className="divide-y divide-slate-100">{attendees.map((person, i) => <div key={person.id} className="flex items-center gap-3 px-5 py-4"><span className="hidden w-6 text-xs text-slate-400 sm:block">{String(i + 1).padStart(2, "0")}</span><Avatar initials={person.initials} tone={person.tone} small /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{person.name}</div><div className="text-xs text-slate-400">{person.id}</div></div><div className="hidden text-right sm:block"><div className="text-sm font-semibold">{person.time}</div><div className="text-xs text-slate-400">WIB</div></div><StatusPill status={person.status} /></div>)}</div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl bg-blue-600 p-5 text-white"><div className="text-sm text-blue-100">Kehadiran saat ini</div><div className="mt-2 text-4xl font-bold">34<span className="text-xl text-blue-200">/38</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-500"><div className="h-full w-[89%] rounded-full bg-white" /></div><div className="mt-2 text-xs text-blue-100">89% mahasiswa telah hadir</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="font-bold">Kode QR sesi</div><div className="mx-auto mt-4 w-fit"><FakeQR small /></div><div className="mt-4 text-center text-xs text-slate-400">Berakhir pukul 09.40 WIB</div></div>
        <Button variant="danger" className="w-full"><Icon name="x" size={17} />Akhiri sesi</Button>
      </aside>
    </div> : <Recap leaveRequests={leaveRequests} />}
  </div>;
}

function Recap({ leaveRequests }: { leaveRequests: LeaveRequest[] }) {
  const approvedSick = leaveRequests.filter((request) => request.status === "Disetujui" && request.reason === "Sakit").length;
  const approvedLeave = leaveRequests.filter((request) => request.status === "Disetujui" && request.reason !== "Sakit").length;
  const recap = [
    { label: "Hadir", value: 34, pct: "89%", color: "bg-emerald-500", box: "bg-emerald-50 text-emerald-700" },
    { label: "Terlambat", value: 3, pct: "8%", color: "bg-amber-500", box: "bg-amber-50 text-amber-700" },
    { label: "Tidak hadir", value: 1, pct: "3%", color: "bg-red-500", box: "bg-red-50 text-red-700" },
  ];
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">{recap.map((x) => <div key={x.label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div className={`grid size-10 place-items-center rounded-xl ${x.box}`}><Icon name={x.label === "Hadir" ? "check" : x.label === "Terlambat" ? "clock" : "x"} size={19} /></div><span className="text-sm font-bold text-slate-400">{x.pct}</span></div><div className="mt-4 text-3xl font-bold">{x.value}</div><div className="mt-1 text-sm text-slate-500">{x.label}</div></div>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-lg font-bold">Izin dan sakit terverifikasi</div><p className="mt-1 text-sm text-slate-500">Berasal dari pengajuan yang telah disetujui dosen.</p></div><div className="flex gap-3"><div className="rounded-xl bg-blue-50 px-4 py-3 text-center"><div className="text-xl font-bold text-blue-700">{approvedLeave}</div><div className="text-xs text-blue-600">Izin</div></div><div className="rounded-xl bg-violet-50 px-4 py-3 text-center"><div className="text-xl font-bold text-violet-700">{approvedSick}</div><div className="text-xs text-violet-600">Sakit</div></div></div></div>
      <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">{leaveRequests.filter((request) => request.status === "Disetujui").map((request) => <div key={request.id} className="grid gap-3 py-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"><div><div className="text-sm font-semibold">{request.student}</div><div className="text-xs text-slate-400">{request.studentId} â€¢ {request.course}</div></div><div className="text-sm text-slate-600">{formatAbsenceDate(request.absenceDate)}</div><StatusPill status={request.reason === "Sakit" ? "Sakit" : "Izin"} /></div>)}</div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="text-lg font-bold">Ringkasan sesi</div><p className="mt-1 text-sm text-slate-500">Distribusi status kehadiran pertemuan 12</p></div><Button variant="secondary">Unduh rekap CSV</Button></div>
      <div className="mt-8 space-y-5">{recap.map((x) => <div key={x.label}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-600">{x.label}</span><span className="font-bold">{x.value} mahasiswa</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${x.color}`} style={{ width: x.pct }} /></div></div>)}</div>
      <div className="mt-8 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3"><div><div className="text-xs text-slate-400">Waktu sesi</div><div className="mt-1 text-sm font-semibold">08.00 â€“ 09.40 WIB</div></div><div><div className="text-xs text-slate-400">Kehadiran pertama</div><div className="mt-1 text-sm font-semibold">07.54 â€¢ Nadia Putri</div></div><div><div className="text-xs text-slate-400">Rata-rata waktu scan</div><div className="mt-1 text-sm font-semibold">8,4 detik</div></div></div>
    </section>
  </div>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [role, setRole] = useState<Role>("student");
  const [scanned, setScanned] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number>(initialLeaveRequests[0].id);
  const navigate = (next: Screen) => setScreen(next);
  const login = (nextRole: Role) => { setRole(nextRole); setScreen(nextRole === "student" ? "student-dashboard" : "lecturer-dashboard"); };
  const switchRole = () => { const next = role === "student" ? "lecturer" : "student"; setRole(next); setScreen(next === "student" ? "student-dashboard" : "lecturer-dashboard"); };
  const scanSuccess = () => {
    if (scanned) return;
    setScanned(true);
    const attendance = { date: "Senin, 20 Mei 2024", course: "Pemrograman Berorientasi Objek", code: "IF2140", time: "07.56", status: "Hadir" };
    setHistory((rows) => {
      const existing = rows.findIndex((row) => row.date === attendance.date && (row.code === attendance.code || row.course.startsWith("Pemrograman")));
      return existing >= 0 ? rows.map((row, index) => index === existing ? attendance : row) : [attendance, ...rows];
    });
  };
  const submitLeaveRequest = (data: { courseCode: string; absenceDate: string; reason: LeaveReason; description: string; attachment?: string }) => {
    const course = studentCourses.find((item) => item.code === data.courseCode)!;
    const id = Date.now();
    const request: LeaveRequest = {
      id,
      student: "Agoy Salloh",
      studentId: "2510511009",
      course: course.name,
      code: course.code,
      group: course.code === "IF2150" ? "Kelas B" : "Kelas A",
      absenceDate: data.absenceDate,
      reason: data.reason,
      description: data.description,
      attachment: data.attachment,
      submittedAt: "Hari ini, 10.24",
      status: "Menunggu Persetujuan",
    };
    setLeaveRequests((requests) => [request, ...requests]);
    setSelectedLeaveId(id);
    const pendingRecord = { date: formatAbsenceDate(data.absenceDate), course: course.name, code: course.code, time: "â€”", status: "Menunggu Verifikasi" };
    setHistory((rows) => {
      const existing = rows.findIndex((row) => row.date === pendingRecord.date && row.code === pendingRecord.code);
      return existing >= 0 ? rows.map((row, index) => index === existing ? pendingRecord : row) : [pendingRecord, ...rows];
    });
  };
  const decideLeaveRequest = (id: number, status: "Disetujui" | "Ditolak", lecturerNote: string) => {
    const request = leaveRequests.find((item) => item.id === id);
    if (!request) return;
    setLeaveRequests((requests) => requests.map((item) => item.id === id ? { ...item, status, lecturerNote } : item));
    const attendanceStatus = status === "Disetujui" ? (request.reason === "Sakit" ? "Sakit" : "Izin") : "Tidak hadir";
    const attendanceRecord = { date: formatAbsenceDate(request.absenceDate), course: request.course, code: request.code, time: "â€”", status: attendanceStatus };
    setHistory((rows) => {
      const existing = rows.findIndex((row) => row.date === attendanceRecord.date && row.code === attendanceRecord.code);
      return existing >= 0 ? rows.map((row, index) => index === existing ? attendanceRecord : row) : [attendanceRecord, ...rows];
    });
  };
  if (screen === "login") return <Login onLogin={login} />;
  const title = role === "student" ? "Portal Mahasiswa" : "Portal Dosen";
  const selectedLeave = leaveRequests.find((request) => request.id === selectedLeaveId);
  return <AppShell role={role} screen={screen} navigate={navigate} title={title} switchRole={switchRole}>
    {screen === "student-dashboard" && <StudentDashboard navigate={navigate} attendanceCount={scanned ? 39 : 38} leaveRequests={leaveRequests} />}
    {screen === "scan" && <Scanner navigate={navigate} scanned={scanned} onSuccess={scanSuccess} />}
    {screen === "history" && <AttendanceHistory history={history} />}
    {screen === "leave-form" && <LeaveRequestForm navigate={navigate} onSubmit={submitLeaveRequest} />}
    {screen === "leave-history" && <LeaveHistory requests={leaveRequests} navigate={navigate} onSelect={setSelectedLeaveId} />}
    {screen === "leave-detail-student" && <StudentLeaveDetail request={selectedLeave} navigate={navigate} />}
    {screen === "lecturer-dashboard" && <LecturerDashboard navigate={navigate} leaveRequests={leaveRequests} />}
    {screen === "leave-requests" && <LecturerLeaveRequests requests={leaveRequests} navigate={navigate} onSelect={setSelectedLeaveId} />}
    {screen === "leave-detail-lecturer" && <LecturerLeaveDetail request={selectedLeave} navigate={navigate} onDecision={decideLeaveRequest} />}
    {screen === "create-session" && <CreateSession navigate={navigate} onCreate={() => setSessionCreated(true)} />}
    {screen === "live" && <LiveAttendance navigate={navigate} sessionCreated={sessionCreated} leaveRequests={leaveRequests} />}
  </AppShell>;
}

