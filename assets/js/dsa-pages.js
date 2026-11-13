const page = document.body.dataset.page;
const views = {
  array: { title: "Array", kicker: "01 / TRAFFIC SENSOR DATA", description: "A fixed, indexed row of traffic-density readings that helps the city spot congestion.", why: "Why: sensor values arrive in predictable slots and need quick indexed access.", how: "How: search for the busiest reading, sort the values, or reverse the time window to compare flow.", complexity: "O(n) search · O(n log n) sort", action: "Run operation" },
  linked: { title: "Linked list", kicker: "02 / RESOURCE FLOW", description: "A chain of vehicle nodes that can grow and shrink without moving the rest of the fleet.", why: "Why: vehicles continuously enter and leave the available fleet.", how: "How: insert a vehicle node when it is free; unlink it when dispatched.", complexity: "O(1) insert", action: "Insert vehicle" },
  stack: { title: "Stack", kicker: "03 / ROUTE HISTORY", description: "The last route chosen sits on top, ready for undo and redo.", why: "Why: dispatchers often need to return to the most recently viewed route.", how: "How: push every selected route; pop the top route to undo it.", complexity: "O(1) push / pop", action: "Push route" },
  queue: { title: "Priority queue", kicker: "04 / EMERGENCY DESK", description: "Calls wait fairly, while the highest-priority emergency gets processed first.", why: "Why: a critical medical call cannot wait behind a routine complaint.", how: "How: a binary min-heap keeps the smallest priority number at the root; arrival order breaks ties.", complexity: "O(log n) insert / remove", action: "Add emergency" },
  tree: { title: "Decision tree", kicker: "05 / EMERGENCY TRIAGE", description: "A branching triage model that turns emergency answers into the right team and response priority.", why: "Why: the dispatcher needs a consistent route from emergency type to action.", how: "How: traverse one question at a time until the leaf assigns a team, vehicle, and priority.", complexity: "O(height) traversal", action: "Animate traversal" },
  graph: { title: "Graph", kicker: "06 / GPS ROUTING", description: "Vertices are response stations and junctions; weighted edges are estimated road segments.", why: "Why: an emergency route depends on connected roads, not just which station is closest in a straight line.", how: "How: Dijkstra repeatedly settles the reachable place with the lowest known distance.", complexity: "Dijkstra O(E log V)", action: "Animate route" }
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
const roadJunctions = {
  "Central Delhi Junction": [28.632, 77.224],
  "South Delhi Junction": [28.565, 77.210],
  "West Delhi Junction": [28.625, 77.120],
  "North Delhi Junction": [28.700, 77.185],
  "East Delhi Junction": [28.675, 77.270]
};
const roadConnections = [
  ["Chandni Chowk", "Central Delhi Junction"],
  ["India Gate", "Central Delhi Junction"],
  ["Central Police Station", "Central Delhi Junction"],
  ["Lok Nayak Hospital", "Central Delhi Junction"],
  ["Central Delhi Junction", "South Delhi Junction"],
  ["Central Delhi Junction", "North Delhi Junction"],
  ["Central Delhi Junction", "East Delhi Junction"],
  ["North Delhi Junction", "West Delhi Junction"],
  ["North Delhi Junction", "GTB Hospital"],
  ["North Delhi Junction", "Rohini Sector 18 Police"],
  ["Rohini Sector 18", "Rohini Sector 18 Police"],
  ["South Delhi Junction", "AIIMS Trauma Centre"],
  ["South Delhi Junction", "Safdarjung Hospital"],
  ["South Delhi Junction", "Hauz Khas Police Station"],
  ["South Delhi Junction", "Saket Police Station"],
  ["Hauz Khas", "Hauz Khas Police Station"],
  ["Saket", "Saket Police Station"],
  ["South Delhi Junction", "West Delhi Junction"],
  ["West Delhi Junction", "Dwarka Sector 10 Police"],
  ["Dwarka Sector 10", "Dwarka Sector 10 Police"],
  ["West Delhi Junction", "Deen Dayal Upadhyay Hospital"],
  ["East Delhi Junction", "GTB Hospital"]
];
let queueItems = [];
let queueBusy = false;
let graphRunId = 0;

function coordinatesFor(name) {
  if (emergencyLocations[name]) return emergencyLocations[name];
  if (roadJunctions[name]) return roadJunctions[name];
  const station = responseStations[name];
  return station ? [station.lat, station.lng] : null;
}

function renderBase() {
  const output = document.querySelector("#output");
  if (page === "array") renderArray([12, 8, 15, 6, 11, 9, 18, 7, 14, 10, 5, 13]);
  if (page === "linked") renderLinked(["VH-014 · Ambulance", "VH-038 · Fire truck", "VH-061 · Patrol car", "VH-087 · Ambulance"]);
  if (page === "stack") renderStack(["India Gate → Saket", "CP → Lajpat Nagar", "Dwarka → Rohini"]);
  if (page === "queue") renderQueue([], "Loading the C++ priority queue…");
  if (page === "tree") renderTree("Medical emergency", "Critical", "Ambulance + trauma team", "P1");
  if (page === "graph") renderRoute([]);
}
function renderArray(values, activeIndex = -1, log = "Choose an operation to inspect the response-time readings.") {
  document.querySelector("#output").innerHTML = `<div class="array-cells">${values.map((value, i) => `<span class="cell ${i === activeIndex ? "active" : ""}"><small>index ${i}</small>${value}<em> min</em></span>`).join("")}</div><div class="array-meter"><span style="width:${Math.min(Math.max(Math.max(...values) * 5, 0), 100)}%"></span></div><div class="log">${log}</div>`;
}
let graphMap = null;
let graphRoadGroup = null;
let graphStationGroup = null;
let graphEmergencyGroup = null;
let graphJunctionGroup = null;
let graphRouteGroup = null;
let graphVehicleMarker = null;

function setupLeafletGraphMap() {
  const target = document.querySelector("#graph-map");
  if (!target || !window.L) return;
  if (graphMap) return;

  graphMap = L.map(target, {
    scrollWheelZoom: true
  });

  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(graphMap);

  graphRoadGroup = L.layerGroup().addTo(graphMap);
  graphJunctionGroup = L.layerGroup().addTo(graphMap);
  graphStationGroup = L.layerGroup().addTo(graphMap);
  graphEmergencyGroup = L.layerGroup().addTo(graphMap);
  graphRouteGroup = L.layerGroup().addTo(graphMap);

  renderGraphTopology();
  refreshStationMarkers();
  refreshEmergencyMarkers();

  const allCoords = [
    ...Object.values(emergencyLocations),
    ...Object.values(responseStations).map((s) => [s.lat, s.lng]),
    ...Object.values(roadJunctions)
  ];
  const networkBounds = L.latLngBounds(allCoords).pad(0.15);
  graphMap.fitBounds(networkBounds, { padding: [16, 16], maxZoom: 12 });

  setTimeout(() => {
    if (graphMap) {
      graphMap.invalidateSize();
      graphMap.fitBounds(networkBounds, { padding: [16, 16], maxZoom: 12 });
    }
  }, 200);
}

function renderGraphTopology() {
  if (!graphMap || !graphRoadGroup) return;
  graphRoadGroup.clearLayers();
  graphJunctionGroup.clearLayers();

  roadConnections.forEach(([from, to]) => {
    const fromCoord = coordinatesFor(from);
    const toCoord = coordinatesFor(to);
    if (!fromCoord || !toCoord) return;
    const polyline = L.polyline([fromCoord, toCoord], {
      color: "#2b4c59",
      weight: 3,
      opacity: 0.8,
      dashArray: "4, 6"
    }).addTo(graphRoadGroup);
    polyline.bindTooltip(`🛣️ Road: ${from} ↔ ${to}`, { sticky: true });
  });

  Object.entries(roadJunctions).forEach(([name, coord]) => {
    const icon = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="graph-junction-pin" title="${name}"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });
    const marker = L.marker(coord, { icon }).addTo(graphJunctionGroup);
    marker.bindTooltip(`⚡ Junction: ${name}`);
  });
}

function refreshStationMarkers() {
  if (!graphMap || !graphStationGroup) return;
  graphStationGroup.clearLayers();
  const selectedTypes = selectedStationTypes();

  Object.entries(responseStations).forEach(([name, station]) => {
    if (!selectedTypes.includes(station.type)) return;
    const isHospital = station.type === "Hospital";
    const iconClass = isHospital ? "hospital" : "police";
    const iconSymbol = isHospital ? "🏥" : "🚓";
    const displayName = name.replace(" Police Station", " Police").replace(" Police", "").replace(" Hospital", "");
    const icon = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="graph-station-pin ${iconClass}" data-station="${name}">
               <span class="pin-icon">${iconSymbol}</span>
               <span>${displayName}</span>
             </div>`,
      iconSize: null,
      iconAnchor: [20, 12]
    });
    const marker = L.marker([station.lat, station.lng], { icon }).addTo(graphStationGroup);
    marker.bindTooltip(`<strong>${name}</strong><br><span style="color:${isHospital ? '#e57373' : '#4fc3f7'}">${station.type}</span>`);
    marker.bindPopup(`
      <div style="font-family:'Space Grotesk',sans-serif;min-width:180px;">
        <h4 style="margin:0 0 4px;font-size:13px;color:#1864ab;">${iconSymbol} ${name}</h4>
        <div style="font-size:11px;color:#495057;">Eligible Type: <strong>${station.type}</strong></div>
        <div style="font-size:10px;color:#868e96;margin-top:4px;">GPS: ${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}</div>
      </div>
    `);
  });
}

function selectEmergencyLocation(name) {
  const coord = emergencyLocations[name];
  if (!coord) return;
  const select = document.querySelector("#graph-place");
  if (select && select.value !== name) select.value = name;
  refreshEmergencyMarkers();
  if (graphMap) graphMap.flyTo(coord, 12, { duration: 0.8 });
  const summary = document.querySelector("#route-summary");
  if (summary) {
    summary.innerHTML = `<strong>Selected ${name}</strong><span class="route-stat">Click 'Find nearest response station' to run Dijkstra shortest path.</span>`;
  }
}

function refreshEmergencyMarkers() {
  if (!graphMap || !graphEmergencyGroup) return;
  graphEmergencyGroup.clearLayers();
  const selectedPlace = document.querySelector("#graph-place") ? document.querySelector("#graph-place").value : "Chandni Chowk";

  Object.entries(emergencyLocations).forEach(([name, coord]) => {
    const isSelected = name === selectedPlace;
    const icon = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="graph-emergency-pin ${isSelected ? "active-source" : ""}">
               ${isSelected ? '<span class="pulse-ring"></span>' : ''}
               <span>📍 ${name}</span>
             </div>`,
      iconSize: null,
      iconAnchor: [24, 12]
    });
    const marker = L.marker(coord, { icon }).addTo(graphEmergencyGroup);
    marker.bindTooltip(`Emergency Node: ${name}`);
    marker.on("click", () => {
      selectEmergencyLocation(name);
    });
  });
}

function animateVehicleAlongPath(coords, stationType) {
  if (!graphMap || coords.length < 2) return;
  if (graphVehicleMarker) {
    graphVehicleMarker.remove();
    graphVehicleMarker = null;
  }
  const vehicleEmoji = stationType === "Hospital" ? "🚑" : "🚓";
  const icon = L.divIcon({
    className: "custom-div-icon",
    html: `<div class="moving-vehicle-icon">${vehicleEmoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const marker = L.marker(coords[0], { icon, zIndexOffset: 2500 }).addTo(graphRouteGroup);
  graphVehicleMarker = marker;

  let currentSegment = 0;
  let progress = 0;
  const stepSize = 0.035;

  function move() {
    if (!graphVehicleMarker || currentSegment >= coords.length - 1) return;
    progress += stepSize;
    if (progress >= 1) {
      progress = 0;
      currentSegment++;
      if (currentSegment >= coords.length - 1) {
        marker.setLatLng(coords[coords.length - 1]);
        return;
      }
    }
    const p1 = coords[currentSegment];
    const p2 = coords[currentSegment + 1];
    const lat = p1[0] + (p2[0] - p1[0]) * progress;
    const lng = p1[1] + (p2[1] - p1[1]) * progress;
    marker.setLatLng([lat, lng]);
    requestAnimationFrame(move);
  }
  requestAnimationFrame(move);
}

function renderDistanceNetwork(location, path = []) {
  const target = document.querySelector("#distance-network");
  if (!target || !location) return;
  const project = (name) => {
    const [lat, lng] = coordinatesFor(name);
    return { x: 8 + ((lng - 77.02) / 0.30) * 84, y: 8 + ((28.77 - lat) / 0.27) * 84 };
  };
  const routeEdges = new Set(path.slice(1).map((name, index) => `${path[index]}|${name}`));
  const lines = roadConnections.map(([from, to], index) => {
    const start = project(from);
    const end = project(to);
    const routeEdge = routeEdges.has(`${from}|${to}`) || routeEdges.has(`${to}|${from}`);
    return `<line class="distance-edge ${routeEdge ? "shortest-edge route-revealed" : ""}" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" style="--edge-delay:${index * 30}ms"></line>`;
  }).join("");
  const nodes = [...Object.keys(emergencyLocations), ...Object.keys(roadJunctions), ...Object.keys(responseStations)];
  const markers = nodes.map((name) => {
    const position = project(name);
    const isStation = Object.prototype.hasOwnProperty.call(responseStations, name);
    const isSource = name === location;
    const isOnRoute = path.includes(name);
    const label = name.replace(" Police Station", " Police").replace(" Police", "").replace(" Hospital", "").replace(" Junction", " Jct.");
    return `<g class="distance-node ${isStation ? "station-node" : "junction-node"} ${isOnRoute ? "shortest-node" : ""}" transform="translate(${position.x} ${position.y})"><circle r="${isSource ? 3.2 : 2.2}"></circle><text y="-3">${label}</text></g>`;
  }).join("");
  const sourcePosition = project(location);
  const source = `<g class="emergency-node" transform="translate(${sourcePosition.x} ${sourcePosition.y})"><circle r="3.5"></circle></g>`;
  target.innerHTML = `<svg viewBox="0 0 100 100" role="img" aria-label="Illustrative weighted road graph with Dijkstra route">${lines}${markers}${source}</svg>`;
}

async function runEmergencyTraversal(location) {
  const summary = document.querySelector("#route-summary");
  const steps = document.querySelector("#graph-steps");
  const selectedTypes = selectedStationTypes();
  const runId = ++graphRunId;

  if (!selectedTypes.length) {
    summary.innerHTML = "<strong>Select at least one checkpoint type.</strong><span class=\"route-stat\">Choose Police stations or Hospitals before starting traversal.</span>";
    return;
  }
  summary.textContent = "Asking the C++ backend to search the road network…";

  try {
    const type = selectedTypes.length === 2 ? "all" : selectedTypes[0];
    const query = new URLSearchParams({ location, type });
    const result = await window.kindredApi(`/api/route?${query}`);
    if (runId !== graphRunId) return;

    if (graphMap) {
      selectEmergencyLocation(location);
      if (graphRouteGroup) graphRouteGroup.clearLayers();
    }

    renderDistanceNetwork(location, result.path);
    steps.innerHTML = result.settled.map((item, index) => `<div class="graph-step" data-step="${index}"><span>${index + 1}</span>Settled ${item.name}<small>${item.distance.toFixed(1)} km estimated from ${location}</small></div>`).join("");
    summary.textContent = "C++ Dijkstra is comparing the lowest known distance at each connected place…";

    result.settled.forEach((item, index) => setTimeout(() => {
      if (runId !== graphRunId) return;
      const step = document.querySelector(`[data-step="${index}"]`);
      if (step) step.classList.add("visited");

      const itemCoord = coordinatesFor(item.name);
      if (graphMap && itemCoord && graphRouteGroup) {
        const isTarget = index === result.settled.length - 1;
        const pulseCircle = L.circleMarker(itemCoord, {
          radius: isTarget ? 14 : 9,
          color: isTarget ? "#ffd54f" : "#4dabf7",
          weight: 2,
          fillColor: isTarget ? "#ffd54f" : "#74c0fc",
          fillOpacity: 0.6
        }).addTo(graphRouteGroup);
        if (!isTarget) {
          setTimeout(() => { pulseCircle.remove(); }, 1400);
        }
      }

      if (index === result.settled.length - 1) {
        if (step) step.classList.add("selected");
        summary.innerHTML = `<strong>Request sent to nearest eligible station</strong><span class="route-stat">${result.path.join(" → ")}</span><span class="route-stat">${result.stationType}: <strong>${result.station}</strong> · ${result.distance.toFixed(1)} km estimated graph distance</span>`;

        if (graphMap && graphRouteGroup) {
          const pathCoords = result.path.map((name) => coordinatesFor(name)).filter(Boolean);
          if (pathCoords.length >= 2) {
            L.polyline(pathCoords, {
              color: "#e87862",
              weight: 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round"
            }).addTo(graphRouteGroup);

            L.polyline(pathCoords, {
              color: "#ffffff",
              weight: 2,
              opacity: 0.85,
              dashArray: "6, 12",
              className: "animated-route-flow"
            }).addTo(graphRouteGroup);

            document.querySelectorAll(".graph-station-pin").forEach(p => p.classList.remove("selected-station"));
            const destPin = document.querySelector(`[data-station="${result.station}"]`);
            if (destPin) destPin.classList.add("selected-station");

            animateVehicleAlongPath(pathCoords.slice().reverse(), result.stationType);

            const destCoord = coordinatesFor(result.station);
            if (destCoord) {
              L.popup({ className: "graph-popup" })
                .setLatLng(destCoord)
                .setContent(`
                  <h4>🎯 Shortest Path Settled</h4>
                  <p><strong>${result.station}</strong></p>
                  <p>Distance: <strong>${result.distance.toFixed(1)} km</strong> (${result.path.length - 1} road segments)</p>
                  <span class="popup-tag ${result.stationType === 'Hospital' ? 'hospital' : 'police'}">${result.stationType} Dispatched</span>
                `)
                .openOn(graphMap);
            }

            graphMap.flyToBounds(L.latLngBounds(pathCoords).pad(0.35), { duration: 1.2 });
          }
        }
      }
    }, index * 450));
  } catch (error) {
    if (runId === graphRunId) summary.textContent = `C++ route request failed: ${error.message}`;
  }
}

function renderLinked(items) {
  document.querySelector("#output").innerHTML = `<div class="array-cells">${items.map((item, i) => `<span class="cell ${i === 0 ? "active" : ""}">${item}${i < items.length - 1 ? " →" : " → null"}</span>`).join("")}</div><div class="log">head → node → node → tail · insert and remove update pointers</div>`;
}
function renderStack(items) {
  const top = items[items.length - 1];
  document.querySelector("#output").innerHTML = `<div class="stack-cells">${items.map((item, i) => `<span class="cell ${i === items.length - 1 ? "active" : ""}">${item}${i === items.length - 1 ? " · TOP" : ""}</span>`).reverse().join("")}</div><div class="log">TOP → ${top || "empty"} · POP removes the top item first · bottom stays until it reaches the top</div>`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
function renderQueue(items, message = "") {
  const root = items[0];
  const cells = items.map((item, index) => `<span class="cell ${index === 0 ? "active" : ""}"><small>index ${index}</small>P${item.priority} · ${escapeHtml(item.place)}</span>`).join("");
  const status = message ? `${escapeHtml(message)} · ` : "";
  document.querySelector("#output").innerHTML = `<div class="queue-cells">${cells}</div><div class="log">${status}heap array · root → ${root ? `P${root.priority} at ${escapeHtml(root.place)}` : "empty"} · parents have higher priority than their children · equal priorities use arrival order</div>`;
}
async function refreshQueue() {
  try {
    const data = await window.kindredApi("/api/queue");
    queueItems = data.items;
    renderQueue(queueItems);
  } catch (error) {
    renderQueue(queueItems, `C++ backend error: ${error.message}`);
  }
}
async function submitQueueAction(path) {
  if (queueBusy) return;
  queueBusy = true;
  const buttons = [document.querySelector("#enqueue-action"), document.querySelector("#dequeue-action")];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const data = await window.kindredApi(path, { method: "POST" });
    queueItems = data.items;
    const message = Object.prototype.hasOwnProperty.call(data, "processed")
      ? data.processed ? `Processed P${data.processed.priority} call from ${data.processed.place}` : "Queue is empty; nothing was processed"
      : "Added a call to the queue";
    renderQueue(queueItems, message);
  } catch (error) {
    renderQueue(queueItems, `C++ backend error: ${error.message}`);
  } finally {
    queueBusy = false;
    buttons.forEach((button) => { button.disabled = false; });
  }
}
function renderTree(type, severity, response, priority) {
  document.querySelector("#output").innerHTML = `<div class="decision-tree"><span class="tree-node">Emergency</span><i>→</i><span class="tree-node">${type.replace(" emergency", "")}</span><i>→</i><span class="tree-node">${severity}</span><i>→</i><span class="tree-node active">${priority}<small>${response}</small></span></div><div class="steps tree-steps"><span class="step">1 · Read emergency type</span><span class="step">2 · Compare severity</span><span class="step">3 · Reach response leaf</span></div><div class="log">root → type branch → severity branch → response leaf</div>`;
}
function renderRoute(stops, activeIndex = -1) {
  if (page === "graph") setupLeafletGraphMap();
  const summary = document.querySelector("#route-summary");
  if (summary) summary.innerHTML = "<strong>Select an emergency node on the map</strong> or choose from the dropdown, then click <em>Find nearest response station</em>.";
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
    document.querySelector("#enqueue-action").addEventListener("click", () => {
      const query = new URLSearchParams({
        place: document.querySelector("#queue-place").value,
        priority: document.querySelector("#queue-priority").value
      });
      submitQueueAction(`/api/queue/add?${query}`);
    });
    document.querySelector("#dequeue-action").addEventListener("click", () => {
      submitQueueAction("/api/queue/next");
    });
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
      refreshStationMarkers();
    }));
    const placeSelect = document.querySelector("#graph-place");
    if (placeSelect) {
      placeSelect.addEventListener("change", () => {
        selectEmergencyLocation(placeSelect.value);
      });
    }
  }
}
renderBase();
if (page === "graph") setupLeafletGraphMap();
setupControls();
if (page === "queue") refreshQueue();
