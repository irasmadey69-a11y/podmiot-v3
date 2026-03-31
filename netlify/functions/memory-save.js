export default async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Method Not Allowed"
      }),
      {
        status: 405,
        headers: { "content-type": "application/json" }
      }
    );
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w env"
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const body = await req.json();
    const memory = body?.memory;

    if (!memory || typeof memory !== "object") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Brak poprawnego pola memory"
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const rows = Object.entries(memory).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : JSON.stringify(value)
    }));

    if (!rows.length) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Brak danych do zapisania"
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/memory`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "prefer": "return=representation"
      },
      body: JSON.stringify(rows)
    });

    const text = await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Supabase insert failed",
          details: text
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" }
        }
      );
    }

    let inserted = [];
    try {
      inserted = JSON.parse(text);
    } catch {
      inserted = [];
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Pamięć zapisana do Supabase",
        insertedCount: inserted.length,
        insertedKeys: rows.map(r => r.key)
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Błąd podczas zapisu pamięci"
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
};
