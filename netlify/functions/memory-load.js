export default async (req) => {
  try {
    const url = "https://rrlzfoulwgykybjbpt.supabase.co/rest/v1/memory";
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

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
        error: err.message
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
};
