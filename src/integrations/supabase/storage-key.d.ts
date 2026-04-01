// Patch: StorageKey is referenced in the auto-generated client.ts but not exported
// by the installed @supabase/supabase-js version. This augmentation adds it.
import "@supabase/supabase-js";

declare module "@supabase/supabase-js" {
  export type StorageKey = string;
}
