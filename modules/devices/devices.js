// modules/devices/devices.js

export async function sendDeviceAction(device, action, payload = {}) {
  const res = await fetch("/.netlify/functions/devices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      device,
      action,
      payload
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Błąd sterowania urządzeniem.");
  }

  return data;
}

export async function listDevices() {
  const res = await fetch("/.netlify/functions/devices?action=list", {
    method: "GET"
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Nie udało się pobrać listy urządzeń.");
  }

  return data.devices || [];
}