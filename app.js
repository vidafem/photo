// Leaflet modal/mapa
const mapModal = document.getElementById("mapModal");
const leafletMapDiv = document.getElementById("leafletMap");
const acceptMapBtn = document.getElementById("acceptMapBtn");
const closeMapBtn = document.getElementById("closeMapBtn");
let leafletMap = null;
let leafletMarker = null;
let tempLatLng = null;

function openMapModal() {
  mapModal.classList.remove("hidden");
  setTimeout(() => {
    if (!leafletMap) {
      leafletMap = L.map("leafletMap").setView([
        geoData.lat || 4.65,
        geoData.lng || -74.1
      ], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletMap);
      leafletMarker = L.marker([
        geoData.lat || 4.65,
        geoData.lng || -74.1
      ], { draggable: true }).addTo(leafletMap);
      leafletMarker.on('dragend', (e) => {
        tempLatLng = leafletMarker.getLatLng();
      });
      leafletMap.on('click', (e) => {
        leafletMarker.setLatLng(e.latlng);
        tempLatLng = e.latlng;
      });
    } else {
      leafletMap.setView([
        geoData.lat || 4.65,
        geoData.lng || -74.1
      ], 15);
      leafletMarker.setLatLng([
        geoData.lat || 4.65,
        geoData.lng || -74.1
      ]);
      tempLatLng = leafletMarker.getLatLng();
      leafletMap.invalidateSize();
    }
  }, 100);
}

function closeMapModal() {
  mapModal.classList.add("hidden");
}

openMapBtn?.addEventListener("click", openMapModal);
closeMapBtn?.addEventListener("click", closeMapModal);

acceptMapBtn?.addEventListener("click", () => {
  if (leafletMarker) {
    const pos = tempLatLng || leafletMarker.getLatLng();
    setGeoInputs(pos.lat, pos.lng, geoData.alt);
  }
  closeMapModal();
});
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

const latitudeInput = document.getElementById("latitudeInput");
const longitudeInput = document.getElementById("longitudeInput");
const altitudeInput = document.getElementById("altitudeInput");
const openMapBtn = document.getElementById("openMapBtn");

let geoData = {
  lat: null,
  lng: null,
  alt: null
};

// Obtener ubicación automáticamente
function setGeoInputs(lat, lng, alt) {
  latitudeInput.value = lat?.toFixed(7) || "";
  longitudeInput.value = lng?.toFixed(7) || "";
  altitudeInput.value = alt !== undefined && alt !== null ? Number(alt).toFixed(1) : "";
  geoData.lat = Number(latitudeInput.value);
  geoData.lng = Number(longitudeInput.value);
  geoData.alt = Number(altitudeInput.value);
  drawWatermark();
}

function getLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setGeoInputs(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude);
    },
    (err) => {
      // Si falla, deja los campos vacíos
      setGeoInputs(null, null, null);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

latitudeInput?.addEventListener("input", () => {
  geoData.lat = Number(latitudeInput.value);
  drawWatermark();
});
longitudeInput?.addEventListener("input", () => {
  geoData.lng = Number(longitudeInput.value);
  drawWatermark();
});
altitudeInput?.addEventListener("input", () => {
  geoData.alt = Number(altitudeInput.value);
  drawWatermark();
});

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

  // Franja negra ocupa todo el ancho inferior
  const boxX = 0;
  const boxWidth = canvas.width;
  const boxHeight = Math.max(102, Math.round(canvas.height * 0.2));
  const boxY = canvas.height - boxHeight;
  const padding = Math.max(18, Math.round(canvas.width * 0.03));
  const labelFontSize = Math.max(14, Math.round(canvas.width * 0.021));
  const valueFontSize = Math.max(22, Math.round(canvas.width * 0.048));

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  const leftX = boxX + padding;
  const rightX = boxX + boxWidth * 0.53;
  const firstRowY = boxY + padding + labelFontSize;
  const secondRowY = firstRowY + valueFontSize + labelFontSize + 18;

  drawOverlayLabelValue("Local", values.local, leftX, firstRowY, labelFontSize, valueFontSize);
  drawOverlayLabelValue("GTM", values.gtm, leftX, secondRowY, labelFontSize, valueFontSize);
  drawOverlayLabelValue("Dia", values.day, rightX, firstRowY, labelFontSize, valueFontSize);
  drawOverlayLabelValue("Fecha", values.date, rightX, secondRowY, labelFontSize, valueFontSize);

  // Segunda fila: Lat/Lng/Alt centrados
  const geoFont = `600 ${Math.max(18, Math.round(canvas.width * 0.034))}px ${canvasFontStack}`;
  ctx.font = geoFont;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  const geoY = boxY + boxHeight - padding + 8;
  let geoText = "";
  if (values.lat && values.lng) {
    geoText = `Lat: ${values.lat.toFixed(7)}   Lng: ${values.lng.toFixed(7)}`;
    if (!isNaN(values.alt)) geoText += `   Alt: ${values.alt.toFixed(1)}m`;
  }
  if (geoText) ctx.fillText(geoText, boxX + boxWidth / 2, geoY);
  ctx.textAlign = "left";

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

    // Obtener ubicación al cargar imagen
    getLocation();

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

// Si ya hay valores en los inputs, los toma como iniciales
if (latitudeInput && longitudeInput && altitudeInput) {
  geoData.lat = Number(latitudeInput.value);
  geoData.lng = Number(longitudeInput.value);
  geoData.alt = Number(altitudeInput.value);
}

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
