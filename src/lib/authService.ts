// Supabase
import { supabase } from "./supabase";

// signOut | encerra a sessão autenticada no supabase
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
