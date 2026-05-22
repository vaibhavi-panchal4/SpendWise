import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jjohwxzlzmxotewryebp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb2h3eHpsem14b3Rld3J5ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mjk1MjMsImV4cCI6MjA5NTAwNTUyM30.8znfuAEYyiAhI-JuA1tNYAts-NLg7nEtFG5jUaTLOZw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
