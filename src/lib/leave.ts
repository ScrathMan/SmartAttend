import { supabase } from "./supabase";

export interface DbLeaveRequest {
  id: string;
  student: string;
  studentId: string;
  course: string;
  code: string;
  group: string;
  absenceDate: string;
  reason: "Sakit" | "Izin" | "Dispensasi";
  description: string;
  attachment?: string;
  submittedAt: string;
  status: "Menunggu Persetujuan" | "Disetujui" | "Ditolak";
  lecturerNote?: string;
}

function mapRow(row: any): DbLeaveRequest {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const section = Array.isArray(row.class_sections) ? row.class_sections[0] : row.class_sections;
  const course = section?.courses
    ? Array.isArray(section.courses)
      ? section.courses[0]
      : section.courses
    : null;

  const created = row.created_at ? new Date(row.created_at) : new Date();
  const submittedAt = created.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: row.id,
    student: profile?.full_name || "Mahasiswa",
    studentId: profile?.student_number || "-",
    course: course?.course_name || "Mata Kuliah",
    code: course?.course_code || "IF2140",
    group: section?.section_name || "Kelas A",
    absenceDate: row.absence_date,
    reason: row.reason,
    description: row.description,
    attachment: row.attachment || undefined,
    submittedAt,
    status: row.status,
    lecturerNote: row.lecturer_note || undefined,
  };
}

const SELECT_LEAVE_QUERY = `
  id,
  absence_date,
  reason,
  description,
  attachment,
  status,
  lecturer_note,
  created_at,
  profiles:student_id (
    full_name,
    student_number
  ),
  class_sections:section_id (
    section_name,
    courses (
      course_code,
      course_name
    )
  )
`;

export async function fetchStudentLeaveRequests(studentId: string): Promise<DbLeaveRequest[]> {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(SELECT_LEAVE_QUERY)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapRow);
}

export async function fetchLecturerLeaveRequests(sectionIds: string[]): Promise<DbLeaveRequest[]> {
  if (sectionIds.length === 0) return [];
  const { data, error } = await supabase
    .from("leave_requests")
    .select(SELECT_LEAVE_QUERY)
    .in("section_id", sectionIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapRow);
}

export async function createLeaveRequestInDb(params: {
  studentId: string;
  sectionId: string;
  absenceDate: string;
  reason: string;
  description: string;
  attachment?: string;
}): Promise<DbLeaveRequest> {
  const normalizedReason: "Sakit" | "Izin" | "Dispensasi" =
    params.reason === "Sakit"
      ? "Sakit"
      : params.reason === "Dispensasi"
      ? "Dispensasi"
      : "Izin";

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      student_id: params.studentId,
      section_id: params.sectionId,
      absence_date: params.absenceDate,
      reason: normalizedReason,
      description: params.description || `Alasan: ${params.reason}`,
      attachment: params.attachment || null,
      status: "Menunggu Persetujuan",
    })
    .select(SELECT_LEAVE_QUERY)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Gagal mengirim pengajuan izin.");
  }
  return mapRow(data);
}

export async function decideLeaveRequestInDb(params: {
  id: string;
  lecturerId: string;
  status: "Disetujui" | "Ditolak";
  lecturerNote: string;
}): Promise<void> {
  const { data: leaveRow, error } = await supabase
    .from("leave_requests")
    .update({
      status: params.status,
      lecturer_note: params.lecturerNote,
      decided_by: params.lecturerId,
    })
    .eq("id", params.id)
    .select("student_id, section_id, absence_date, reason")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (params.status === "Disetujui" && leaveRow?.student_id && leaveRow?.section_id) {
    const dbStatus = leaveRow.reason === "Sakit" ? "sick" : leaveRow.reason === "Dispensasi" ? "dispensation" : "excused";
    const { data: fullLeave } = await supabase
      .from("leave_requests")
      .select("description")
      .eq("id", params.id)
      .maybeSingle();
    const descMatch = String(fullLeave?.description || "").match(/Pertemuan\s*(\d+)/i);
    const targetMeetingNum = descMatch ? Number(descMatch[1]) : null;

    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id, title, starts_at, status")
      .eq("section_id", leaveRow.section_id)
      .order("starts_at", { ascending: false })
      .limit(20);

    let targetSessionId: string | null = null;
    if (sessions && sessions.length > 0) {
      const byMeeting = targetMeetingNum
        ? sessions.find((s: any) => {
            const m = String(s.title || "").match(/(\d+)/);
            return m && Number(m[1]) === targetMeetingNum;
          })
        : undefined;
      const sameDate = sessions.find(
        (s: any) => s.starts_at && String(s.starts_at).slice(0, 10) === String(leaveRow.absence_date).slice(0, 10)
      );
      const activeSession = sessions.find((s: any) => s.status === "active" || s.status === "open");
      const chosen = byMeeting || sameDate || activeSession || sessions[0];
      targetSessionId = chosen.id;
    }

    if (targetSessionId) {
      const { data: existingRec } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("session_id", targetSessionId)
        .eq("student_id", leaveRow.student_id)
        .maybeSingle();

      if (existingRec?.id) {
        await supabase
          .from("attendance_records")
          .update({ status: dbStatus })
          .eq("id", existingRec.id);
      } else {
        await supabase.from("attendance_records").insert({
          session_id: targetSessionId,
          student_id: leaveRow.student_id,
          check_in_at: new Date().toISOString(),
          status: dbStatus,
        });
      }
    }
  }
}




