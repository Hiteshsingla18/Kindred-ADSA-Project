let visibleRows = 8;
let currentDashboardData = null;
let dashboardMap = null;
let emergencyLayerGroup = null;
let stationLayerGroup = null;
let routeLayerGroup = null;
let vehicleLayerGroup = null;
let emergencyMarkers = {};
let activeDispatchCar = null;

const zoneCoordinates = {
  "Connaught Place": [28.6315, 77.2167],
  "Lajpat Nagar": [28.5700, 77.2405],
  "Dwarka": [28.5823, 77.0580],
  "Rohini": [28.7495, 77.0565],
  "Saket": [28.5244, 77.2066],
  "Karol Bagh": [28.6443, 77.1887],
  "Hauz Khas": [28.5494, 77.2001],
  "Vasant Kunj": [28.5204, 77.1568],
  "Shahdara": [28.6734, 77.2917],
  "Civil Lines": [28.6814, 77.2227],
  "India Gate": [28.6129, 77.2295],
  "Noida border": [28.5900, 77.3100]
};

const stations = [
  { name: "Connaught Place", type: "Dispatch HQ", lat: 28.6315, lng: 77.2167, icon: "🏛️" },
  { name: "Mandi House", type: "Emergency Post", lat: 28.6259, lng: 77.2345, icon: "🚨" },
  { name: "India Gate", type: "Patrol Base", lat: 28.6129, lng: 77.2295, icon: "🚓" },
  { name: "Khan Market", type: "Medical Outpost", lat: 28.6001, lng: 77.2271, icon: "🚑" },
  { name: "Lajpat Nagar Central Market", type: "South Response Post", lat: 28.5700, lng: 77.2405, icon: "🚨" },
  { name: "Jangpura", type: "Rapid Dispatch", lat: 28.5833, lng: 77.2428, icon: "🚓" },
  { name: "Hauz Khas Village", type: "South-West Post", lat: 28.5535, lng: 77.1947, icon: "🚨" },
  { name: "Saket Select Citywalk", type: "Trauma Response Post", lat: 28.5287, lng: 77.2195, icon: "🚑" },
  { name: "Malviya Nagar", type: "Civil Response Station", lat: 28.5355, lng: 77.2110, icon: "🚨" },
  { name: "Karol Bagh Metro", type: "Central-West Post", lat: 28.6443, lng: 77.1887, icon: "🚓" },
  { name: "Majnu ka Tilla", type: "North Response Post", lat: 28.7000, lng: 77.2270, icon: "🚨" },
  { name: "Dwarka Sector 10", type: "West Dispatch Division", lat: 28.5823, lng: 77.0580, icon: "🚓" }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function setBackendStatus(message, failed = false) {
  const status = document.querySelector("#backend-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("offline", failed);
}

function getEmergencyCoords(item) {
  const base = zoneCoordinates[item.location] || [28.6139, 77.2090];
  let hash = 0;
  for (let i = 0; i < item.id.length; i++) hash = (hash << 5) - hash + item.id.charCodeAt(i);
  const latOffset = ((Math.abs(hash) % 100) / 100 - 0.5) * 0.02;
  const lngOffset = (((Math.abs(hash) >> 4) % 100) / 100 - 0.5) * 0.02;
  return [base[0] + latOffset, base[1] + lngOffset];
}

function findNearestStation(lat, lng) {
  let nearest = stations[0];
  let minDist = Infinity;
  stations.forEach((s) => {
    const d = Math.hypot((s.lat - lat) * 111, (s.lng - lng) * 103);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  });
  return { station: nearest, distance: minDist };
}

function plotEmergenciesOnMap(emergencies) {
  if (!dashboardMap || !emergencyLayerGroup) return;
  emergencyLayerGroup.clearLayers();
  emergencyMarkers = {};

  emergencies.forEach((item) => {
    const coords = getEmergencyCoords(item);
    const isWaiting = item.status === "Waiting";
    const priorityClass = `p${item.priority}`;
    const statusClass = isWaiting ? "waiting" : "in-progress";

    const icon = L.divIcon({
      className: "custom-div-icon",
      html: `
        <div class="emergency-map-pin ${priorityClass} ${statusClass}" style="width:22px;height:22px;font-size:10px;">
          ${isWaiting ? `P${item.priority}` : "✓"}
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker(coords, { icon }).addTo(emergencyLayerGroup);
    emergencyMarkers[item.id] = marker;

    marker.bindTooltip(`<strong>${item.id}</strong> · P${item.priority} ${item.type}<br><small>${item.location} (${item.status})</small>`);

    marker.on("click", () => {
      focusEmergencyOnMap(item.id);
    });
  });
}

function drawInteractiveRoute(startCoord, endCoord, label = "", isAnimatedDispatch = false) {
  if (!dashboardMap || !routeLayerGroup) return;
  routeLayerGroup.clearLayers();

  const color = isAnimatedDispatch ? "#e87862" : "#3b82f6";

  const polyline = L.polyline([startCoord, endCoord], {
    color,
    weight: isAnimatedDispatch ? 5 : 3.5,
    opacity: 0.9,
    dashArray: isAnimatedDispatch ? "8, 8" : "4, 6",
    className: isAnimatedDispatch ? "dispatch-animated-line" : ""
  }).addTo(routeLayerGroup);

  if (label) polyline.bindTooltip(label, { sticky: true });
}

function animateDispatchVehicle(fromCoord, toCoord) {
  if (!dashboardMap || !vehicleLayerGroup) return;
  if (activeDispatchCar) {
    activeDispatchCar.remove();
    activeDispatchCar = null;
  }

  const icon = L.divIcon({
    className: "custom-div-icon",
    html: `<div class="dispatching-vehicle-icon">🚨</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  const marker = L.marker(fromCoord, { icon, zIndexOffset: 3000 }).addTo(vehicleLayerGroup);
  activeDispatchCar = marker;

  let progress = 0;
  const speed = 0.03;

  function step() {
    if (!activeDispatchCar) return;
    progress += speed;
    if (progress >= 1) {
      marker.setLatLng(toCoord);
      setTimeout(() => {
        if (activeDispatchCar) {
          activeDispatchCar.remove();
          activeDispatchCar = null;
        }
      }, 2000);
      return;
    }
    const lat = fromCoord[0] + (toCoord[0] - fromCoord[0]) * progress;
    const lng = fromCoord[1] + (toCoord[1] - fromCoord[1]) * progress;
    marker.setLatLng([lat, lng]);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function focusEmergencyOnMap(id) {
  document.querySelectorAll(".emergency-row").forEach((r) => r.classList.remove("active-row"));
  const row = document.querySelector(`.emergency-row[data-id="${id}"]`);
  if (row) {
    row.classList.add("active-row");
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const marker = emergencyMarkers[id];
  if (!marker || !dashboardMap) return;

  const latLng = marker.getLatLng();
  dashboardMap.flyTo(latLng, 13, { duration: 0.8 });

  const targetItem = (currentDashboardData?.emergencies || []).find((e) => e.id === id);
  const { station, distance } = findNearestStation(latLng.lat, latLng.lng);

  drawInteractiveRoute([latLng.lat, latLng.lng], [station.lat, station.lng], `${id} ➔ ${station.name}`);

  const popupContent = `
    <div style="font-family:'Space Grotesk',sans-serif;min-width:180px;">
      <h4 style="margin:0 0 4px;font-size:13px;color:#e87862;">🚨 ${id} · ${targetItem ? targetItem.type : "Incident"}</h4>
      <div style="font-size:11px;color:#333;">Delhi Zone: <strong>${targetItem ? targetItem.location : ""}</strong></div>
      <div style="font-size:11px;color:#333;">Priority: <strong>P${targetItem ? targetItem.priority : ""}</strong> · Status: <strong>${targetItem ? targetItem.status : ""}</strong></div>
      <div style="font-size:11px;color:#1864ab;margin-top:6px;border-top:1px solid #eee;padding-top:4px;">
        Nearest Station: <strong>${station.name}</strong> (${distance.toFixed(1)} km)
      </div>
    </div>
  `;

  L.popup()
    .setLatLng(latLng)
    .setContent(popupContent)
    .openOn(dashboardMap);

  const resultBox = document.querySelector("#route-result");
  if (resultBox) {
    resultBox.innerHTML = `Selected <strong>${id}</strong> (${targetItem ? targetItem.location : ""}) ➔ Nearest: <strong>${station.name}</strong> (${distance.toFixed(1)} km)`;
  }
}

function renderEmergencies(data) {
  currentDashboardData = data;
  const table = document.querySelector("#emergency-table");
  table.innerHTML = data.emergencies.map((item) => `
    <tr data-id="${item.id}" class="emergency-row">
      <td><strong>${item.id}</strong></td>
      <td>${item.type}</td>
      <td>${item.location}</td>
      <td><span class="priority p${item.priority}">P${item.priority}</span></td>
      <td>${item.reported}</td>
      <td><span class="status ${item.status === 'In progress' ? 'status-active' : ''}">${item.status}</span></td>
    </tr>
  `).join("");

  document.querySelector("#emergency-total").textContent = data.total;
  document.querySelector("#queue-count").textContent = `${data.waiting} waiting`;
  document.querySelector("#open-count").textContent = data.open;
  document.querySelector("#ready-count").textContent = data.readyVehicles;
  document.querySelector("#zone-count").textContent = data.sampleZones;

  document.querySelectorAll(".emergency-row").forEach((row) => {
    row.addEventListener("click", () => {
      focusEmergencyOnMap(row.dataset.id);
    });
  });

  plotEmergenciesOnMap(data.emergencies);
}

async function refreshDashboard() {
  try {
    const data = await window.kindredApi(`/api/dashboard?limit=${visibleRows}`);
    renderEmergencies(data);
    setBackendStatus("C++ API connected");
    return data;
  } catch (error) {
    document.querySelector("#emergency-table").innerHTML = `<tr><td colspan="6">Could not load the dashboard: ${escapeHtml(error.message)}</td></tr>`;
    setBackendStatus(error.message, true);
    return null;
  }
}

function setupDelhiMap() {
  const target = document.querySelector("#delhi-map");
  if (!target) return;
  if (!window.L) {
    target.innerHTML = "<div class=\"map-error\">The map library could not load. Check your internet connection and refresh.</div>";
    return;
  }

  const delhiCenter = [28.6139, 77.2090];
  const stationBounds = L.latLngBounds(stations.map((s) => [s.lat, s.lng])).pad(0.2);

  dashboardMap = L.map(target, { scrollWheelZoom: true });
  const status = document.querySelector("#gps-status");
  dashboardMap.fitBounds(stationBounds, { padding: [20, 20], maxZoom: 12 });

  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
  }).addTo(dashboardMap);

  tileLayer.on("tileerror", () => {
    status.textContent = "OpenStreetMap tiles could not load · check your internet connection.";
  });

  stationLayerGroup = L.layerGroup().addTo(dashboardMap);
  emergencyLayerGroup = L.layerGroup().addTo(dashboardMap);
  routeLayerGroup = L.layerGroup().addTo(dashboardMap);
  vehicleLayerGroup = L.layerGroup().addTo(dashboardMap);

  stations.forEach((st) => {
    const icon = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="station-map-pin" title="${st.name}">${st.icon}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([st.lat, st.lng], { icon }).addTo(stationLayerGroup);
    marker.bindTooltip(`<strong>${st.name}</strong><br><small>${st.type}</small>`);

    marker.on("click", () => {
      const resultBox = document.querySelector("#route-result");
      if (resultBox) {
        resultBox.innerHTML = `Station: <strong>${st.name}</strong> (${st.type}) · Ready for dispatch`;
      }
      L.popup()
        .setLatLng([st.lat, st.lng])
        .setContent(`
          <div style="font-family:'Space Grotesk',sans-serif;min-width:170px;">
            <h4 style="margin:0 0 4px;font-size:13px;color:#2b8a3e;">${st.icon} ${st.name}</h4>
            <div style="font-size:11px;color:#555;">Type: <strong>${st.type}</strong></div>
            <div style="font-size:10px;color:#888;margin-top:3px;">GPS: ${st.lat.toFixed(4)}, ${st.lng.toFixed(4)}</div>
          </div>
        `)
        .openOn(dashboardMap);
    });
  });

  dashboardMap.on("click", (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const { station, distance } = findNearestStation(lat, lng);
    drawInteractiveRoute([lat, lng], [station.lat, station.lng], `Inspection: Clicked location ➔ ${station.name}`);

    L.popup()
      .setLatLng(e.latlng)
      .setContent(`
        <div style="font-family:'Space Grotesk',sans-serif;min-width:170px;">
          <h4 style="margin:0 0 4px;font-size:12px;color:#e87862;">📍 Selected Location</h4>
          <div style="font-size:11px;color:#333;">Nearest Station: <strong>${station.name}</strong></div>
          <div style="font-size:11px;color:#333;">Distance: <strong>${distance.toFixed(2)} km</strong></div>
          <div style="font-size:9px;color:#777;margin-top:3px;">GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
        </div>
      `)
      .openOn(dashboardMap);

    const resultBox = document.querySelector("#route-result");
    if (resultBox) {
      resultBox.innerHTML = `GPS Preview: (${lat.toFixed(3)}, ${lng.toFixed(3)}) ➔ <strong>${station.name}</strong> (${distance.toFixed(1)} km)`;
    }
  });

  let liveMarker = null;
  const locateButton = document.querySelector("#locate-me");
  if (locateButton) {
    locateButton.addEventListener("click", () => {
      if (!navigator.geolocation) {
        status.textContent = "Live GPS is not available in this browser.";
        return;
      }
      status.textContent = "Requesting live GPS permission…";
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const position = [coords.latitude, coords.longitude];
        const distanceFromDelhi = dashboardMap.distance(delhiCenter, position) / 1000;
        const liveStatus = `LIVE GPS · ${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E`;

        if (distanceFromDelhi <= 25) {
          const bounds = L.latLngBounds([...stations.map((s) => [s.lat, s.lng]), position]).pad(0.2);
          if (liveMarker) liveMarker.remove();
          liveMarker = L.circleMarker(position, {
            radius: 8,
            color: "#fff",
            weight: 3,
            fillColor: "#2c82c9",
            fillOpacity: 1
          }).addTo(dashboardMap);
          liveMarker.bindPopup("Your live location");
          dashboardMap.fitBounds(bounds, { padding: [16, 16], maxZoom: 12 });
          status.textContent = `${liveStatus} · Delhi network remains visible`;
          document.querySelector("#route-result").textContent = "GPS live · Delhi network remains visible";
        } else {
          if (liveMarker) {
            liveMarker.remove();
            liveMarker = null;
          }
          dashboardMap.fitBounds(stationBounds, { padding: [16, 16], maxZoom: 11 });
          dashboardMap.panTo(delhiCenter);
          status.textContent = `${liveStatus} · ${Math.round(distanceFromDelhi)} km from Delhi; station map stays centered on Delhi`;
          document.querySelector("#route-result").textContent = "GPS live · Delhi stations remain in view";
        }
      }, () => {
        status.textContent = "GPS permission was unavailable · showing real Delhi station coordinates.";
      });
    });
  }

  if (currentDashboardData && currentDashboardData.emergencies) {
    plotEmergenciesOnMap(currentDashboardData.emergencies);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupDelhiMap();
  refreshDashboard();

  const more = document.querySelector("#show-more");
  if (more) {
    more.addEventListener("click", () => {
      visibleRows += 8;
      refreshDashboard();
    });
  }

  const process = document.querySelector("#process-btn");
  if (process) {
    process.addEventListener("click", async () => {
      process.disabled = true;
      try {
        const data = await window.kindredApi("/api/emergencies/next", { method: "POST" });
        renderEmergencies(data);
        setBackendStatus(`Assigned ${data.assignedEmergencyId} to ${data.assignedVehicleId}`);

        const targetItem = data.emergencies.find((e) => e.id === data.assignedEmergencyId);
        if (targetItem && dashboardMap) {
          const emergencyCoord = getEmergencyCoords(targetItem);
          const { station, distance } = findNearestStation(emergencyCoord[0], emergencyCoord[1]);

          dashboardMap.flyToBounds(L.latLngBounds([emergencyCoord, [station.lat, station.lng]]).pad(0.3), { duration: 1 });

          drawInteractiveRoute([station.lat, station.lng], emergencyCoord, `DISPATCHED: ${data.assignedVehicleId} ➔ ${data.assignedEmergencyId}`, true);
          animateDispatchVehicle([station.lat, station.lng], emergencyCoord);

          const resultBox = document.querySelector("#route-result");
          if (resultBox) {
            resultBox.innerHTML = `🚨 <strong>DISPATCHED:</strong> ${data.assignedVehicleId} assigned from <strong>${station.name}</strong> to <strong>${data.assignedEmergencyId}</strong> (${distance.toFixed(1)} km)`;
          }

          focusEmergencyOnMap(data.assignedEmergencyId);
        }
      } catch (error) {
        setBackendStatus(error.message, true);
      } finally {
        process.disabled = false;
      }
    });
  }
});
