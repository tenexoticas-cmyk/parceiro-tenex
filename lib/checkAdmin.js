import { supabase } from "./supabaseClient";

export async function checkAdmin() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const email = user.email.toLowerCase();

  const { data } = await supabase
    .from("admins")
    .select("*")
    .ilike("email", email)
    .single();

  return !!data;
}
