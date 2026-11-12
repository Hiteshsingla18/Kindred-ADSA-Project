const page = document.body.dataset.page;
const views = {
  array: { title: "Array", kicker: "01 / TRAFFIC SENSOR DATA", description: "A fixed, indexed row of traffic-density readings that helps the city spot congestion.", why: "Why: sensor values arrive in predictable slots and need quick indexed access.", how: "How: search for the busiest reading, sort the values, or reverse the time window to compare flow.", complexity: "O(n) search · O(n log n) sort", action: "Run operation" },
  linked: { title: "Linked list", kicker: "02 / RESOURCE FLOW", description: "A chain of vehicle nodes that can grow and shrink without moving the rest of the fleet.", why: "Why: vehicles continuously enter and leave the available fleet.", how: "How: insert a vehicle node when it is free; unlink it when dispatched.", complexity: "O(1) insert", action: "Insert vehicle" },
  stack: { title: "Stack", kicker: "03 / ROUTE HISTORY", description: "The last route chosen sits on top, ready for undo and redo.", why: "Why: dispatchers often need to return to the most recently viewed route.", how: "How: push every selected route; pop the top route to undo it.", complexity: "O(1) push / pop", action: "Push route" },
  queue: { title: "Priority queue", kicker: "04 / EMERGENCY DESK", description: "Calls wait fairly, while the highest-priority emergency gets processed first.", why: "Why: a critical medical call cannot wait behind a routine complaint.", how: "How: enqueue each call with priority; dequeue the smallest priority number.", complexity: "O(log n) priority", action: "Add emergency" },
  tree: { title: "Decision tree", kicker: "05 / EMERGENCY TRIAGE", description: "A branching triage model that turns emergency answers into the right team and response priority.", why: "Why: the dispatcher needs a consistent route from emergency type to action.", how: "How: traverse one question at a time until the leaf assigns a team, vehicle, and priority.", complexity: "O(height) traversal", action: "Animate traversal" },
  graph: { title: "Graph", kicker: "06 / GPS ROUTING", description: "Vertices are response stations; weighted edges are roads between them.", why: "Why: an emergency route depends on connections and travel distance.", how: "How: visit neighbours with BFS/DFS or relax edge weights using Dijkstra.", complexity: "Dijkstra O(E log V)", action: "Animate route" }
};
function selectedStationTypes() {
  return [...document.querySelectorAll(".station-filter:checked")].map((input) => input.value);
}
function visibleResponseStations() {
  const selectedTypes = selectedStationTypes();
  return Object.entries(responseStations).filter(([, station]) => selectedTypes.includes(station.type));
}
const config = views[page];
document.querySelector("#lab-kicker").textContent = config.kicker;
document.querySelector("#lab-title").innerHTML = `${config.title}<br><em>in the field.</em>`;
document.querySelector("#lab-description").textContent = config.description;
document.querySelector("#why-how").innerHTML = `<strong>${config.why}</strong><br>${config.how}`;
document.querySelector("#complexity").textContent = config.complexity;
const places = ["Connaught Place", "India Gate", "Saket", "Hauz Khas", "Karol Bagh", "Dwarka", "Rohini"];
const graphStations = {
  "Connaught Place": [28.6315, 77.2167], "India Gate": [28.6129, 77.2295],
  "Saket": [28.5244, 77.2066], "Hauz Khas": [28.5494, 77.2001],
  "Karol Bagh": [28.6514, 77.1907], "Dwarka": [28.5921, 77.046],
  "Rohini": [28.7495, 77.0565]
};
const responseStations = {
  "AIIMS Trauma Centre": { type: "Hospital", lat: 28.5672, lng: 77.2100 },
  "Safdarjung Hospital": { type: "Hospital", lat: 28.5677, lng: 77.2066 },
  "Lok Nayak Hospital": { type: "Hospital", lat: 28.6391, lng: 77.2407 },
  "Deen Dayal Upadhyay Hospital": { type: "Hospital", lat: 28.6651, lng: 77.1465 },
  "GTB Hospital": { type: "Hospital", lat: 28.6853, lng: 77.3026 },
  "Central Police Station": { type: "Police station", lat: 28.6353, lng: 77.2249 },
  "Saket Police Station": { type: "Police station", lat: 28.5245, lng: 77.2110 },
  "Dwarka Sector 10 Police": { type: "Police station", lat: 28.5814, lng: 77.0585 },
  "Rohini Sector 18 Police": { type: "Police station", lat: 28.7378, lng: 77.1183 },
  "Hauz Khas Police Station": { type: "Police station", lat: 28.5498, lng: 77.2020 }
};
const emergencyLocations = {
  "Chandni Chowk": [28.6506, 77.2303], "India Gate": [28.6129, 77.2295],
  "Saket": [28.5244, 77.2066], "Dwarka Sector 10": [28.5813, 77.0585],
  "Rohini Sector 18": [28.7376, 77.1180], "Hauz Khas": [28.5494, 77.2001]
};

function renderBase() {
  const output = document.querySelector("#output");
  if (page === "array") renderArray([12, 8, 15, 6, 11, 9, 18, 7, 14, 10, 5, 13]);
  if (page === "linked") renderLinked(["VH-014 · Ambulance", "VH-038 · Fire truck", "VH-061 · Patrol car", "VH-087 · Ambulance"]);
  if (page === "stack") renderStack(["India Gate → Saket", "CP → Lajpat Nagar", "Dwarka → Rohini"]);
  if (page === "queue") renderQueue([{ place: "India Gate", priority: 1 }, { place: "Connaught Place", priority: 1 }, { place: "Saket", priority: 2 }, { place: "Dwarka", priority: 3 }]);
  if (page === "tree") renderTree("Medical emergency", "Critical", "Ambulance + trauma team", "P1");
  if (page === "graph") renderRoute([]);
}
function renderArray(values, activeIndex = -1, log = "Choose an operation to inspect the response-time readings.") {
  document.querySelector("#output").innerHTML = `<div class="array-cells">${values.map((value, i) => `<span class="cell ${i === activeIndex ? "active" : ""}"><small>index ${i}</small>${value}<em> min</em></span>`).join("")}</div><div class="array-meter"><span style="width:${Math.min(Math.max(Math.max(...values) * 5, 0), 100)}%"></span></div><div class="log">${log}</div>`;
}
function renderGraphGps(stops, emergencyName = "") {
  const target = document.querySelector("#graph-map");
  if (!target) return;
  const minLat = 28.50, maxLat = 28.77, minLng = 77.02, maxLng = 77.25;
  const project = ([lat, lng]) => `${((lng - minLng) / (maxLng - minLng) * 100).toFixed(2)},${((maxLat - lat) / (maxLat - minLat) * 100).toFixed(2)}`;
  const markers = visibleResponseStations().map(([name, station]) => {
    const [left, top] = project([station.lat, station.lng]).split(",");
    return `<span class="graph-gps-marker station-marker" data-name="${name}" style="left:${left}%;top:${top}%"><i></i><b>${name}</b></span>`;
  }).join("");
  const emergencyMarker = emergencyName ? (() => { const [left, top] = project(emergencyLocations[emergencyName]).split(","); return `<span class="graph-gps-marker emergency-marker" style="left:${left}%;top:${top}%"><i></i><b>${emergencyName}</b></span>`; })() : "";
  target.innerHTML = `<div class="graph-gps-grid"></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M5 88 L28 67 L48 50 L76 32 L95 12" class="graph-gps-road"/><path d="M28 67 L42 17 L76 32 L88 78" class="graph-gps-road faint"/></svg>${markers}${emergencyMarker}<span class="graph-gps-label">SATELLITE RESPONSE NETWORK</span><span class="graph-gps-status">${emergencyName ? "Emergency location selected" : "Select a location to dispatch"}</span>`;
}
function renderDistanceNetwork(location, ranked = []) {
  const target = document.querySelector("#distance-network");
  if (!target || !location) return;
  const center = { x: 50, y: 50 };
  const positions = [[17, 18], [82, 18], [12, 76], [88, 76], [50, 10], [50, 90], [18, 50], [82, 50]];
  const maxDistance = Math.max(...ranked.map((item) => item.distance), 1);
  const lines = ranked.map((item, index) => {
    const [x, y] = positions[index % positions.length];
    const shortest = index === 0;
    return `<line class="distance-edge ${shortest ? "shortest-edge" : ""}" x1="${center.x}" y1="${center.y}" x2="${x}" y2="${y}" style="--edge-delay:${index * 180}ms"></line><text class="distance-label" x="${(center.x + x) / 2}" y="${(center.y + y) / 2 - 2}">${item.distance.toFixed(1)} km</text><g class="distance-node ${shortest ? "shortest-node" : ""}" transform="translate(${x} ${y})"><circle r="8"></circle><text y="17">${item.name.replace(" Police", "").replace(" Hospital", "")}</text></g>`;
  }).join("");
  target.innerHTML = `<svg viewBox="0 0 100 100" role="img" aria-label="Distance weighted response graph">${lines}<g class="emergency-node" transform="translate(${center.x} ${center.y})"><circle r="11"></circle><text y="20">${location}</text></g></svg>`;
}
function runEmergencyTraversal(location) {
  const summary = document.querySelector("#route-summary");
  const steps = document.querySelector("#graph-steps");
  const [lat, lng] = emergencyLocations[location];
  const eligibleStations = visibleResponseStations();
  if (!eligibleStations.length) {
    summary.innerHTML = "<strong>Select at least one checkpoint type.</strong><span class=\"route-stat\">Choose Police stations or Hospitals before starting traversal.</span>";
    return;
  }
  const ranked = eligibleStations.map(([name, station]) => ({ name, station, distance: Math.hypot((lat - station.lat) * 111, (lng - station.lng) * 103) })).sort((a, b) => a.distance - b.distance);
  if (window.kindredGraphMap) {
    const emergencyMarker = new google.maps.Marker({ position: { lat, lng }, map: window.kindredGraphMap, title: `Emergency: ${location}`, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#e87862", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
    window.kindredGraphMap.panTo({ lat, lng });
    window.kindredGraphEmergencyMarker = emergencyMarker;
  } else {
    renderGraphGps([], location);
  }
  renderDistanceNetwork(location, ranked);
  steps.innerHTML = ranked.map((item, index) => `<div class="graph-step" data-step="${index}"><span>${index + 1}</span>Checking ${item.name}<small>${item.distance.toFixed(1)} km weighted edge</small></div>`).join("");
  summary.innerHTML = "Dijkstra is traversing the response network…";
  ranked.forEach((item, index) => setTimeout(() => {
    document.querySelector(`[data-step="${index}"]`).classList.add("visited");
    if (index === ranked.length - 1) {
      const nearest = ranked[0];
      document.querySelector(`[data-step="0"]`).classList.add("selected");
      document.querySelector("#distance-network .shortest-edge").classList.add("route-revealed");
      summary.innerHTML = `<strong>Request sent to nearest station</strong><span class="route-stat">${location} → ${nearest.name}</span><span class="route-stat">${nearest.station.type} · ${nearest.distance.toFixed(1)} km estimated network distance · dispatch ready</span>`;
    }
  }, index * 600));
}
function setupGoogleGraphMap() {
  const target = document.querySelector("#graph-map");
  if (!target || !window.KINDRED_GOOGLE_MAPS_KEY || window.KINDRED_GOOGLE_MAPS_KEY.includes("PASTE_")) return;
  window.kindredGraphMapReady = () => {
    const map = new google.maps.Map(target, { center: { lat: 28.6139, lng: 77.209 }, zoom: 11, mapTypeId: "satellite", mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
    window.kindredGraphMap = map;
    window.kindredGraphMarkers = [];
    refreshGoogleGraphMarkers();
    window.kindredGraphMap = map;
  };
  const script = document.createElement("script");
  script.onerror = () => {
    const summary = document.querySelector("#route-summary");
    if (summary) summary.innerHTML = "<strong>Google Maps could not load.</strong><span class=\"route-stat\">Check the key, billing, Maps JavaScript API, and localhost restriction.</span>";
  };
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.KINDRED_GOOGLE_MAPS_KEY)}&callback=kindredGraphMapReady`;
  script.async = true; script.defer = true; document.head.appendChild(script);
}
function refreshGoogleGraphMarkers() {
  if (!window.kindredGraphMap) return;
  (window.kindredGraphMarkers || []).forEach((marker) => marker.setMap(null));
  window.kindredGraphMarkers = visibleResponseStations().map(([name, station]) => new google.maps.Marker({
    position: { lat: station.lat, lng: station.lng }, map: window.kindredGraphMap, title: `${name} · ${station.type}`
  }));
}
function renderLinked(items) {
  document.querySelector("#output").innerHTML = `<div class="array-cells">${items.map((item, i) => `<span class="cell ${i === 0 ? "active" : ""}">${item}${i < items.length - 1 ? " →" : " → null"}</span>`).join("")}</div><div class="log">head → node → node → tail · insert and remove update pointers</div>`;
}
function renderStack(items) {
  const top = items[items.length - 1];
  document.querySelector("#output").innerHTML = `<div class="stack-cells">${items.map((item, i) => `<span class="cell ${i === items.length - 1 ? "active" : ""}">${item}${i === items.length - 1 ? " · TOP" : ""}</span>`).reverse().join("")}</div><div class="log">TOP → ${top || "empty"} · POP removes the top item first · bottom stays until it reaches the top</div>`;
}
function renderQueue(items) {
  const sorted = [...items].sort((a, b) => a.priority - b.priority);
  document.querySelector("#output").innerHTML = `<div class="queue-cells">${sorted.map((item, i) => `<span class="cell ${i === 0 ? "active" : ""}">P${item.priority} · ${item.place}</span>`).join("")}</div><div class="log">front → ${sorted[0] ? `P${sorted[0].priority} at ${sorted[0].place}` : "empty"} · priority then FIFO</div>`;
}
function renderTree(type, severity, response, priority) {
  document.querySelector("#output").innerHTML = `<div class="decision-tree"><span class="tree-node">Emergency</span><i>→</i><span class="tree-node">${type.replace(" emergency", "")}</span><i>→</i><span class="tree-node">${severity}</span><i>→</i><span class="tree-node active">${priority}<small>${response}</small></span></div><div class="steps tree-steps"><span class="step">1 · Read emergency type</span><span class="step">2 · Compare severity</span><span class="step">3 · Reach response leaf</span></div><div class="log">root → type branch → severity branch → response leaf</div>`;
}
function renderRoute(stops, activeIndex = -1) {
  renderGraphGps(stops);
  const stopBox = document.querySelector("#route-stops");
  if (stopBox) stopBox.innerHTML = stops.length ? stops.map((stop, index) => `<span class="route-stop ${index === activeIndex ? "active" : ""}">${index + 1}. ${stop}<button data-index="${index}" aria-label="Remove ${stop}">×</button></span>`).join("") : `<span class="route-empty">Add at least two Delhi places to create a route.</span>`;
  const summary = document.querySelector("#route-summary");
  if (summary && stops.length < 2) summary.textContent = "Add at least two places, then find the real route.";
}
function setupControls() {
  if (page === "array") {
    let readings = [12, 8, 15, 6, 11, 9, 18, 7, 14, 10, 5, 13];
    document.querySelector("#action").addEventListener("click", () => {
      const operation = document.querySelector("#array-action").value;
      const zone = document.querySelector("#array-zone").value;
      if (operation === "sort") { readings = [...readings].sort((a, b) => a - b); renderArray(readings, 0, `${zone} · sorted ascending · fastest response is ${readings[0]} minutes`); }
      if (operation === "reverse") { readings.reverse(); renderArray(readings, 0, `${zone} · reversed shift order · last reading is now at index 0`); }
      if (operation === "search") { const fastest = Math.min(...readings); renderArray(readings, readings.indexOf(fastest), `${zone} · linear search checked ${readings.length} indices · fastest response is ${fastest} minutes`); }
    });
  }
  if (page === "queue") {
    let items = [{ place: "India Gate", priority: 1 }, { place: "Connaught Place", priority: 1 }, { place: "Saket", priority: 2 }, { place: "Dwarka", priority: 3 }];
    document.querySelector("#enqueue-action").addEventListener("click", () => { items.push({ place: document.querySelector("#queue-place").value, priority: Number(document.querySelector("#queue-priority").value) }); renderQueue(items); });
    document.querySelector("#dequeue-action").addEventListener("click", () => { items.sort((a, b) => a.priority - b.priority); items.shift(); renderQueue(items); });
  }
  if (page === "stack") {
    let items = ["India Gate → Saket", "CP → Lajpat Nagar", "Dwarka → Rohini"];
    document.querySelector("#stack-push").addEventListener("click", () => { items.push(document.querySelector("#stack-route").value); renderStack(items); });
    document.querySelector("#stack-pop").addEventListener("click", () => { items.pop(); renderStack(items); });
    document.querySelector("#stack-peek").addEventListener("click", () => { const log = document.querySelector(".log"); log.textContent = `PEEK → ${items[items.length - 1] || "stack is empty"} · nothing was removed`; });
    document.querySelector("#stack-clear").addEventListener("click", () => { items = []; renderStack(items); });
  }
  if (page === "linked") {
    let items = ["VH-014 · Ambulance", "VH-038 · Fire truck", "VH-061 · Patrol car", "VH-087 · Ambulance"];
    document.querySelector("#fleet-add").addEventListener("click", () => { items.unshift(`VH-${Math.floor(100 + Math.random() * 899)} · ${document.querySelector("#fleet-type").value} · ${document.querySelector("#fleet-place").value}`); renderLinked(items); });
    document.querySelector("#fleet-remove").addEventListener("click", () => { items.shift(); renderLinked(items); });
    document.querySelector("#fleet-reverse").addEventListener("click", () => { items.reverse(); renderLinked(items); });
  }
  if (page === "tree") document.querySelector("#tree-run").addEventListener("click", () => { const type = document.querySelector("#tree-type").value; const severity = document.querySelector("#tree-severity").value; const response = type.startsWith("Medical") ? "Ambulance + trauma team" : type.startsWith("Fire") ? "Fire truck + rescue team" : type.startsWith("Road") ? "Ambulance + patrol car" : "Patrol car + control room"; const priority = severity === "Critical" ? "P1" : severity === "Urgent" ? "P2" : "P3"; renderTree(type, severity, response, priority); document.querySelectorAll(".tree-steps .step").forEach((step, index) => setTimeout(() => step.classList.add("active"), index * 650)); });
  if (page === "graph") {
    document.querySelector("#graph-run").addEventListener("click", () => runEmergencyTraversal(document.querySelector("#graph-place").value));
    document.querySelectorAll(".station-filter").forEach((input) => input.addEventListener("change", () => {
      if (window.kindredGraphMap) refreshGoogleGraphMarkers();
      else renderGraphGps([]);
    }));
  }
}
renderBase();
if (page === "graph") setupGoogleGraphMap();
setupControls();
