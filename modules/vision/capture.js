// modules/vision/capture.js

export function capturePhotoFromVideo(
  videoElementId = "visionVideo",
  canvasElementId = "visionCanvas"
) {
  const video = document.getElementById(videoElementId);
  const canvas = document.getElementById(canvasElementId);

  if (!video || !canvas) {
    console.error("Brak video albo canvas.");
    return false;
  }

  if (!video.videoWidth || !video.videoHeight) {
    console.error("Video nie jest jeszcze gotowe.");
    return false;
  }

  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return true;
}