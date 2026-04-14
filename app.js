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
  const showNoteCheck = document.getElementById("showNoteCheck");

  // --- Estado global ---
  const ctx = canvas.getContext("2d");
  const sourceImage = new Image();
  let hasImage = false;
  let localClock = new Date();
  let clockIntervalId = null;
  // FUENTE VERDANA PARA LA FRANJA DE DATOS
  const canvasFontStack = 'Verdana, Geneva, sans-serif';

  let geoData = {
    lat: null,
    lng: null,
    alt: null,
    plusCode: "Obteniendo...",
    direccion: null
  };

  // NUEVO LOGO COMPLETO (Sustituye a mapcam.webp)
  const logoImg = new window.Image();
  logoImg.src = 'logo1.png';
  let logoLoaded = false;
  logoImg.onload = () => { logoLoaded = true; drawWatermark(); };

  // Leaflet
  let leafletMap = null;
  let leafletMarker = null;
  let tempLatLng = null;

  // --- Utilidades ---
  function getPlusCode(lat, lng) {
    // Ya no devolvemos el valor fijo por defecto
    return geoData.plusCode || "Cargando...";
  }

  // (llave eliminada)
  function countryCodeToFlag(cc) {
    return cc
      .toUpperCase()
      .replace(/./g, char => String.fromPoint(127397 + char.charCodeAt()));
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

  // Utilidades y lógica de la app
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
      plusCode: geoData.plusCode,
      direccion: geoData.direccion || "Cargando ubicación..."
    };
  }

  // --- Geocodificación inversa y plus code ---
  async function updateGeoData(lat, lng) {
    // Plus code REAL mediante API
    try {
      const plusCodeResp = await fetch(`https://plus.codes/api?address=${lat},${lng}`);
      const plusCodeData = await plusCodeResp.json();
      geoData.plusCode = plusCodeData.global_code || "No disponible";
    } catch {
      geoData.plusCode = "Error PlusCode";
    }
    // Dirección, Ciudad y Código Postal
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const data = await resp.json();
      let ciudad = data.address.city || data.address.town || data.address.village || "";
      let cp = data.address.postcode || "";
      let pais = data.address.country || "";
      let bandera = data.address.country_code ? countryCodeToFlag(data.address.country_code.toUpperCase()) : "";
      geoData.direccion = `${ciudad} ${cp}, ${pais} ${bandera}`.trim();
    } catch {
      geoData.direccion = "Ubicación desconocida";
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
    ctx.font = `300 ${labelFontSize}px ${canvasFontStack}`;
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = `300 ${valueFontSize}px ${canvasFontStack}`;
    ctx.fillText(value, x, y + valueFontSize + 6);
  }

  function drawWatermark() {
    if (!hasImage) return;
    const values = getOverlayValues();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    
    const boxX = 0;
    const boxWidth = canvas.width;
    const boxHeight = Math.max(140, Math.round(canvas.height * 0.23));
    const boxY = canvas.height - boxHeight;
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    if (logoLoaded) {
      const floatBoxW = Math.max(180, Math.round(boxWidth * 0.25));
      const floatBoxH = Math.max(50, Math.round(boxHeight * 0.32));
      const floatBoxX = boxWidth - floatBoxW; 
      const floatBoxY = boxY - floatBoxH; 

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(floatBoxX, floatBoxY, floatBoxW, floatBoxH);

      const padding = 6;
      const imgW = floatBoxW - (padding * 2);
      const imgH = Math.round(imgW * logoImg.height / logoImg.width);
      let finalW = imgW;
      let finalH = imgH;
      if (finalH > floatBoxH - (padding * 2)) {
          finalH = floatBoxH - (padding * 2);
          finalW = Math.round(finalH * logoImg.width / logoImg.height);
      }
      ctx.drawImage(logoImg, floatBoxX + (floatBoxW - finalW) / 2, floatBoxY + (floatBoxH - finalH) / 2, finalW, finalH);
    }

    const fPlusDir = Math.max(21, Math.round(canvas.width * 0.034) - 1);
    const fLatLongLabel = Math.max(20, Math.round(canvas.width * 0.032) - 1);
    const fLatLongValue = Math.max(26, Math.round(canvas.width * 0.040)); 
    const fLocalGmt = Math.max(21, Math.round(canvas.width * 0.034) - 1);
    const fAltDate = Math.max(20, Math.round(canvas.width * 0.032) - 1);

    ctx.textAlign = "center";
    ctx.font = `300 ${fPlusDir}px ${canvasFontStack}`;
    ctx.fillStyle = "#fff";
    
    // COMPACTACIÓN: Aplicar ligera escala horizontal (0.96)
    ctx.setTransform(0.96, 0, 0, 1, 0, 0); 
    
    const plusDirY = boxY + Math.max(28, Math.round(boxHeight * 0.16));
    let direccionCompleta = `${values.plusCode}, ${values.direccion}`;
    ctx.fillText(direccionCompleta, (boxX + boxWidth / 2) / 0.96, plusDirY);

    const sectionY = plusDirY + Math.max(28, Math.round(boxHeight * 0.18));
    const colPad = Math.max(38, Math.round(boxWidth * 0.045));
    ctx.textAlign = "left";
    ctx.font = `400 ${fLatLongLabel}px ${canvasFontStack}`;
    ctx.fillText("Latitud", (boxX + colPad) / 0.96, sectionY);
    ctx.font = `400 ${fLatLongValue}px ${canvasFontStack}`;
    ctx.fillText(values.lat !== null ? values.lat.toFixed(6) + "°" : "-", (boxX + colPad) / 0.96, sectionY + Math.max(32, Math.round(boxHeight * 0.15)));
    ctx.font = `400 ${fLatLongLabel}px ${canvasFontStack}`;
    ctx.fillText("Longitud", (boxWidth / 2) / 0.96, sectionY);
    ctx.font = `400 ${fLatLongValue}px ${canvasFontStack}`;
    ctx.fillText(values.lng !== null ? values.lng.toFixed(6) + "°" : "-", (boxWidth / 2) / 0.96, sectionY + Math.max(32, Math.round(boxHeight * 0.15)));

    const localY = sectionY + Math.max(62, Math.round(boxHeight * 0.36));
    ctx.font = `300 ${fLocalGmt}px ${canvasFontStack}`;
    ctx.fillText(`Local ${values.local}`, (boxX + colPad) / 0.96, localY);
    const gmtY = localY + Math.max(28, Math.round(boxHeight * 0.13));
    ctx.fillText(`GTM ${values.gtm}`, (boxX + colPad) / 0.96, gmtY);
    
    if (showNoteCheck.checked) {
        ctx.font = `300 ${fAltDate * 0.8}px ${canvasFontStack}`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText("Nota: Capturada con GPS Map Camera Lite", (boxX + colPad) / 0.96, gmtY + Math.max(22, Math.round(boxHeight * 0.12)));
    }

    ctx.font = `400 ${fAltDate}px ${canvasFontStack}`;
    ctx.fillStyle = "#fff";
    const altText = `Altitud ${(values.alt !== null && !isNaN(values.alt)) ? values.alt.toFixed(0) + " metros" : "-"}`;
    ctx.fillText(altText, (boxWidth / 2) / 0.96, localY);
    ctx.fillText(values.day + ", " + values.date, (boxWidth / 2) / 0.96, gmtY);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Restaurar escala
    ctx.restore();
  }

  // --- Geocodificación inversa y plus code (DUPLICADO SEGÚN ORIGINAL) ---
  async function updateGeoData(lat, lng) {
    try {
      const plusCodeResp = await fetch(`https://plus.codes/api?address=${lat},${lng}`);
      const plusCodeData = await plusCodeResp.json();
      geoData.plusCode = plusCodeData.global_code || "Calculando...";
    } catch {
      geoData.plusCode = "Error API";
    }
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const data = await resp.json();
      let ciudad = data.address.city || data.address.town || data.address.village || "";
      let cp = data.address.postcode || "";
      let pais = data.address.country || "";
      let bandera = data.address.country_code ? countryCodeToFlag(data.address.country_code.toUpperCase()) : "";
      geoData.direccion = `${ciudad} ${cp}, ${pais} ${bandera}`.trim();
    } catch {
      geoData.direccion = "";
    }
    drawWatermark();
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
    if (geoData.lat && geoData.lng) updateGeoData(geoData.lat, geoData.lng);
    else drawWatermark();
  });

  longitudeInput?.addEventListener("input", () => {
    geoData.lng = Number(longitudeInput.value);
    if (geoData.lat && geoData.lng) updateGeoData(geoData.lat, geoData.lng);
    else drawWatermark();
  });

  altitudeInput?.addEventListener("input", () => {
    geoData.alt = Number(altitudeInput.value);
    drawWatermark();
  });

  showNoteCheck.addEventListener("change", drawWatermark);

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
