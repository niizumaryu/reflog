// Shared client-side character limits for free-text fields across the app.
// These mirror the DB-side CHECK constraints in
// supabase/migrations/20260717_add_text_length_constraints.sql — keep the
// two in sync if either changes. Short fields (names, titles, places) use
// SHORT_TEXT_MAX; long free-form fields (memos, reflections) use
// LONG_TEXT_MAX.
export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 2000;
export const URL_MAX = 2000;
