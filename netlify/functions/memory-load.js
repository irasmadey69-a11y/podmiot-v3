exports.handler = async function () {
  try {
    const supabaseUrl = "https://rrlzfuolvwgkykjbjbcpt.supabase.co";
    const key = process.env.SUPABASE_ANON_KEY;

    if (!key) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          stage: "env",
          error: "Brak SUPABASE_ANON_KEY w Netlify"
        })
      };
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

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: res.ok,
        stage: "fetch",
        status: res.status,
        url,
        keyFound: !!key,
        keyStart: key.slice(0, 12),
        responseText: text
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        stage: "catch",
        error: err?.message || "unknown error"
      })
    };
  }
};
