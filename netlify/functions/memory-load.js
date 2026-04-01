export default async () => {
  try {
    const url = "https://rrlzfuolvwgkykjbjbcpt.supabase.co/rest/v1/memory?select=*";
    const key = process.env.SUPABASE_ANON_KEY;

    if (!key) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: "env",
          error: "Brak SUPABASE_ANON_KEY w Netlify"
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const url = `${supabaseUrl}/rest/v1/memory?select=*`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      }
    });

    const text = await res.text();

    return new Response(
      JSON.stringify({
        ok: res.ok,
        stage: "fetch",
        status: res.status,
        url,
        keyFound: !!key,
        keyStart: key.slice(0, 12),
        responseText: text
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
        stage: "catch",
        error: err?.message || "unknown error"
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
};
