const photoInput = document.getElementById("photoInput");
const startScreen = document.getElementById("startScreen");
const editorShell = document.getElementById("editorShell");
const startUploadBtn = document.getElementById("startUploadBtn");
const changePhotoBtn = document.getElementById("changePhotoBtn");
const dateInput = document.getElementById("dateInput");
const localTimeInput = document.getElementById("localTimeInput");
const refreshBtn = document.getElementById("refreshBtn");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("previewCanvas");
const emptyState = document.getElementById("emptyState");

const ctx = canvas.getContext("2d");
const sourceImage = new Image();
let hasImage = false;
let localClock = new Date();
let clockIntervalId = null;
const canvasFontStack = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatDotDate(date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function formatDay(date) {
  const dayText = new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date);
  return dayText.charAt(0).toUpperCase() + dayText.slice(1);
}

function setInitialDateTimeInputs() {
  const now = new Date();
  dateInput.value = formatISODate(now);
  localTimeInput.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function getLocalClockFromInputs() {
  const now = new Date();

  const [year, month, day] = (dateInput.value || formatISODate(now)).split("-").map(Number);
  const [hours, minutes] = (localTimeInput.value || `${pad2(now.getHours())}:${pad2(now.getMinutes())}`).split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes, now.getSeconds(), 0);
}

function getOverlayValues() {
  const gtmClock = new Date(localClock.getTime() + 5 * 60 * 60 * 1000);

  return {
    local: formatTime(localClock),
    gtm: formatTime(gtmClock),
    day: formatDay(localClock),
    date: formatDotDate(localClock)
  };
}

function restartClock() {
  localClock = getLocalClockFromInputs();

  if (clockIntervalId) {
    clearInterval(clockIntervalId);
  }

  clockIntervalId = setInterval(() => {
    localClock = new Date(localClock.getTime() + 1000);
    drawWatermark();
  }, 1000);
}

function drawOverlayLabelValue(label, value, x, y, labelFontSize, valueFontSize) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = `500 ${labelFontSize}px ${canvasFontStack}`;
  ctx.fillText(label, x, y);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${valueFontSize}px ${canvasFontStack}`;
  ctx.fillText(value, x, y + valueFontSize + 6);
}

function drawWatermark() {
  if (!hasImage) return;

  const values = getOverlayValues();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  const margin = Math.max(10, Math.round(canvas.width * 0.02));
  const boxX = margin;
  const boxWidth = canvas.width - margin * 2;
  const boxHeight = Math.max(102, Math.round(canvas.height * 0.2));
  const boxY = canvas.height - boxHeight - margin;
  const padding = Math.max(12, Math.round(canvas.width * 0.02));
  const labelFontSize = Math.max(12, Math.round(canvas.width * 0.018));
  const valueFontSize = Math.max(20, Math.round(canvas.width * 0.043));

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  const leftX = boxX + padding;
  const rightX = boxX + boxWidth * 0.53;
  const firstRowY = boxY + padding + labelFontSize;
  const secondRowY = firstRowY + valueFontSize + labelFontSize + 18;

  drawOverlayLabelValue("Local", values.local, leftX, firstRowY, labelFontSize, valueFontSize);
  drawOverlayLabelValue("GTM", values.gtm, leftX, secondRowY, labelFontSize, valueFontSize);
  drawOverlayLabelValue("Dia", values.day, rightX, firstRowY, labelFontSize, valueFontSize);
  drawOverlayLabelValue("Fecha", values.date, rightX, secondRowY, labelFontSize, valueFontSize);

  ctx.restore();
}

function showEditorWithSwipe() {
  startScreen.classList.add("hidden");
  editorShell.classList.remove("hidden");
  editorShell.classList.remove("reveal-down");
  void editorShell.offsetWidth;
  editorShell.classList.add("reveal-down");
}

function loadSelectedFile(file) {
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);

  sourceImage.onload = () => {
    const maxWidth = 2000;
    const scale = sourceImage.width > maxWidth ? maxWidth / sourceImage.width : 1;

    canvas.width = Math.round(sourceImage.width * scale);
    canvas.height = Math.round(sourceImage.height * scale);

    hasImage = true;
    showEditorWithSwipe();
    drawWatermark();

    canvas.style.display = "block";
    emptyState.style.display = "none";
    downloadBtn.disabled = false;

    URL.revokeObjectURL(objectUrl);
  };

  sourceImage.src = objectUrl;
}

function requestPhotoSelection() {
  photoInput.click();
}

setInitialDateTimeInputs();
restartClock();

startUploadBtn.addEventListener("click", requestPhotoSelection);
changePhotoBtn.addEventListener("click", requestPhotoSelection);

photoInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  loadSelectedFile(file);
});

[dateInput, localTimeInput].forEach((input) => {
  input.addEventListener("input", () => {
    restartClock();
    drawWatermark();
  });
});

refreshBtn.addEventListener("click", drawWatermark);

downloadBtn.addEventListener("click", () => {
  if (!hasImage) return;

  const link = document.createElement("a");
  const filename = `foto-marca-${Date.now()}.png`;
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
});
