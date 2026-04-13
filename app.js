const photoInput = document.getElementById("photoInput");
const brandName = document.getElementById("brandName");
const fullName = document.getElementById("fullName");
const docId = document.getElementById("docId");
const timestamp = document.getElementById("timestamp");
const customCode = document.getElementById("customCode");
const position = document.getElementById("position");
const opacity = document.getElementById("opacity");
const opacityValue = document.getElementById("opacityValue");
const applyBtn = document.getElementById("applyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("previewCanvas");
const emptyState = document.getElementById("emptyState");

const ctx = canvas.getContext("2d");
const sourceImage = new Image();
let hasImage = false;

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function getWatermarkLines() {
  const lines = [];

  if (brandName.value.trim()) lines.push(`Marca: ${brandName.value.trim()}`);
  if (fullName.value.trim()) lines.push(`Nombre: ${fullName.value.trim()}`);
  if (docId.value.trim()) lines.push(`ID: ${docId.value.trim()}`);

  const dateText = formatDateTime(timestamp.value);
  if (dateText) lines.push(`Fecha: ${dateText}`);

  if (customCode.value.trim()) lines.push(`Codigo: ${customCode.value.trim()}`);

  if (!lines.length) {
    lines.push("Marca de agua generada localmente");
  }

  return lines;
}

function drawWatermark() {
  if (!hasImage) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  const lines = getWatermarkLines();
  const fontSize = Math.max(14, Math.round(canvas.width * 0.02));
  const lineHeight = fontSize * 1.35;
  const padding = Math.max(10, Math.round(canvas.width * 0.015));

  ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
  const textWidths = lines.map((line) => ctx.measureText(line).width);
  const boxWidth = Math.max(...textWidths) + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  let x = padding;
  let y = padding;

  switch (position.value) {
    case "top-right":
      x = canvas.width - boxWidth - padding;
      y = padding;
      break;
    case "bottom-left":
      x = padding;
      y = canvas.height - boxHeight - padding;
      break;
    case "bottom-right":
      x = canvas.width - boxWidth - padding;
      y = canvas.height - boxHeight - padding;
      break;
    case "center":
      x = (canvas.width - boxWidth) / 2;
      y = (canvas.height - boxHeight) / 2;
      break;
    default:
      x = padding;
      y = padding;
  }

  const alpha = Number(opacity.value) / 100;

  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(alpha, 1));
  ctx.fillStyle = "#101217";
  ctx.fillRect(x, y, boxWidth, boxHeight);

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, boxHeight - 1);

  ctx.fillStyle = "#f5f7fa";
  lines.forEach((line, index) => {
    const textY = y + padding + fontSize + index * lineHeight;
    ctx.fillText(line, x + padding, textY);
  });
  ctx.restore();
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
    drawWatermark();

    canvas.style.display = "block";
    emptyState.style.display = "none";
    downloadBtn.disabled = false;

    URL.revokeObjectURL(objectUrl);
  };

  sourceImage.src = objectUrl;
}

photoInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  loadSelectedFile(file);
});

opacity.addEventListener("input", () => {
  opacityValue.value = `${opacity.value}%`;
  drawWatermark();
});

[brandName, fullName, docId, timestamp, customCode, position].forEach((input) => {
  input.addEventListener("input", drawWatermark);
});

applyBtn.addEventListener("click", drawWatermark);

downloadBtn.addEventListener("click", () => {
  if (!hasImage) return;

  const link = document.createElement("a");
  const filename = `foto-marca-${Date.now()}.png`;
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
});
