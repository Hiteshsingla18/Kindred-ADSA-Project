import java.util.*;

/**
 * Kindred Smart City - Advanced Data Structures companion.
 *
 * Compile and run from the project root:
 *   javac java\SmartCityDsa.java
 *   java -cp java SmartCityDsa
 */
public class SmartCityDsa {
    private static final int SAMPLE_SIZE = 100;

    // -------------------- ARRAY --------------------
    static class ResponseTimeArray {
        private final int[] minutes;

        ResponseTimeArray(int[] minutes) {
            this.minutes = Arrays.copyOf(minutes, minutes.length);
        }

        int get(int index) {
            return minutes[index];
        }

        int fastestIndex() {
            int best = 0;
            for (int i = 1; i < minutes.length; i++) {
                if (minutes[i] < minutes[best]) best = i;
            }
            return best;
        }

        void sortFastestFirst() {
            Arrays.sort(minutes);
        }

        void reverse() {
            for (int left = 0, right = minutes.length - 1; left < right; left++, right--) {
                int value = minutes[left];
                minutes[left] = minutes[right];
                minutes[right] = value;
            }
        }

        public String toString() {
            return Arrays.toString(minutes);
        }
    }

    // -------------------- LINKED LIST --------------------
    static class Vehicle {
        final String id;
        final String type;
        final String zone;

        Vehicle(String id, String type, String zone) {
            this.id = id;
            this.type = type;
            this.zone = zone;
        }

        public String toString() {
            return id + " | " + type + " | " + zone;
        }
    }

    static class VehicleLinkedList {
        static class Node {
            Vehicle vehicle;
            Node next;

            Node(Vehicle vehicle) {
                this.vehicle = vehicle;
            }
        }

        private Node head;
        private int size;

        void addFirst(Vehicle vehicle) {
            Node node = new Node(vehicle);
            node.next = head;
            head = node;
            size++;
        }

        Vehicle removeFirst() {
            if (head == null) return null;
            Vehicle vehicle = head.vehicle;
            head = head.next;
            size--;
            return vehicle;
        }

        int size() {
            return size;
        }

        List<Vehicle> toList() {
            List<Vehicle> result = new ArrayList<>();
            for (Node node = head; node != null; node = node.next) result.add(node.vehicle);
            return result;
        }
    }

    // -------------------- STACK --------------------
    static class RouteStack {
        private final Deque<String> routes = new ArrayDeque<>();

        void push(String route) {
            routes.push(route);
        }

        String pop() {
            return routes.isEmpty() ? null : routes.pop();
        }

        String peek() {
            return routes.peek();
        }

        boolean isEmpty() {
            return routes.isEmpty();
        }
    }

    // -------------------- PRIORITY QUEUE --------------------
    static class Emergency {
        final String id;
        final String type;
        final String location;
        final int priority;

        Emergency(String id, String type, String location, int priority) {
            this.id = id;
            this.type = type;
            this.location = location;
            this.priority = priority;
        }

        public String toString() {
            return id + " | P" + priority + " | " + type + " | " + location;
        }
    }

    static class EmergencyPriorityQueue {
        private final PriorityQueue<Emergency> queue = new PriorityQueue<>(
            Comparator.comparingInt((Emergency emergency) -> emergency.priority)
                .thenComparing(emergency -> emergency.id)
        );

        void add(Emergency emergency) {
            queue.offer(emergency);
        }

        Emergency processNext() {
            return queue.poll();
        }

        int size() {
            return queue.size();
        }
    }

    // -------------------- DECISION TREE --------------------
    static class DispatchDecisionTree {
        private final String question;
        private final String result;
        private DispatchDecisionTree yes;
        private DispatchDecisionTree no;

        DispatchDecisionTree(String question, String result) {
            this.question = question;
            this.result = result;
        }

        void setBranches(DispatchDecisionTree yes, DispatchDecisionTree no) {
            this.yes = yes;
            this.no = no;
        }

        String classify(boolean critical, boolean medical) {
            if (result != null) return result;
            return (critical ? yes : no).classify(medical, medical);
        }

        String question() {
            return question;
        }
    }

    // -------------------- WEIGHTED GRAPH + DIJKSTRA --------------------
    static class WeightedGraph {
        static class Edge {
            final String to;
            final int distance;

            Edge(String to, int distance) {
                this.to = to;
                this.distance = distance;
            }
        }

        static class State {
            final String location;
            final int distance;

            State(String location, int distance) {
                this.location = location;
                this.distance = distance;
            }
        }

        private final Map<String, List<Edge>> adjacency = new HashMap<>();

        void addRoad(String from, String to, int distance) {
            if (distance < 0) throw new IllegalArgumentException("Distance cannot be negative");
            adjacency.computeIfAbsent(from, key -> new ArrayList<>()).add(new Edge(to, distance));
            adjacency.computeIfAbsent(to, key -> new ArrayList<>()).add(new Edge(from, distance));
        }

        List<String> shortestPath(String start, String end) {
            Map<String, Integer> distances = new HashMap<>();
            Map<String, String> previous = new HashMap<>();
            PriorityQueue<State> pending = new PriorityQueue<>(Comparator.comparingInt(state -> state.distance));

            for (String location : adjacency.keySet()) distances.put(location, Integer.MAX_VALUE);
            if (!distances.containsKey(start) || !distances.containsKey(end)) return Collections.emptyList();

            distances.put(start, 0);
            pending.offer(new State(start, 0));
            while (!pending.isEmpty()) {
                State current = pending.poll();
                if (current.distance != distances.get(current.location)) continue;
                if (current.location.equals(end)) break;

                for (Edge edge : adjacency.getOrDefault(current.location, Collections.emptyList())) {
                    int candidate = current.distance + edge.distance;
                    if (candidate < distances.get(edge.to)) {
                        distances.put(edge.to, candidate);
                        previous.put(edge.to, current.location);
                        pending.offer(new State(edge.to, candidate));
                    }
                }
            }

            if (distances.get(end) == Integer.MAX_VALUE) return Collections.emptyList();
            LinkedList<String> path = new LinkedList<>();
            for (String location = end; location != null; location = previous.get(location)) {
                path.addFirst(location);
            }
            return path;
        }

        int shortestDistance(String start, String end) {
            List<String> path = shortestPath(start, end);
            if (path.isEmpty()) return Integer.MAX_VALUE;
            int total = 0;
            for (int i = 0; i < path.size() - 1; i++) {
                for (Edge edge : adjacency.get(path.get(i))) {
                    if (edge.to.equals(path.get(i + 1))) {
                        total += edge.distance;
                        break;
                    }
                }
            }
            return total;
        }
    }

    private static List<Emergency> seedEmergencies() {
        String[] types = {"Medical", "Fire", "Accident", "Public safety"};
        String[] locations = {"Chandni Chowk", "India Gate", "Saket", "Dwarka", "Rohini", "Hauz Khas"};
        List<Emergency> records = new ArrayList<>();
        for (int i = 0; i < SAMPLE_SIZE; i++) {
            int priority = i % 11 == 0 ? 1 : (i % 3 == 0 ? 2 : 3);
            records.add(new Emergency(
                String.format("KD-%03d", i + 1),
                types[i % types.length],
                locations[i % locations.length],
                priority
            ));
        }
        return records;
    }

    private static VehicleLinkedList seedVehicles() {
        VehicleLinkedList fleet = new VehicleLinkedList();
        String[] types = {"Ambulance", "Fire truck", "Patrol car"};
        for (int i = 0; i < SAMPLE_SIZE; i++) {
            fleet.addFirst(new Vehicle(
                String.format("VH-%03d", i + 1),
                types[i % types.length],
                "Delhi Zone " + ((i % 12) + 1)
            ));
        }
        return fleet;
    }

    private static DispatchDecisionTree buildDispatchTree() {
        DispatchDecisionTree root = new DispatchDecisionTree("Critical emergency?", null);
        DispatchDecisionTree critical = new DispatchDecisionTree("Medical emergency?", null);
        critical.setBranches(
            new DispatchDecisionTree(null, "P1 Ambulance + trauma team"),
            new DispatchDecisionTree(null, "P1 Fire truck + rescue team")
        );
        root.setBranches(critical, new DispatchDecisionTree(null, "P2 Patrol car + local response"));
        return root;
    }

    public static void main(String[] args) {
        ResponseTimeArray responseTimes = new ResponseTimeArray(new int[] {12, 8, 15, 6, 11, 9});
        int fastestIndex = responseTimes.fastestIndex();

        VehicleLinkedList fleet = seedVehicles();
        Vehicle removedVehicle = fleet.removeFirst();

        RouteStack routeHistory = new RouteStack();
        routeHistory.push("Chandni Chowk -> AIIMS Trauma Centre");
        routeHistory.push("India Gate -> Safdarjung Hospital");

        EmergencyPriorityQueue emergencyDesk = new EmergencyPriorityQueue();
        for (Emergency emergency : seedEmergencies()) emergencyDesk.add(emergency);

        DispatchDecisionTree dispatchTree = buildDispatchTree();

        WeightedGraph network = new WeightedGraph();
        network.addRoad("Chandni Chowk", "Central Police Station", 3);
        network.addRoad("Chandni Chowk", "Lok Nayak Hospital", 4);
        network.addRoad("Central Police Station", "AIIMS Trauma Centre", 9);
        network.addRoad("Lok Nayak Hospital", "AIIMS Trauma Centre", 8);
        network.addRoad("India Gate", "Safdarjung Hospital", 5);
        network.addRoad("India Gate", "Central Police Station", 4);
        network.addRoad("Saket", "Safdarjung Hospital", 3);
        network.addRoad("Saket", "AIIMS Trauma Centre", 4);

        List<String> shortestRoute = network.shortestPath("Chandni Chowk", "AIIMS Trauma Centre");
        int routeDistance = network.shortestDistance("Chandni Chowk", "AIIMS Trauma Centre");

        System.out.println("Kindred Smart City ADSA simulation");
        System.out.println("----------------------------------");
        System.out.println("Array: fastest response is index " + fastestIndex + " (" + responseTimes.get(fastestIndex) + " min)");
        responseTimes.sortFastestFirst();
        System.out.println("Array after sorting: " + responseTimes);
        System.out.println("Linked list: " + fleet.size() + " vehicles; removed: " + removedVehicle.id);
        System.out.println("Stack peek: " + routeHistory.peek());
        System.out.println("Stack pop: " + routeHistory.pop());
        System.out.println("Priority queue records: " + emergencyDesk.size());
        System.out.println("Priority queue next: " + emergencyDesk.processNext());
        System.out.println("Decision tree result: " + dispatchTree.classify(true, true));
        System.out.println("Graph shortest path: " + String.join(" -> ", shortestRoute));
        System.out.println("Graph distance: " + routeDistance + " km (educational weighted graph)");
    }
}
