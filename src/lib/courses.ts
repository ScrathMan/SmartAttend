import { supabase } from "./supabase";

export interface CourseScheduleItem {
  sectionId: string;
  courseId: string;
  code: string;
  name: string;
  sectionName: string;
  dayOfWeek: string;
  time: string;
  end: string;
  room: string;
  department: string;
  lecturerName: string;
  color: "blue" | "violet" | "amber";
  students: number;
  attended: number;
}

const COLOR_CYCLE: Array<"blue" | "violet" | "amber"> = ["blue", "violet", "amber"];

function formatTimeDot(raw: string | null | undefined, fallback: string) {
  if (!raw) return fallback;
  return raw.replace(":", ".");
}

export async function fetchStudentCourses(studentId: string): Promise<CourseScheduleItem[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      section_id,
      class_sections (
        id,
        section_name,
        day_of_week,
        start_time,
        end_time,
        room,
        profiles:lecturer_id (
          full_name
        ),
        courses (
          id,
          course_code,
          course_name,
          department
        )
      )
    `)
    .eq("student_id", studentId);

  if (error || !data) {
    console.error("Gagal memuat mata kuliah mahasiswa:", error?.message);
    return [];
  }

  return data
    .map((row: any, idx: number) => {
      const section = Array.isArray(row.class_sections) ? row.class_sections[0] : row.class_sections;
      const course = section?.courses
        ? Array.isArray(section.courses)
          ? section.courses[0]
          : section.courses
        : null;
      const lecturer = section?.profiles
        ? Array.isArray(section.profiles)
          ? section.profiles[0]
          : section.profiles
        : null;
      if (!section || !course) return null;

      const startFmt = formatTimeDot(section.start_time, "08.00");
      const endFmt = formatTimeDot(section.end_time, "09.40");
      const day = section.day_of_week || "Senin";
      const roomName = section.room || "FIK-LAB 301";

      return {
        sectionId: section.id,
        courseId: course.id,
        code: course.course_code,
        name: course.course_name,
        sectionName: section.section_name,
        dayOfWeek: day,
        time: startFmt,
        end: endFmt,
        room: `${day} • ${roomName} • ${section.section_name}`,
        department: course.department || "Informatika",
        lecturerName: lecturer?.full_name || "Dosen Pengampu",
        color: COLOR_CYCLE[idx % COLOR_CYCLE.length],
        students: 1,
        attended: 0,
      };
    })
    .filter(Boolean) as CourseScheduleItem[];
}

export async function fetchLecturerSections(lecturerId: string): Promise<CourseScheduleItem[]> {
  const { data, error } = await supabase
    .from("class_sections")
    .select(`
      id,
      section_name,
      day_of_week,
      start_time,
      end_time,
      room,
      courses (
        id,
        course_code,
        course_name,
        department
      ),
      enrollments ( count )
    `)
    .eq("lecturer_id", lecturerId);

  if (error || !data) {
    console.error("Gagal memuat kelas dosen:", error?.message);
    return [];
  }

  return data
    .map((section: any, idx: number) => {
      const course = section.courses
        ? Array.isArray(section.courses)
          ? section.courses[0]
          : section.courses
        : null;
      if (!course) return null;

      const startFmt = formatTimeDot(section.start_time, "08.00");
      const endFmt = formatTimeDot(section.end_time, "09.40");
      const day = section.day_of_week || "Senin";
      const roomName = section.room || "Lab Komputer";

      const studentCount = Array.isArray(section.enrollments) && section.enrollments[0]?.count != null
        ? Number(section.enrollments[0].count)
        : 0;

      return {
        sectionId: section.id,
        courseId: course.id,
        code: course.course_code,
        name: course.course_name,
        sectionName: section.section_name,
        dayOfWeek: day,
        time: `${day}, ${startFmt} – ${endFmt}`,
        end: endFmt,
        room: `${roomName} (${course.department || "Informatika"})`,
        department: course.department || "Informatika",
        lecturerName: "Anda",
        color: COLOR_CYCLE[idx % COLOR_CYCLE.length],
        students: studentCount,
        attended: 0,
      };
    })
    .filter(Boolean) as CourseScheduleItem[];
}

export async function fetchAllAvailableSections(): Promise<CourseScheduleItem[]> {
  const { data, error } = await supabase
    .from("class_sections")
    .select(`
      id,
      section_name,
      day_of_week,
      start_time,
      end_time,
      room,
      profiles:lecturer_id (
        full_name
      ),
      courses (
        id,
        course_code,
        course_name,
        department
      )
    `)
    .order("day_of_week", { ascending: true });

  if (error || !data) {
    console.error("Gagal memuat katalog kelas:", error?.message);
    return [];
  }

  return data
    .map((section: any, idx: number) => {
      const course = section.courses
        ? Array.isArray(section.courses)
          ? section.courses[0]
          : section.courses
        : null;
      const lecturer = section.profiles
        ? Array.isArray(section.profiles)
          ? section.profiles[0]
          : section.profiles
        : null;
      if (!course) return null;

      const startFmt = formatTimeDot(section.start_time, "08.00");
      const endFmt = formatTimeDot(section.end_time, "09.40");
      const day = section.day_of_week || "Senin";
      const roomName = section.room || "Ruang Kuliah";

      return {
        sectionId: section.id,
        courseId: course.id,
        code: course.course_code,
        name: course.course_name,
        sectionName: section.section_name,
        dayOfWeek: day,
        time: `${startFmt} – ${endFmt}`,
        end: endFmt,
        room: roomName,
        department: course.department || "Informatika",
        lecturerName: lecturer?.full_name || "Dosen Pengampu",
        color: COLOR_CYCLE[idx % COLOR_CYCLE.length],
        students: 0,
        attended: 0,
      };
    })
    .filter(Boolean) as CourseScheduleItem[];
}

export async function createCourseAndSection(params: {
  lecturerId: string;
  courseCode: string;
  courseName: string;
  department: string;
  sectionName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}) {
  const cleanCode = params.courseCode.trim().toUpperCase();
  const cleanName = params.courseName.trim();
  const cleanDept = params.department.trim() || "Informatika";

  let courseId: string | null = null;
  const { data: existingCourse } = await supabase
    .from("courses")
    .select("id")
    .eq("course_code", cleanCode)
    .maybeSingle();

  if (existingCourse?.id) {
    courseId = existingCourse.id;
  } else {
    const { data: newCourse, error: courseErr } = await supabase
      .from("courses")
      .insert({
        course_code: cleanCode,
        course_name: cleanName,
        department: cleanDept,
      })
      .select("id")
      .single();

    if (courseErr || !newCourse) {
      throw new Error(courseErr?.message || "Gagal membuat mata kuliah baru.");
    }
    courseId = newCourse.id;
  }

  const { error: secErr } = await supabase.from("class_sections").insert({
    course_id: courseId,
    lecturer_id: params.lecturerId,
    section_name: params.sectionName.trim() || "Kelas A",
    day_of_week: params.dayOfWeek,
    start_time: params.startTime,
    end_time: params.endTime,
    room: params.room.trim() || "FIK-LAB 301",
  });

  if (secErr) {
    throw new Error(secErr.message);
  }
}

export async function toggleStudentEnrollment(params: {
  studentId: string;
  sectionId: string;
  enroll: boolean;
}) {
  if (params.enroll) {
    const { error } = await supabase.from("enrollments").upsert(
      {
        student_id: params.studentId,
        section_id: params.sectionId,
      },
      { onConflict: "student_id,section_id" }
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("student_id", params.studentId)
      .eq("section_id", params.sectionId);
    if (error) throw new Error(error.message);
  }
}
