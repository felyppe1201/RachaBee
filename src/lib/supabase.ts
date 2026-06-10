// Supabase
import { createClient } from "@supabase/supabase-js";

// AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

// supabase | Cliente autenticado com sessão persistida no AsyncStorage
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)