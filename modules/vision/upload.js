// modules/vision/upload.js

export function loadImageToCanvas(file, canvasElementId = "visionCanvas") {
  const canvas = document.getElementById(canvasElementId);

  if (!file || !canvas) {
    console.error("Brak pliku albo canvas nie istnieje.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const img = new Image();

    img.onload = () => {
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };

    img.src = reader.result;
  };

  reader.readAsDataURL(file);
}