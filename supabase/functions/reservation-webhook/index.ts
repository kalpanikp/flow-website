import { createClient } from "npm:@supabase/supabase-js@2";

type ReservationPayload = {
  name?: unknown;
  phone?: unknown;
  guests?: unknown;
  reservation_date?: unknown;
  reservation_time?: unknown;
  special_notes?: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function asRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function asGuests(value: unknown) {
  const guests = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(guests) || guests < 1) {
    throw new Error("guests must be a positive integer");
  }

  return guests;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ success: false, error: "Supabase server credentials are not configured" }, 500);
  }

  let payload: ReservationPayload;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  let reservation;

  try {
    reservation = {
      name: asRequiredString(payload.name, "name"),
      phone: asRequiredString(payload.phone, "phone"),
      guests: asGuests(payload.guests),
      reservation_date: asRequiredString(payload.reservation_date, "reservation_date"),
      reservation_time: asRequiredString(payload.reservation_time, "reservation_time"),
      special_notes: typeof payload.special_notes === "string" ? payload.special_notes.trim() : null,
      status: "pending",
    };
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Invalid reservation payload",
    }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase
    .from("reservations")
    .insert(reservation);

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }

  return jsonResponse({ success: true });
});
