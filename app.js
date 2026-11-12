const zones = ["Connaught Place", "Lajpat Nagar", "Dwarka", "Rohini", "Saket", "Karol Bagh", "Hauz Khas", "Vasant Kunj", "Shahdara", "Civil Lines", "India Gate", "Noida border"];
const emergencyTypes = ["Medical", "Fire", "Accident", "Public safety"];
const pad = (number) => String(number).padStart(3, "0");
const emergencies = Array.from({ length: 100 }, (_, index) => ({ id: `KD-${pad(index + 1)}`, type: emergencyTypes[index % 4], location: zones[(index * 5 + 2) % zones.length], priority: index % 11 === 0 ? "P1" : index % 3 === 0 ? "P2" : "P3", reported: `${String(7 + Math.floor(index / 8)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`, status: index < 3 ? "In progress" : "Waiting" }));
const vehicles = Array.from({ length: 100 }, (_, index) => ({ id: `VH-${pad(index + 1)}`, type: ["Ambulance", "Fire truck", "Patrol car"][index % 3], zone: zones[(index * 3) % zones.length], status: index % 7 === 0 ? "On call" : "Ready" }));
const rank = (priority) => Number(priority.slice(1));
const queue = () => [...emergencies].sort((a, b) => rank(a.priority) - rank(b.priority) || a.id.localeCompare(b.id));
let visibleRows = 8;
function renderEmergencies() {
  const table = document.querySelector("#emergency-table");
  if (!table) return;
  table.innerHTML = queue().slice(0, visibleRows).map((item) => `<tr><td>${item.id}</td><td>${item.type}</td><td>${item.location}</td><td><span class="priority ${item.priority.toLowerCase()}">${item.priority}</span></td><td>${item.reported}</td><td><span class="status">${item.status}</span></td></tr>`).join("");
  document.querySelector("#emergency-total").textContent = emergencies.length;
  document.querySelector("#queue-count").textContent = `${emergencies.filter((item) => item.status === "Waiting").length} waiting`;
  document.querySelector("#open-count").textContent = emergencies.filter((item) => item.status !== "Completed").length;
  document.querySelector("#ready-count").textContent = vehicles.filter((vehicle) => vehicle.status === "Ready").length;
  document.querySelector("#zone-count").textContent = new Set(emergencies.map((item) => item.location)).size;
}
function setupDelhiMap() {
  const target = document.querySelector("#delhi-map");
  if (!target) return;
  const stations = [
    ["Connaught Place", 28.6315, 77.2167], ["Mandi House", 28.6259, 77.2345], ["India Gate", 28.6129, 77.2295],
    ["Khan Market", 28.6001, 77.2271], ["Lajpat Nagar Central Market", 28.5700, 77.2405], ["Jangpura", 28.5833, 77.2428],
    ["Hauz Khas Village", 28.5535, 77.1947], ["Saket Select Citywalk", 28.5287, 77.2195], ["Malviya Nagar", 28.5355, 77.2110],
    ["Karol Bagh Metro", 28.6443, 77.1887], ["Majnu ka Tilla", 28.7000, 77.2270], ["Dwarka Sector 10", 28.5823, 77.0580]
  ];
  if (window.KINDRED_GOOGLE_MAPS_KEY && !window.KINDRED_GOOGLE_MAPS_KEY.includes("PASTE_YOUR")) {
    loadGoogleMap(target, stations, window.KINDRED_GOOGLE_MAPS_KEY);
    return;
  }
  let bounds = { minLat: 28.50, maxLat: 28.73, minLng: 77.05, maxLng: 77.27 };
  const project = (lat, lng) => `${((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100},${100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100}`;
  renderLocalMap(target, stations, bounds, project);
  setupLocalMarkers(target, project);
  const locateButton = document.querySelector("#locate-me");
  if (locateButton) locateButton.addEventListener("click", () => {
    const status = document.querySelector("#gps-status");
    if (!navigator.geolocation) { status.textContent = "Live GPS is not available in this browser."; return; }
    status.textContent = "Requesting live GPS permission…";
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const latPadding = Math.max(Math.abs(latitude - 28.6139), 0.12) * 0.18;
      const lngPadding = Math.max(Math.abs(longitude - 77.2090), 0.12) * 0.18;
      bounds = {
        minLat: Math.min(28.50, latitude) - latPadding,
        maxLat: Math.max(28.73, latitude) + latPadding,
        minLng: Math.min(77.05, longitude) - lngPadding,
        maxLng: Math.max(77.27, longitude) + lngPadding
      };
      const refreshedProject = (lat, lng) => `${((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100},${100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100}`;
      renderLocalMap(target, stations, bounds, refreshedProject, [latitude, longitude]);
      setupLocalMarkers(target, refreshedProject);
      status.textContent = `LIVE GPS · ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E · Delhi network included`;
      document.querySelector("#route-result").textContent = "GPS live · Delhi network remains visible";
    }, () => { status.textContent = "GPS permission was unavailable · showing real Delhi station coordinates."; });
  });
}
function renderLocalMap(target, stations, bounds, project, liveCoordinates) {
  const markers = stations.map(([name, lat, lng], index) => `<button class="gps-marker ${index === 0 ? "active" : ""}" style="left:${project(lat, lng).split(",")[0]}%;top:${project(lat, lng).split(",")[1]}%" data-name="${name}" data-lat="${lat}" data-lng="${lng}" title="${name} · ${lat}, ${lng}"><span></span><b>${name}</b></button>`).join("");
  const live = liveCoordinates ? `<span class="live-marker" style="left:${project(liveCoordinates[0], liveCoordinates[1]).split(",")[0]}%;top:${project(liveCoordinates[0], liveCoordinates[1]).split(",")[1]}%" title="Your live position"></span>` : "";
  target.innerHTML = `<div class="gps-map"><div class="gps-grid"></div><div class="gps-label gps-north">${bounds.maxLat.toFixed(2)}° N</div><div class="gps-label gps-south">${bounds.minLat.toFixed(2)}° N</div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="gps-road" d="M8 84 L31 69 L48 50 L64 35 L82 19"/><path class="gps-road faint" d="M31 69 L44 25 L64 35 L71 78"/><polyline class="gps-route" points=""></polyline></svg>${markers}${live}<div class="gps-legend"><strong>DELHI GPS NETWORK</strong><span>● station marker</span><span>● live device position</span><span>⌁ straight-line preview</span></div></div>`;
}
function setupLocalMarkers(target, project) {
  target.querySelectorAll(".gps-marker").forEach((marker) => marker.addEventListener("click", () => {
    target.querySelectorAll(".gps-marker").forEach((item) => item.classList.remove("active"));
    marker.classList.add("active");
    target.querySelector(".gps-route").setAttribute("points", `${project(28.6315, 77.2167)} ${project(Number(marker.dataset.lat), Number(marker.dataset.lng))}`);
    document.querySelector("#route-result").textContent = `Straight-line GPS preview · ${marker.dataset.name}`;
  }));
}
function loadGoogleMap(target, stations, key) {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=kindredGoogleMapReady`;
  script.async = true;
  script.defer = true;
  window.kindredGoogleMapReady = () => {
    const map = new google.maps.Map(target, {
      center: { lat: 28.6139, lng: 77.2090 },
      zoom: 12,
      mapTypeId: "satellite",
      mapTypeControl: true,
      mapTypeControlOptions: { mapTypeIds: ["roadmap", "terrain", "satellite", "hybrid"] },
      streetViewControl: true,
      fullscreenControl: true
    });
    const route = new google.maps.Polyline({ path: [], geodesic: true, strokeColor: "#e87862", strokeOpacity: 0.9, strokeWeight: 4, map });
    stations.forEach(([name, lat, lng], index) => {
      const marker = new google.maps.Marker({ position: { lat, lng }, map, title: name, label: index === 0 ? "A" : undefined });
      const info = new google.maps.InfoWindow({ content: `<strong>${name}</strong><br>GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}<br><small>Real Delhi coordinate</small>` });
      marker.addListener("click", () => { info.open({ map, anchor: marker }); route.setPath([{ lat: stations[0][1], lng: stations[0][2] }, { lat, lng }]); document.querySelector("#route-result").textContent = `Straight-line GPS preview · ${name}`; });
    });
    const locateButton = document.querySelector("#locate-me");
    if (locateButton) locateButton.addEventListener("click", () => {
      const status = document.querySelector("#gps-status");
      if (!navigator.geolocation) { status.textContent = "Live GPS is not available in this browser."; return; }
      status.textContent = "Requesting live GPS permission…";
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude };
        new google.maps.Marker({ position, map, title: "Your live location", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#2c82c9", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
        map.panTo(position);
        status.textContent = `LIVE GPS · ${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E`;
      }, () => { status.textContent = "GPS permission was unavailable."; });
    });
  };
  script.onerror = () => { target.innerHTML = "<div class=\"map-error\">Google Maps could not load. Check your API key and billing, then refresh.</div>"; };
  document.head.appendChild(script);
}
document.addEventListener("DOMContentLoaded", () => {
  renderEmergencies(); setupDelhiMap();
  const more = document.querySelector("#show-more");
  if (more) more.addEventListener("click", () => { visibleRows += 8; renderEmergencies(); });
  const process = document.querySelector("#process-btn");
  if (process) process.addEventListener("click", () => {
    const next = queue().find((item) => item.status === "Waiting");
    const ready = vehicles.find((vehicle) => vehicle.status === "Ready");
    if (!next || !ready) return;
    next.status = "In progress";
    ready.status = "On call";
    renderEmergencies();
    process.textContent = "Next request assigned ✓";
    setTimeout(() => { process.innerHTML = "Process next <span>→</span>"; }, 1800);
  });
});
