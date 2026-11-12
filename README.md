# Kindred City

**A Smart City emergency-response dashboard and data-structures demo for New Delhi.**

Kindred City combines a browser-based command centre with a small C++ server. Its sample data and routes are educational demonstrations—not a live dispatch system or turn-by-turn navigation service.

## Features

- **Command centre:** view simulated emergencies, vehicles, and response stations.
- **Priority queue:** process emergencies by priority, preserving arrival order for ties.
- **Graph lab:** explore an illustrative weighted network and find the nearest eligible response station with Dijkstra's algorithm.
- **DSA visualizations:** explore arrays, linked lists, stacks, queues, trees, and graphs.
- **Delhi map:** view station coordinates on OpenStreetMap tiles, select a station for a straight-line preview, or optionally request browser location.

## Run locally

### Requirements

- Windows and PowerShell
- MinGW-w64 with `g++` available on `PATH`
- An internet connection for the dashboard's Leaflet library and OpenStreetMap map tiles

From the repository folder, run:

```powershell
.\start-localhost.ps1
```

The script compiles `backend\main.cpp`, then serves the site at <http://localhost:8000>. Leave the PowerShell window open while using the site; press **Ctrl+C** to stop the server. No database or third-party C++ library is needed.

To compile and start the server manually:

```powershell
g++ -std=c++17 -static backend\main.cpp -lws2_32 -o backend\kindred-server.exe
.\backend\kindred-server.exe --root . --port 8000
```

## Pages

| Page | What it demonstrates |
| --- | --- |
| [Command centre](./index.html) | Emergency dashboard, station map, and live-location prompt |
| [Array](./array.html) | Indexed traffic readings |
| [Linked list](./linked-list.html) | Vehicle nodes and links |
| [Stack](./stack.html) | Route history and last-in, first-out operations |
| [Queue](./queue.html) | Priority queue operations |
| [Tree](./tree.html) | Emergency triage decisions |
| [Graph](./graph.html) | Weighted network traversal and Dijkstra routing |

The dashboard, queue, and graph operations use the C++ backend. The other DSA pages are browser-side visual demonstrations.

## Project structure

| Path | Purpose |
| --- | --- |
| `backend/main.cpp` | C++ server, sample data, heap, and graph algorithms |
| `index.html`, `app.js`, `api.js` | Dashboard page and backend requests |
| `array.html`, `linked-list.html`, `stack.html` | DSA demonstrations |
| `queue.html`, `tree.html`, `graph.html` | DSA demonstrations |
| `dsa-pages.js` | DSA page behavior and visualizations |
| `start-localhost.ps1` | Windows build-and-run script |

## Backend API

The local server listens on `127.0.0.1:8000` and provides:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check server health |
| `GET` | `/api/dashboard?limit=8` | Get dashboard counts and emergency records |
| `POST` | `/api/emergencies/next` | Assign the next waiting emergency |
| `GET` | `/api/queue` | Read the priority queue |
| `POST` | `/api/queue/add?place=Saket&priority=1` | Add an item to the queue |
| `POST` | `/api/queue/next` | Process the highest-priority queue item |
| `GET` | `/api/route?location=Saket&type=all` | Find a response station using Dijkstra's algorithm |

Sample data is held in memory and resets when the server restarts.

## Map and location

The dashboard uses **Leaflet** with **OpenStreetMap** street tiles. It needs internet access to load the map library and tiles, but no map API key. OpenStreetMap attribution is visible on the map. Selecting a station previews a straight line from Connaught Place; browser GPS is requested only after pressing **Use my live location**. If the device is more than 25 km from Delhi, the page reports its coordinates and distance while keeping the map focused on Delhi.

The Graph lab can optionally display Google satellite imagery. To enable it, configure the Google Maps JavaScript API and billing, restrict a key to `http://localhost:8000/*`, and copy `google-map-config.example.js` to `google-map-config.js` with the key. The Graph lab does not use Google Directions or Routes APIs.

## Scope and limitations

- Emergency, vehicle, and station data are simulated; no real emergency services are contacted.
- The Graph lab uses illustrative road connections and estimated distances, not live road or traffic data.
- The dashboard map's line is a straight-line coordinate preview, not a driving route.
- The displayed average response time is illustrative.
