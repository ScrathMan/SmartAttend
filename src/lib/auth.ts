import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  full_name: string;
  student_number: string | null;
  role: "student" | "lecturer";
  department?: string | null;
}

export async function signInWithSupabase(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Data pengguna tidak ditemukan.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, student_number, role, department")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error("Profil pengguna belum terdaftar di database.");
  }

  return profile as UserProfile;
}

export async function signUpWithSupabase(params: {
  fullName: string;
  studentNumber: string;
  role: "student" | "lecturer";
  department: string;
  email: string;
  password: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: {
        full_name: params.fullName.trim(),
        role: params.role,
        student_number: params.studentNumber.trim(),
        department: params.department.trim(),
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Pendaftaran gagal membuat akun pengguna.");
  }

  const profilePayload = {
    id: data.user.id,
    full_name: params.fullName.trim(),
    student_number: params.studentNumber.trim() || null,
    role: params.role,
    department: params.department.trim() || "Informatika",
  };

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (upsertError) {
    throw new Error(`Akun dibuat, tetapi gagal menyimpan profil: ${upsertError.message}`);
  }

  if (!data.session) {
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: params.email.trim(),
      password: params.password,
    });
    if (loginErr) {
      throw new Error("Akun berhasil dibuat! Silakan matikan 'Confirm email' di Supabase Auth atau cek email untuk masuk.");
    }
  }

  return profilePayload as UserProfile;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_number, role, department")
    .eq("id", user.id)
    .single();

  return (profile as UserProfile) ?? null;
}

export async function signOutFromSupabase() {
  await supabase.auth.signOut();
}
