// modules/vision/camera.js

let stream = null;

export async function startCamera(videoElementId = "camera") {
  const video = document.getElementById(videoElementId);

  if (!video) {
    console.error("Camera element not found:", videoElementId);
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    video.srcObject = stream;
    video.play();

  } catch (err) {
    console.error("Camera start error:", err);
  }
}

export function stopCamera(videoElementId = "camera") {
  const video = document.getElementById(videoElementId);

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  if (video) {
    video.srcObject = null;
  }
}