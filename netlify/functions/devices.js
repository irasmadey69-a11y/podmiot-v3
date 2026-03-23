// netlify/functions/devices.js

let deviceStates = {
  test_device: "off"
};

export async function handler(event) {
  try {
    const method = event.httpMethod;

    if (method === "GET") {
      const action = event.queryStringParameters?.action || "";

      if (action === "list") {
        return jsonResponse(200, {
          ok: true,
          devices: [
            {
              id: "test_device",
              name: "Urządzenie testowe",
              type: "switch",
              state: deviceStates.test_device
            }
          ]
        });
      }

      return jsonResponse(400, {
        error: "Nieznana akcja GET."
      });
    }

    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { device, action } = body;

      if (!device || !action) {
        return jsonResponse(400, {
          error: "Brak device lub action."
        });
      }

      if (device !== "test_device") {
        return jsonResponse(404, {
          error: "Nie znaleziono urządzenia."
        });
      }

      if (action === "on") {
        deviceStates.test_device = "on";
        return jsonResponse(200, {
          ok: true,
          device: "test_device",
          state: "on",
          message: "Urządzenie testowe zostało włączone."
        });
      }

      if (action === "off") {
        deviceStates.test_device = "off";
        return jsonResponse(200, {
          ok: true,
          device: "test_device",
          state: "off",
          message: "Urządzenie testowe zostało wyłączone."
        });
      }

      return jsonResponse(400, {
        error: "Nieznana akcja urządzenia."
      });
    }

    return jsonResponse(405, {
      error: "Metoda niedozwolona."
    });
  } catch (err) {
    return jsonResponse(500, {
      error: err.message || "Błąd serwera devices."
    });
  }
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  };
}