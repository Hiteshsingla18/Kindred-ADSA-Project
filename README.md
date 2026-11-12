# Kindred City

Kindred Grid is a tech-forward Smart City Route & Emergency Management System for the Advanced Data Structures project. The command centre is focused on New Delhi and uses real Delhi GPS coordinates rendered in a local map layer, so it remains visible even when external map tiles are blocked.

## Run the website

For live GPS, run `start-localhost.ps1` in PowerShell, then open `http://localhost:8000`. The DSA modules are separate pages: [Array](./array.html), [Linked list](./linked-list.html), [Stack](./stack.html), [Queue](./queue.html), [Tree](./tree.html), and [Graph](./graph.html).

## Optional Google Maps satellite view

1. In Google Cloud Console, enable **Maps JavaScript API** and billing for a project.
2. Create an API key and restrict it to `http://localhost:8000/*`. Under API restrictions, allow **Maps JavaScript API**.
3. Copy `google-map-config.example.js` to `google-map-config.js`.
4. Put the key in `google-map-config.js`.
5. Restart the local server and refresh the homepage.

The Graph lab uses a map only as a visual layer. The browser demo currently ranks eligible stations by estimated straight-line distance; it does not yet run Dijkstra over a road network. The Java companion does include a weighted graph and Dijkstra implementation. The browser Graph lab does not require Directions or Routes API. Without `google-map-config.js`, it uses an offline coordinate visualization.

The browser will ask for location permission when **Use my live location** is pressed. GPS is supplied by the browser/device; the local server only provides the trusted HTTP origin needed by the Geolocation API.

## DSA mapping

- **Array:** sample response-time readings and emergency/vehicle records.
- **Linked list:** the Java companion implements the vehicle fleet; the browser lab visualizes its operations.
- **Stack:** the Java companion uses a stack for route history; the browser lab demonstrates push, pop, peek, and clear.
- **Priority queue:** the Java companion uses Java's `PriorityQueue`; the browser simulation currently sorts requests by priority rather than using a heap.
- **Decision tree:** the Java companion implements triage branches; the browser lab visualizes the decision path.
- **Graph:** the Java companion uses a weighted graph and Dijkstra. The browser map currently ranks stations by straight-line distance and is not yet a Dijkstra visualization.

The browser demo generates 100 deterministic emergency and vehicle records. The Java companion in `java/SmartCityDsa.java` seeds 100 emergency and vehicle records and demonstrates the core structures.

## Java ADSA companion

The complete Java implementation is in [java/SmartCityDsa.java](./java/SmartCityDsa.java). It contains the Array, Linked List, Stack, Priority Queue, Decision Tree, weighted Graph, and Dijkstra examples in one file.

From the project root on Windows, run:

```powershell
javac java\SmartCityDsa.java
java -cp java SmartCityDsa
```

Install a JDK and add its `bin` folder to PATH if `javac` is not recognized.

## Run the Java companion

```text
javac java/SmartCityDsa.java
java -cp java SmartCityDsa
```
