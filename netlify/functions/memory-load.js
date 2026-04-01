export default async (req) => {
  try {
    const url = "https://rrlzfuolvwgkykjbjbcpt.supabase.co/rest/v1/memory?select=*";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const text = await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: res.status,
          error: "Supabase response not ok",
          details: text
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" }
        }
      );
    }

    let data = [];
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data
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
        error: err?.message || "fetch failed"
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
};
