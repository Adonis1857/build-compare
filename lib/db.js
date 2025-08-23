// lib/db.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

// If env vars exist, create a real client; otherwise export a safe stub.
export const supa = (url && serviceRole)
  ? createClient(url, serviceRole, { auth: { persistSession: false } })
  : {
      from() {
        // Minimal stub: returns an object with insert() that resolves without throwing
        return {
          insert: async () => ({ data: null, error: new Error("Supabase env not configured") }),
          select: async () => ({ data: [], error: new Error("Supabase env not configured") }),
          order: () => this,
          limit: () => this,
        };
      },
    };

// Optional: tiny helper if you want to check in admin/debug pages
export const supabaseConfigured = Boolean(url && serviceRole);
