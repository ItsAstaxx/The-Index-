// ============================================================
// THE INDEX — site config
// Fill these in after you set up Supabase (see README.md).
// ============================================================

const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// The shelves (categories) sites can be filed under.
// id = stored in the database, label = shown in the UI.
const CATEGORIES = [
  { id: "tools",     label: "Tools" },
  { id: "learning",  label: "Learning" },
  { id: "design",    label: "Design" },
  { id: "dev",       label: "Dev" },
  { id: "writing",   label: "Writing" },
  { id: "misc",      label: "Misc" },
];
