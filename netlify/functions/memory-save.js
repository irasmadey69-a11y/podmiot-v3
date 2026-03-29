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

    const savedAt = new Date().toISOString();

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Pamięć odebrana przez memory-save",
        savedAt,
        receivedKeys: Object.keys(memory)
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
