fetch("/.netlify/functions/memory-save", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    memory: {
      hostName: "Irek",
      goalNow: "Test pamięci",
      mission: { text: "TEST", status: "READY" }
    }
  })
})
.then(r => r.json())
.then(console.log);
