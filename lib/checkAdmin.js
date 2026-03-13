import { supabase } from "./supabaseClient";

export async function checkAdmin() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return false;

  const email = userData.user.email;

  const { data } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .single();

  return !!data;
}
