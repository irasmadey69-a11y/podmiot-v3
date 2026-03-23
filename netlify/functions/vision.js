export async function handler(event) {

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {

    const body = JSON.parse(event.body || "{}");
    const image = body.image;

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Brak obrazu" })
      };
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "system",
              content: "Opisz krótko co jest na obrazie oraz odczytaj widoczny tekst (OCR). Odpowiedź po polsku."
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Co jest na tym obrazie?"
                },
                {
                  type: "input_image",
                  image_url: image
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    let text = "Nie udało się przeanalizować obrazu.";

    try {
      const out = data.output || [];
      for (const item of out) {
        if (item.type === "message") {
          for (const c of item.content) {
            if (c.type === "output_text") {
              text += c.text;
            }
          }
        }
      }
    } catch {}

    return {
      statusCode: 200,
      body: JSON.stringify({
        result: text
      })
    };

  } catch (err) {

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };

  }
}