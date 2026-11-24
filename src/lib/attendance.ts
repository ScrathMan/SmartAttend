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
  qrExpiresAt?: string;
  status: string;
}

export interface LiveAttendeeItem {
  id: string;
  studentId: string;
  name: string;
  studentNumber: string;
  initials: string;
  time: string;
  status: "Hadir" | "Terlambat" | "Izin" | "Sakit" | "Dispensasi" | "Tidak hadir";
  tone: "blue" | "emerald" | "amber" | "violet";
}

export interface AttendanceHistoryItem {
  date: string;
  course: string;
  code: string;
  time: string;
  status: string;
}

export function generateDynamicToken(): string {
  return `SA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function createAttendanceSession(params: {
  sectionId: string;
  meetingNumber: string;
  startTime: string;
  endTime: string;
  sessionDate?: string;
}): Promise<ActiveSessionInfo> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const startsAt = new Date(`${yyyy}-${mm}-${dd}T${params.startTime}:00`).toISOString();
  const endsAt = new Date(`${yyyy}-${mm}-${dd}T${params.endTime}:00`).toISOString();
  const token = generateDynamicToken();
  const qrExpiresAt = new Date(Date.now() + 90 * 1000).toISOString();

  await supabase
    .from("attendance_sessions")
    .update({ status: "closed" })
    .eq("section_id", params.sectionId)
    .eq("status", "open");

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      section_id: params.sectionId,
      title: `Pertemuan ${params.meetingNumber}`,
      starts_at: startsAt,
      ends_at: endsAt,
      qr_token_hash: token,
      qr_expires_at: qrExpiresAt,
      status: "open",
    })
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
    qrExpiresAt: data.qr_expires_at || qrExpiresAt,
    status: data.status,
  };
}

export async function rotateSessionQrToken(
  sessionId: string,
  ttlSeconds = 90
): Promise<{ token: string; expiresAt: string } | null> {
  const newToken = generateDynamicToken();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from("attendance_sessions")
    .update({
      qr_token_hash: newToken,
      qr_expires_at: expiresAt,
    })
    .eq("id", sessionId)
    .select("qr_token_hash, qr_expires_at")
    .maybeSingle();

  if (error || !data) return null;
  return {
    token: data.qr_token_hash,
    expiresAt: data.qr_expires_at,
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
    .eq("status", "open").gt("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
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
    qrExpiresAt: row.qr_expires_at || undefined,
    status: row.status,
  };
}

export async function closeAttendanceSession(sessionId: string): Promise<void> {
  const { data: sess } = await supabase
    .from("attendance_sessions")
    .update({ status: "closed" })
    .eq("id", sessionId)
    .select("section_id")
    .maybeSingle();

  if (sess?.section_id) {
    const [{ data: enrolled }, { data: existingRecs }] = await Promise.all([
      supabase.from("enrollments").select("student_id").eq("section_id", sess.section_id),
      supabase.from("attendance_records").select("student_id").eq("session_id", sessionId),
    ]);

    const recordedIds = new Set((existingRecs || []).map((r: any) => r.student_id));
    const missingRows = (enrolled || [])
      .filter((e: any) => e.student_id && !recordedIds.has(e.student_id))
      .map((e: any) => ({
        session_id: sessionId,
        student_id: e.student_id,
        check_in_at: new Date().toISOString(),
        status: "absent",
      }));

    if (missingRows.length > 0) {
      await supabase.from("attendance_records").insert(missingRows);
    }
  }
}

export async function submitStudentCheckIn(params: {
  sessionId: string;
  studentId: string;
  startsAt?: string;
}): Promise<{ status: "success" | "duplicate"; attendanceLabel: "Hadir" | "Terlambat"; timeLabel: string }> {
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, check_in_at, status")
    .eq("session_id", params.sessionId)
    .eq("student_id", params.studentId)
    .maybeSingle();

  if (existing) {
    const dt = existing.check_in_at ? new Date(existing.check_in_at) : new Date();
    const timeLabel = `${String(dt.getHours()).padStart(2, "0")}.${String(dt.getMinutes()).padStart(2, "0")}`;
    return {
      status: "duplicate",
      attendanceLabel: existing.status === "late" ? "Terlambat" : "Hadir",
      timeLabel,
    };
  }

  const now = new Date();
  let isLate = false;
  if (params.startsAt) {
    const startMs = new Date(params.startsAt).getTime();
    if (!Number.isNaN(startMs) && now.getTime() - startMs > 15 * 60 * 1000) {
      isLate = true;
    }
  }

  const { error } = await supabase.from("attendance_records").insert({
    session_id: params.sessionId,
    student_id: params.studentId,
    check_in_at: now.toISOString(),
    status: isLate ? "late" : "present",
  });

  if (error) {
    throw new Error(error.message);
  }

  const timeLabel = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    status: "success",
    attendanceLabel: isLate ? "Terlambat" : "Hadir",
    timeLabel,
  };
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
      status: row.status === "late" ? "Terlambat" : row.status === "excused" ? "Izin" : row.status === "sick" ? "Sakit" : row.status === "dispensation" ? "Dispensasi" : "Hadir",
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

  const recordItems: AttendanceHistoryItem[] = (!error && data ? data : []).map((row: any) => {
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
    const timeStr = row.status === "absent"
      ? "—"
      : `${String(dt.getHours()).padStart(2, "0")}.${String(dt.getMinutes()).padStart(2, "0")}`;

    return {
      date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
      course: course?.course_name || "Mata Kuliah",
      code: course?.course_code || "IF2140",
      time: timeStr,
      status:
        row.status === "late"
          ? "Terlambat"
          : row.status === "excused"
          ? "Izin"
          : row.status === "sick"
          ? "Sakit"
          : row.status === "dispensation"
          ? "Dispensasi"
          : row.status === "absent"
          ? "Tidak hadir"
          : "Hadir",
    };
  });

  // Gabungkan pengajuan izin/sakit/dispensasi yang sudah Disetujui dosen
  const { data: approvedLeaves } = await supabase
    .from("leave_requests")
    .select(`
      absence_date,
      reason,
      status,
      class_sections (
        courses (
          course_code,
          course_name
        )
      )
    `)
    .eq("student_id", studentId)
    .eq("status", "Disetujui")
    .order("absence_date", { ascending: false });

  const existingKeys = new Set(recordItems.map((r) => `${r.date}__${r.code}`));
  const leaveItems: AttendanceHistoryItem[] = [];

  for (const lv of approvedLeaves || []) {
    const section = Array.isArray(lv.class_sections) ? lv.class_sections[0] : lv.class_sections;
    const course = section?.courses
      ? Array.isArray(section.courses)
        ? section.courses[0]
        : section.courses
      : null;
    const code = course?.course_code || "IF2140";
    const dt = lv.absence_date ? new Date(`${lv.absence_date}T08:00:00`) : new Date();
    const rawDate = dt.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
    const key = `${formattedDate}__${code}`;
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      leaveItems.push({
        date: formattedDate,
        course: course?.course_name || "Mata Kuliah",
        code,
        time: "—",
        status: lv.reason === "Sakit" ? "Sakit" : lv.reason === "Dispensasi" ? "Dispensasi" : "Izin",
      });
    }
  }

  return [...recordItems, ...leaveItems];
}






export interface SemesterStudentRow {
  studentId: string;
  studentNumber: string;
  name: string;
  meetings: Record<number, "H" | "T" | "I" | "S" | "D" | "A" | "-">;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  dispensasi: number;
  alpha: number;
  points: number;
  percentage: number;
}

export interface SemesterRecapResult {
  completedMeetings: number[];
  rows: SemesterStudentRow[];
}

export async function fetchSemesterRecapMatrix(sectionId: string): Promise<SemesterRecapResult> {
  if (!sectionId) return { completedMeetings: [], rows: [] };

  const [enrollRes, sessionRes, leaveRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select(`
        student_id,
        profiles:student_id (
          id,
          full_name,
          student_number
        )
      `)
      .eq("section_id", sectionId),
    supabase
      .from("attendance_sessions")
      .select("id, title, starts_at, status")
      .eq("section_id", sectionId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("leave_requests")
      .select("student_id, absence_date, reason, description, status")
      .eq("section_id", sectionId)
      .eq("status", "Disetujui"),
  ]);

  const enrollments = enrollRes.data || [];
  const sessions = sessionRes.data || [];
  const approvedLeaves = leaveRes.data || [];

  const sessionIds = sessions.map((s: any) => s.id);
  let records: any[] = [];
  if (sessionIds.length > 0) {
    const { data: recData } = await supabase
      .from("attendance_records")
      .select("session_id, student_id, status")
      .in("session_id", sessionIds);
    records = recData || [];
  }

  // Petakan setiap session ke nomor pertemuan 1..16 (prioritaskan sesi aktif / terbaru bila ada duplikat pertemuan)
  const meetingSessionMap = new Map<number, any>();
  const meetingAllSessions = new Map<number, any[]>();
  sessions.forEach((s: any, idx: number) => {
    const match = String(s.title || "").match(/(\d+)/);
    const num = match ? Math.min(16, Math.max(1, Number(match[1]))) : Math.min(16, idx + 1);
    const list = meetingAllSessions.get(num) || [];
    list.push(s);
    meetingAllSessions.set(num, list);
    const existing = meetingSessionMap.get(num);
    if (!existing || s.status === "active" || existing.status !== "active") {
      meetingSessionMap.set(num, s);
    }
  });

  const completedMeetings = Array.from(meetingSessionMap.keys()).sort((a, b) => a - b);

  const studentMap = new Map<string, { studentId: string; studentNumber: string; name: string }>();
  for (const en of enrollments as any[]) {
    const prof = Array.isArray(en.profiles) ? en.profiles[0] : en.profiles;
    if (en.student_id) {
      studentMap.set(en.student_id, {
        studentId: en.student_id,
        studentNumber: prof?.student_number || "-",
        name: prof?.full_name || "Mahasiswa",
      });
    }
  }

  const rows: SemesterStudentRow[] = Array.from(studentMap.values())
    .sort((a, b) => a.studentNumber.localeCompare(b.studentNumber))
    .map((st) => {
      const meetings: Record<number, "H" | "T" | "I" | "S" | "D" | "A" | "-"> = {};
      const usedLeaveIdx = new Set<number>();
      let hadir = 0;
      let terlambat = 0;
      let izin = 0;
      let sakit = 0;
      let dispensasi = 0;
      let alpha = 0;
      let countedMeetings = 0;

      for (let m = 1; m <= 16; m++) {
        const sess = meetingSessionMap.get(m);
        if (!sess) {
          meetings[m] = "-";
          continue;
        }

        const sameMeetingSessionIds = new Set((meetingAllSessions.get(m) || [sess]).map((x: any) => x.id));
        const matchingRecs = records.filter((r: any) => sameMeetingSessionIds.has(r.session_id) && r.student_id === st.studentId);
        const rec =
          matchingRecs.find((r: any) => r.status === "sick" || r.status === "dispensation" || r.status === "excused") ||
          matchingRecs.find((r: any) => r.status === "present" || r.status === "late") ||
          matchingRecs.find((r: any) => r.session_id === sess.id) ||
          matchingRecs[0];
        const sessDate = sess.starts_at ? String(sess.starts_at).slice(0, 10) : "";
        let code: "H" | "T" | "I" | "S" | "D" | "A" | "-" =
          sess.status === "active" ? "-" : "A";

        const leaveIdx = approvedLeaves.findIndex((lv: any, idx: number) => {
          if (usedLeaveIdx.has(idx) || lv.student_id !== st.studentId) return false;
          const descMatch = String(lv.description || "").match(/Pertemuan\s*(\d+)/i);
          if (descMatch) return Number(descMatch[1]) === m;
          return Boolean(sessDate && String(lv.absence_date).slice(0, 10) === sessDate);
        });

        if (leaveIdx >= 0) {
          usedLeaveIdx.add(leaveIdx);
          const leave = approvedLeaves[leaveIdx];
          if (leave.reason === "Sakit") code = "S";
          else if (leave.reason === "Dispensasi") code = "D";
          else code = "I";
        } else if (rec) {
          if (rec.status === "absent") code = "A";
          else if (rec.status === "late") code = "T";
          else if (rec.status === "sick") code = "S";
          else if (rec.status === "dispensation") code = "D";
          else if (rec.status === "excused") code = "I";
          else code = "H";
        }

        meetings[m] = code;
        if (code === "-") continue;
        countedMeetings++;
        if (code === "H") hadir++;
        else if (code === "T") terlambat++;
        else if (code === "I") izin++;
        else if (code === "S") sakit++;
        else if (code === "D") dispensasi++;
        else alpha++;
      }

      const totalHeld = countedMeetings;
      const points = Number(
        (hadir * 1.0 + sakit * 1.0 + dispensasi * 1.0 + izin * 0.75 + terlambat * 0.5 + alpha * 0).toFixed(2)
      );
      const percentage = totalHeld > 0 ? Math.min(100, Math.round((points / totalHeld) * 100)) : 0;

      return {
        studentId: st.studentId,
        studentNumber: st.studentNumber,
        name: st.name,
        meetings,
        hadir,
        terlambat,
        izin,
        sakit,
        dispensasi,
        alpha,
        points,
        percentage,
      };
    });

  return { completedMeetings, rows };
}








