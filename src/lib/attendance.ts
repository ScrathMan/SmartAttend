import { supabase } from "./supabase";

export interface ActiveSessionInfo {
  id: string;
  sectionId: string;
  title: string;
  courseCode: string;
  courseName: string;
  sectionName: string;
  startsAt: string;
  endsAt: string;
  qrTokenHash: string;
  status: string;
}

export interface LiveAttendeeItem {
  id: string;
  studentId: string;
  name: string;
  studentNumber: string;
  initials: string;
  time: string;
  status: "Hadir" | "Terlambat" | "Tidak hadir";
  tone: "blue" | "emerald" | "amber" | "violet";
}

export interface AttendanceHistoryItem {
  date: string;
  course: string;
  code: string;
  time: string;
  status: string;
}

export async function createAttendanceSession(params: {
  sectionId: string;
  meetingNumber: string;
  startTime: string;
  endTime: string;
}): Promise<ActiveSessionInfo> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const startsAt = new Date(`${yyyy}-${mm}-${dd}T${params.startTime}:00`).toISOString();
  const endsAt = new Date(`${yyyy}-${mm}-${dd}T${params.endTime}:00`).toISOString();
  const token = `SA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      section_id: params.sectionId,
      title: `Pertemuan ${params.meetingNumber}`,
      starts_at: startsAt,
      ends_at: endsAt,
      qr_token_hash: token,
      qr_expires_at: endsAt,
      status: "open",
    })
    .select(`
      id,
      section_id,
      title,
      starts_at,
      ends_at,
      qr_token_hash,
      status,
      class_sections (
        section_name,
        courses (
          course_code,
          course_name
        )
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Gagal membuat sesi presensi.");
  }

  const section: any = Array.isArray(data.class_sections) ? data.class_sections[0] : data.class_sections;
  const course: any = section?.courses
    ? Array.isArray(section.courses)
      ? section.courses[0]
      : section.courses
    : null;

  return {
    id: data.id,
    sectionId: data.section_id,
    title: data.title,
    courseCode: course?.course_code || "IF2140",
    courseName: course?.course_name || "Mata Kuliah",
    sectionName: section?.section_name || "Kelas A",
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    qrTokenHash: data.qr_token_hash || token,
    status: data.status,
  };
}

export async function fetchLatestActiveSession(sectionIds?: string[]): Promise<ActiveSessionInfo | null> {
  let query = supabase
    .from("attendance_sessions")
    .select(`
      id,
      section_id,
      title,
      starts_at,
      ends_at,
      qr_token_hash,
      status,
      class_sections (
        section_name,
        courses (
          course_code,
          course_name
        )
      )
    `)
    .eq("status", "open")
    .order("starts_at", { ascending: false })
    .limit(1);

  if (sectionIds && sectionIds.length > 0) {
    query = query.in("section_id", sectionIds);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;

  const row: any = data[0];
  const section: any = Array.isArray(row.class_sections) ? row.class_sections[0] : row.class_sections;
  const course: any = section?.courses
    ? Array.isArray(section.courses)
      ? section.courses[0]
      : section.courses
    : null;

  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    courseCode: course?.course_code || "IF2140",
    courseName: course?.course_name || "Mata Kuliah",
    sectionName: section?.section_name || "Kelas A",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    qrTokenHash: row.qr_token_hash || "",
    status: row.status,
  };
}

export async function closeAttendanceSession(sessionId: string): Promise<void> {
  await supabase
    .from("attendance_sessions")
    .update({ status: "closed" })
    .eq("id", sessionId);
}

export async function submitStudentCheckIn(params: {
  sessionId: string;
  studentId: string;
}): Promise<{ status: "success" | "duplicate"; timeLabel: string }> {
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, check_in_at")
    .eq("session_id", params.sessionId)
    .eq("student_id", params.studentId)
    .maybeSingle();

  if (existing) {
    const dt = existing.check_in_at ? new Date(existing.check_in_at) : new Date();
    const timeLabel = `${String(dt.getHours()).padStart(2, "0")}.${String(dt.getMinutes()).padStart(2, "0")}`;
    return { status: "duplicate", timeLabel };
  }

  const now = new Date();
  const { error } = await supabase.from("attendance_records").insert({
    session_id: params.sessionId,
    student_id: params.studentId,
    check_in_at: now.toISOString(),
    status: "present",
  });

  if (error) {
    throw new Error(error.message);
  }

  const timeLabel = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`;
  return { status: "success", timeLabel };
}

export async function fetchSessionAttendees(sessionId: string): Promise<LiveAttendeeItem[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      id,
      student_id,
      check_in_at,
      status,
      profiles (
        full_name,
        student_number
      )
    `)
    .eq("session_id", sessionId)
    .order("check_in_at", { ascending: true });

  if (error || !data) return [];

  const tones: Array<"blue" | "emerald" | "amber" | "violet"> = ["blue", "emerald", "amber", "violet"];

  return data.map((row: any, idx: number) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const fullName = profile?.full_name || "Mahasiswa";
    const initials = fullName
      .split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const dt = row.check_in_at ? new Date(row.check_in_at) : new Date();
    const time = `${String(dt.getHours()).padStart(2, "0")}.${String(dt.getMinutes()).padStart(2, "0")}`;

    return {
      id: row.id,
      studentId: row.student_id,
      name: fullName,
      studentNumber: profile?.student_number || "-",
      initials,
      time,
      status: row.status === "late" ? "Terlambat" : "Hadir",
      tone: tones[idx % tones.length],
    };
  });
}

export async function fetchStudentAttendanceHistory(studentId: string): Promise<AttendanceHistoryItem[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      check_in_at,
      status,
      attendance_sessions (
        title,
        class_sections (
          section_name,
          courses (
            course_code,
            course_name
          )
        )
      )
    `)
    .eq("student_id", studentId)
    .order("check_in_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    const session = Array.isArray(row.attendance_sessions) ? row.attendance_sessions[0] : row.attendance_sessions;
    const section = session?.class_sections
      ? Array.isArray(session.class_sections)
        ? session.class_sections[0]
        : session.class_sections
      : null;
    const course = section?.courses
      ? Array.isArray(section.courses)
        ? section.courses[0]
        : section.courses
      : null;

    const dt = row.check_in_at ? new Date(row.check_in_at) : new Date();
    const dateStr = dt.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = `${String(dt.getHours()).padStart(2, "0")}.${String(dt.getMinutes()).padStart(2, "0")}`;

    return {
      date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
      course: course?.course_name || "Mata Kuliah",
      code: course?.course_code || "IF2140",
      time: timeStr,
      status: row.status === "late" ? "Terlambat" : "Hadir",
    };
  });
}

