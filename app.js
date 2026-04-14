
window.addEventListener('DOMContentLoaded', () => {
  // --- Declaración de variables y elementos DOM ---
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
  const latitudeInput = document.getElementById("latitudeInput");
  const longitudeInput = document.getElementById("longitudeInput");
  const altitudeInput = document.getElementById("altitudeInput");
  const openMapBtn = document.getElementById("openMapBtn");
  const mapModal = document.getElementById("mapModal");
  const leafletMapDiv = document.getElementById("leafletMap");
  const acceptMapBtn = document.getElementById("acceptMapBtn");
  const closeMapBtn = document.getElementById("closeMapBtn");

  // --- Estado global ---
  const ctx = canvas.getContext("2d");
  const sourceImage = new Image();
  let hasImage = false;
  let localClock = new Date();
  let clockIntervalId = null;
  const canvasFontStack = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  let geoData = {
    lat: null,
    lng: null,
    alt: null,
    plusCode: null,
    direccion: null
  };
  // Logo
  const logoImg = new window.Image();
  logoImg.src = 'mapcam.webp';
  let logoLoaded = false;
  logoImg.onload = () => { logoLoaded = true; drawWatermark(); };
  // Leaflet
  let leafletMap = null;
  let leafletMarker = null;
  let tempLatLng = null;

  // --- Utilidades ---
  function getPlusCode(lat, lng) {
    // Placeholder, para producción usar librería oficial
    return "R4F4+GQH";
  }
  function countryCodeToFlag(cc) {
    return cc
      .toUpperCase()
      .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
  }

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

  // Utilidades y lógica de la app (idéntico a la versión previa, solo movido dentro del bloque)
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
      date: formatDotDate(localClock),
      lat: geoData.lat,
      lng: geoData.lng,
      alt: geoData.alt,
      plusCode: geoData.plusCode || "R4F4+GQH",
      direccion: geoData.direccion || "Guayaquil 090512, Ecuador 🇪🇨"
    };
  }

  // --- Geocodificación inversa y plus code ---
  async function updateGeoData(lat, lng) {
    // Plus code
    try {
      const plusCodeResp = await fetch(`https://plus.codes/api?address=${lat},${lng}`);
      const plusCodeData = await plusCodeResp.json();
      geoData.plusCode = plusCodeData.global_code || getPlusCode(lat, lng);
    } catch {
      geoData.plusCode = getPlusCode(lat, lng);
    }
    // Dirección
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const data = await resp.json();
      let ciudad = data.address.city || data.address.town || data.address.village || "";
      let cp = data.address.postcode || "";
      let pais = data.address.country || "";
      let bandera = "";
      if (data.address.country_code) {
        bandera = countryCodeToFlag(data.address.country_code.toUpperCase());
      }
      geoData.direccion = `${ciudad} ${cp}, ${pais} ${bandera}`.trim();
    } catch {
      geoData.direccion = "";
    }
    drawWatermark();
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
    // --- Medidas y estilos ---
    const boxX = 0;
    const boxWidth = canvas.width;
    const boxHeight = Math.max(140, Math.round(canvas.height * 0.23));
    const boxY = canvas.height - boxHeight;
    ctx.save();
    // Fondo negro con bordes redondeados
    ctx.beginPath();
    const radius = 22;
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxWidth - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    ctx.lineTo(boxX + radius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fill();

    // --- Logo arriba derecha ---
    if (logoLoaded) {
      const logoW = Math.max(60, Math.round(boxWidth * 0.09));
      const logoH = Math.round(logoW * logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, boxX + boxWidth - logoW - 16, boxY + 14, logoW, logoH);
    }

    // --- Primera línea: Plus code y dirección (misma línea, centrado) ---
    const plusFont = `600 ${Math.max(16, Math.round(canvas.width * 0.028))}px ${canvasFontStack}`;
    const dirFont = `700 ${Math.max(22, Math.round(canvas.width * 0.042))}px ${canvasFontStack}`;
    ctx.textAlign = "center";
    ctx.font = plusFont;
    ctx.fillStyle = "#fff";
    const plusDirY = boxY + Math.max(32, Math.round(boxHeight * 0.18));
    // Medir plus code y dirección
    const plusWidth = ctx.measureText(values.plusCode).width;
    ctx.font = dirFont;
    const dirWidth = ctx.measureText(values.direccion).width;
    // Espacio entre plus code y dirección
    const gap = 18;
    // Calcular posición inicial para centrar ambos juntos
    const totalWidth = plusWidth + gap + dirWidth;
    const startX = boxX + boxWidth / 2 - totalWidth / 2;
    // Dibujar plus code
    ctx.font = plusFont;
    ctx.fillText(values.plusCode, startX + plusWidth / 2, plusDirY);
    // Dibujar dirección
    ctx.font = dirFont;
    ctx.fillText(values.direccion, startX + plusWidth + gap + dirWidth / 2, plusDirY);

    // --- Segunda línea: Latitude y Longitude (grandes, alineados) ---
    const labelFont = `500 ${Math.max(14, Math.round(canvas.width * 0.022))}px ${canvasFontStack}`;
    const valueFont = `700 ${Math.max(20, Math.round(canvas.width * 0.034))}px ${canvasFontStack}`;
    const sectionY = plusDirY + Math.max(28, Math.round(boxHeight * 0.18));
    const colPad = Math.max(38, Math.round(boxWidth * 0.045));
    // Latitude
    ctx.textAlign = "left";
    ctx.font = labelFont;
    ctx.fillStyle = "#fff";
    ctx.fillText("Latitude", boxX + colPad, sectionY);
    ctx.font = valueFont;
    ctx.fillText(values.lat !== null ? values.lat.toFixed(6) + "°" : "-", boxX + colPad, sectionY + Math.max(24, Math.round(boxHeight * 0.13)));
    // Longitude
    ctx.textAlign = "right";
    ctx.font = labelFont;
    ctx.fillText("Longitude", boxX + boxWidth - colPad, sectionY);
    ctx.font = valueFont;
    ctx.fillText(values.lng !== null ? values.lng.toFixed(6) + "°" : "-", boxX + boxWidth - colPad, sectionY + Math.max(24, Math.round(boxHeight * 0.13)));

    // --- Tercera línea: Local/GMT y Altitude/Fecha ---
    // Local y GMT (uno arriba del otro, izquierda)
    ctx.textAlign = "left";
    ctx.font = labelFont;
    const localY = sectionY + Math.max(56, Math.round(boxHeight * 0.32));
    ctx.fillText("Local", boxX + colPad, localY);
    ctx.font = valueFont;
    ctx.fillText(values.local, boxX + colPad, localY + Math.max(20, Math.round(boxHeight * 0.09)));
    ctx.font = labelFont;
    ctx.fillText("GTM", boxX + colPad, localY + Math.max(44, Math.round(boxHeight * 0.18)));
    ctx.font = valueFont;
    ctx.fillText(values.gtm, boxX + colPad, localY + Math.max(64, Math.round(boxHeight * 0.27)));

    // Altitude y metros (uno arriba del otro, derecha)
    ctx.textAlign = "right";
    ctx.font = labelFont;
    ctx.fillText("Altitude", boxX + boxWidth - colPad, localY);
    ctx.font = valueFont;
    ctx.fillText((values.alt !== null && !isNaN(values.alt)) ? values.alt.toFixed(0) + " meters" : "-", boxX + boxWidth - colPad, localY + Math.max(20, Math.round(boxHeight * 0.09)));
    // Día y fecha (abajo derecha)
    ctx.font = labelFont;
    ctx.fillText(values.day + ", " + values.date, boxX + boxWidth - colPad, localY + Math.max(64, Math.round(boxHeight * 0.27)));
    ctx.restore();
  // --- Geocodificación inversa y plus code ---
  async function updateGeoData(lat, lng) {
    // Plus code
    try {
      const plusCodeResp = await fetch(`https://plus.codes/api?address=${lat},${lng}`);
      const plusCodeData = await plusCodeResp.json();
      geoData.plusCode = plusCodeData.global_code || getPlusCode(lat, lng);
    } catch {
      geoData.plusCode = getPlusCode(lat, lng);
    }
    // Dirección
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const data = await resp.json();
      let ciudad = data.address.city || data.address.town || data.address.village || "";
      let cp = data.address.postcode || "";
      let pais = data.address.country || "";
      let bandera = "";
      if (data.address.country_code) {
        // Bandera emoji
        bandera = countryCodeToFlag(data.address.country_code.toUpperCase());
      }
      geoData.direccion = `${ciudad} ${cp}, ${pais} ${bandera}`.trim();
    } catch {
      geoData.direccion = "";
    }
    drawWatermark();
  }

  function countryCodeToFlag(cc) {
    return cc
      .toUpperCase()
      .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
  }

  }
  function showEditorWithSwipe() {
    startScreen.classList.add("hidden");
    editorShell.classList.remove("hidden");
    editorShell.classList.remove("reveal-down");
    void editorShell.offsetWidth;
    editorShell.classList.add("reveal-down");
  }
  function setGeoInputs(lat, lng, alt) {
    latitudeInput.value = lat?.toFixed(7) || "";
    longitudeInput.value = lng?.toFixed(7) || "";
    altitudeInput.value = alt !== undefined && alt !== null ? Number(alt).toFixed(1) : "";
    geoData.lat = Number(latitudeInput.value);
    geoData.lng = Number(longitudeInput.value);
    geoData.alt = Number(altitudeInput.value);
    if (geoData.lat && geoData.lng) {
      updateGeoData(geoData.lat, geoData.lng);
    } else {
      drawWatermark();
    }
  }
  function getLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoInputs(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude);
      },
      (err) => {
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
      getLocation();
    };
    sourceImage.src = objectUrl;
  }
  function requestPhotoSelection() {
    photoInput.click();
  }
  setInitialDateTimeInputs();
  restartClock();
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
});

// Elementos del DOM (declarar todos antes de usarlos)
// ...declaraciones ya movidas al inicio del archivo...

// Variables de estado para Leaflet
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
const latitudeInput = document.getElementById("latitudeInput");
const longitudeInput = document.getElementById("longitudeInput");
const altitudeInput = document.getElementById("altitudeInput");
const openMapBtn = document.getElementById("openMapBtn");

const ctx = canvas.getContext("2d");
const sourceImage = new Image();
let hasImage = false;
let localClock = new Date();
let clockIntervalId = null;
const canvasFontStack = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
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
