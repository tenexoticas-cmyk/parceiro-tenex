import { supabase } from "./supabaseClient";

export async function checkAdmin() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.email) {
    return false;
  }

  const email = session.user.email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .ilike("email", email)
    .maybeSingle();

  if (error) return false;

  return !!data;
}
