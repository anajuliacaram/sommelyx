// Patch: StorageKey is referenced in the auto-generated client.ts but not exported
// by the installed @supabase/supabase-js version. This declaration satisfies TS.
declare module "@supabase/supabase-js" {
  export type StorageKey = string;
}
