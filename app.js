let visibleRows = 8;
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
function renderEmergencies(data) {
  const table = document.querySelector("#emergency-table");
  table.innerHTML = data.emergencies.map((item) => `<tr><td>${item.id}</td><td>${item.type}</td><td>${item.location}</td><td><span class="priority p${item.priority}">P${item.priority}</span></td><td>${item.reported}</td><td><span class="status">${item.status}</span></td></tr>`).join("");
  document.querySelector("#emergency-total").textContent = data.total;
  document.querySelector("#queue-count").textContent = `${data.waiting} waiting`;
  document.querySelector("#open-count").textContent = data.open;
  document.querySelector("#ready-count").textContent = data.readyVehicles;
  document.querySelector("#zone-count").textContent = data.sampleZones;
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
  const stations = [
    ["Connaught Place", 28.6315, 77.2167], ["Mandi House", 28.6259, 77.2345], ["India Gate", 28.6129, 77.2295],
    ["Khan Market", 28.6001, 77.2271], ["Lajpat Nagar Central Market", 28.5700, 77.2405], ["Jangpura", 28.5833, 77.2428],
    ["Hauz Khas Village", 28.5535, 77.1947], ["Saket Select Citywalk", 28.5287, 77.2195], ["Malviya Nagar", 28.5355, 77.2110],
    ["Karol Bagh Metro", 28.6443, 77.1887], ["Majnu ka Tilla", 28.7000, 77.2270], ["Dwarka Sector 10", 28.5823, 77.0580]
  ];
  const delhiCenter = [28.6139, 77.2090];
  const stationBounds = L.latLngBounds(stations.map(([, lat, lng]) => [lat, lng])).pad(0.2);
  const map = L.map(target, { scrollWheelZoom: false });
  const status = document.querySelector("#gps-status");
  map.fitBounds(stationBounds, { padding: [16, 16], maxZoom: 11 });
  map.panTo(delhiCenter);
  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
  }).addTo(map);
  tileLayer.on("tileerror", () => {
    status.textContent = "OpenStreetMap tiles could not load · check your internet connection.";
  });

  const route = L.polyline([], { color: "#e87862", weight: 4, opacity: 0.9 }).addTo(map);
  const markers = stations.map(([name, lat, lng], index) => {
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: index === 0 ? "#e87862" : "#6c8c66",
      fillOpacity: 1
    }).addTo(map);
    marker.bindTooltip(name);
    marker.bindPopup(`<strong>${name}</strong><br>GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}<br><small>Real Delhi coordinate</small>`);
    marker.on("click", () => {
      markers.forEach((item) => item.setStyle({ fillColor: "#6c8c66" }));
      marker.setStyle({ fillColor: "#e87862" });
      route.setLatLngs([[stations[0][1], stations[0][2]], [lat, lng]]);
      document.querySelector("#route-result").textContent = `Straight-line GPS preview · ${name}`;
    });
    return marker;
  });

  let liveMarker = null;
  const locateButton = document.querySelector("#locate-me");
  if (locateButton) locateButton.addEventListener("click", () => {
    if (!navigator.geolocation) { status.textContent = "Live GPS is not available in this browser."; return; }
    status.textContent = "Requesting live GPS permission…";
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = [coords.latitude, coords.longitude];
      const distanceFromDelhi = map.distance(delhiCenter, position) / 1000;
      const liveStatus = `LIVE GPS · ${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E`;

      if (distanceFromDelhi <= 25) {
        const bounds = L.latLngBounds([...stations.map(([, lat, lng]) => [lat, lng]), position]).pad(0.2);
        if (liveMarker) liveMarker.remove();
        liveMarker = L.circleMarker(position, {
          radius: 8,
          color: "#fff",
          weight: 3,
          fillColor: "#2c82c9",
          fillOpacity: 1
        }).addTo(map);
        liveMarker.bindPopup("Your live location");
        map.fitBounds(bounds, { padding: [16, 16], maxZoom: 12 });
        status.textContent = `${liveStatus} · Delhi network remains visible`;
        document.querySelector("#route-result").textContent = "GPS live · Delhi network remains visible";
      } else {
        if (liveMarker) {
          liveMarker.remove();
          liveMarker = null;
        }
        map.fitBounds(stationBounds, { padding: [16, 16], maxZoom: 11 });
        map.panTo(delhiCenter);
        status.textContent = `${liveStatus} · ${Math.round(distanceFromDelhi)} km from Delhi; station map stays centered on Delhi`;
        document.querySelector("#route-result").textContent = "GPS live · Delhi stations remain in view";
      }
    }, () => { status.textContent = "GPS permission was unavailable · showing real Delhi station coordinates."; });
  });
}
document.addEventListener("DOMContentLoaded", () => {
  refreshDashboard(); setupDelhiMap();
  const more = document.querySelector("#show-more");
  if (more) more.addEventListener("click", () => { visibleRows += 8; refreshDashboard(); });
  const process = document.querySelector("#process-btn");
  if (process) process.addEventListener("click", async () => {
    process.disabled = true;
    try {
      const data = await window.kindredApi("/api/emergencies/next", { method: "POST" });
      renderEmergencies(data);
      setBackendStatus(`Assigned ${data.assignedEmergencyId} to ${data.assignedVehicleId}`);
    } catch (error) {
      setBackendStatus(error.message, true);
    } finally {
      process.disabled = false;
    }
  });
});
