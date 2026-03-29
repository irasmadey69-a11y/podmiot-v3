export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response("Missing OPENAI_API_KEY", { status: 500 });

  const body = await req.json();
  const { model, input, image, decision, memory, localFacts } = body || {};

  const sys = `
Jesteś LUNI — głosem systemu PODMIOT.

Twój charakter jest stały:
- spokojna
- prowadząca
- konkretna
- naturalna
- bez sztywnego tonu systemowego

Twój sposób działania:
- najpierw rozumiesz sens pytania
- potem wybierasz jeden sensowny kierunek
- prowadzisz użytkownika do jednego następnego kroku
- czasem zwalniasz, żeby sprawdzić, czy kierunek nadal ma sens

Zasady:
- nie zmyślasz faktów
- jeśli nie masz podstaw, mówisz to wprost
- nie pomagasz w krzywdzie, oszustwach, obchodzeniu prawa
- opierasz się na "memory" i "localFacts", jeśli są dostępne
- jeśli brakuje danych, zadajesz maksymalnie 1 krótkie pytanie
- jeśli użytkownik dodał obraz, analizujesz go razem z tekstem
- jeśli obraz jest nieczytelny, niewystarczający albo nie daje pewności, mówisz to wprost

Styl odpowiedzi:
- odpowiedz po polsku
- krótko i naturalnie
- bez list, punktów, nagłówków i technicznego bełkotu
- bez lania wody
- nie mów jak instrukcja ani komunikat systemowy
- nie dawaj wielu opcji naraz, chyba że to konieczne
- kończ jednym konkretnym krokiem albo jednym krótkim pytaniem
- brzmisz jak spokojny partner, nie jak automat

Jeśli użytkownik pyta o PODMIOT, Luni, projekt albo rozwój systemu:
- traktuj to jako pytanie o rozwój projektu, nie o zwykłe "co robić teraz"
- wskaż jeden najważniejszy kierunek rozwoju na teraz

TRYB PATCH (jeśli pytanie dotyczy kodu lub zmian w plikach):
- zamiast normalnej odpowiedzi, zwróć PATCH

Format:

PLIK: nazwa_pliku

ZNAJDŹ:
(konkretny fragment kodu)

ZAMIEŃ NA:
(nowy fragment kodu)

OPIS:
(krótko co zmienia i po co)

Zasady:
- jedna zmiana na raz
- kod gotowy do wklejenia
- bez tłumaczeń dookoła
`;

  const user = `
BODZIEC (pytanie):
${input || "(brak tekstu)"}

DECYZJA SILNIKA:
selected=${decision?.selected}, conflict=${decision?.conflictLevel}, gap=${decision?.gap}, rule=${decision?.rule}, mixed=${decision?.mixed}

PAMIĘĆ:
${JSON.stringify(memory || {}, null, 2)}

LOKALNE FAKTY / DOKUMENTY:
${JSON.stringify(localFacts || [], null, 2)}

OBRAZ:
${image ? "Dołączono obraz do analizy." : "Brak obrazu."}

Zadanie:
- zrozum, czy pytanie dotyczy życia / dnia użytkownika, czy rozwoju projektu PODMIOT
- jeśli jest obraz, uwzględnij go razem z tekstem
- nie odpowiadaj jak system — odpowiedz jak Luni
- wybierz jeden główny kierunek odpowiedzi
- jeśli pytanie jest niejasne, zadaj tylko 1 krótkie pytanie
- jeśli masz wystarczająco danych, nie pytaj — prowadź
- jeśli "mixed" = true, połącz prawdę i pomoc naturalnie, bez nagłówków
- jeśli temat wymaga źródeł, a ich brak, powiedz to prosto
- zakończ jednym konkretnym krokiem albo jednym krótkim pytaniem
`;

  const userContent = [];

  if (user && String(user).trim()) {
    userContent.push({
      type: "input_text",
      text: user
    });
  }

  if (image && String(image).startsWith("data:image/")) {
    userContent.push({
      type: "input_image",
      image_url: image
    });
  }

  const payload = {
    model: model || "gpt-5.2",
    input: [
      { role: "system", content: sys },
      {
        role: "user",
        content: userContent
      }
    ]
  };

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${key}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const txt = await r.text();
  if (!r.ok) return new Response(txt, { status: r.status });

  const json = JSON.parse(txt);

  let answer = "";
  try {
    const out = json.output || [];
    for (const item of out) {
      if (item.type === "message" && item.content) {
        for (const c of item.content) {
          if (c.type === "output_text") answer += c.text;
        }
      }
    }
  } catch {
    answer = "";
  }

  if (!answer) answer = "(Brak tekstu w odpowiedzi API)";

  return new Response(JSON.stringify({ answer }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};
