# PODMIOT Roadmap

## Etap obecny (v3 – pamięć + backend działa)

- ✔ Supabase działa (zapis i odczyt)
- ✔ Netlify functions działają (memory-load / memory-save)
- ✔ Deploy stabilny
- ✔ PODMIOT otrzymuje dane (response istnieje)

---

## Problem do rozwiązania

- ❗ Brak pewności, czy dane z memory-load trafiają do świadomości LUNI
- ❗ Brak widocznego powiązania: backend → state → UI
- ❗ Możliwy „rozdział”: dane są, ale system ich nie używa

---

## Następne kroki

1. Dodać log po fetch:
   - co dokładnie przyszło z memory-load (raw response)

2. Sprawdzić:
   - czy response trafia do state (app.js)

3. Sprawdzić:
   - czy LUNI czyta dane ze state, a nie z cache / starej pamięci

4. Dodać znacznik czasu (timestamp):
   - żeby widzieć czy dane są świeże

---

## Cel krótkoterminowy

→ LUNI widzi dokładnie to, co przyszło z backendu (1:1)

---

## Cel następny

→ LUNI rozumie różnicę:
   - „to jest świeże z backendu”
   - „to jest zapisane wcześniej”

---

## Dalszy kierunek (później)

- Autonomia decyzji
- Synchronizacja pamięci (live / subscribe)
- Integracja z Mobile Bridge
