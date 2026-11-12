#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>

#include <algorithm>
#include <cmath>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace fs = std::filesystem;

struct Emergency {
    std::string id;
    std::string type;
    std::string location;
    int priority;
    std::string reported;
    std::string status;
};

struct Vehicle {
    std::string id;
    std::string status;
};

struct QueueItem {
    std::string place;
    int priority;
    int arrival;
};

template <typename T, typename ComesBefore>
class MinHeap {
public:
    explicit MinHeap(ComesBefore comesBefore = ComesBefore())
        : comesBefore_(comesBefore) {}

    bool empty() const {
        return items_.empty();
    }

    void push(const T& item) {
        items_.push_back(item);
        std::size_t child = items_.size() - 1;
        while (child > 0) {
            const std::size_t parent = (child - 1) / 2;
            if (!comesBefore_(items_[child], items_[parent])) break;
            std::swap(items_[child], items_[parent]);
            child = parent;
        }
    }

    T pop() {
        if (items_.empty()) throw std::runtime_error("The heap is empty.");
        T first = items_.front();
        items_.front() = items_.back();
        items_.pop_back();

        std::size_t parent = 0;
        while (parent < items_.size()) {
            const std::size_t left = parent * 2 + 1;
            const std::size_t right = left + 1;
            std::size_t firstChild = parent;
            if (left < items_.size() && comesBefore_(items_[left], items_[firstChild])) firstChild = left;
            if (right < items_.size() && comesBefore_(items_[right], items_[firstChild])) firstChild = right;
            if (firstChild == parent) break;
            std::swap(items_[parent], items_[firstChild]);
            parent = firstChild;
        }
        return first;
    }

    const std::vector<T>& items() const {
        return items_;
    }

private:
    std::vector<T> items_;
    ComesBefore comesBefore_;
};

struct QueueItemComesBefore {
    bool operator()(const QueueItem& first, const QueueItem& second) const {
        if (first.priority != second.priority) return first.priority < second.priority;
        return first.arrival < second.arrival;
    }
};

struct EmergencyComesBefore {
    bool operator()(const Emergency* first, const Emergency* second) const {
        if (first->priority != second->priority) return first->priority < second->priority;
        return first->id < second->id;
    }
};

struct Station {
    std::string name;
    std::string type;
    double latitude;
    double longitude;
};

struct Coordinates {
    double latitude;
    double longitude;
};

struct RoadEdge {
    std::string destination;
    double distance;
};

struct RouteState {
    std::string name;
    double distance;
};

struct RouteStateComesBefore {
    bool operator()(const RouteState& first, const RouteState& second) const {
        if (first.distance != second.distance) return first.distance < second.distance;
        return first.name < second.name;
    }
};

struct RouteResult {
    std::string station;
    std::string stationType;
    double distance = 0;
    std::vector<std::string> path;
    std::vector<RouteState> settled;
};

class KindredApp {
public:
    KindredApp() {
        seedRecords();
        seedQueue();
        buildRoadGraph();
    }

    std::string dashboardJson(std::size_t limit) {
        MinHeap<const Emergency*, EmergencyComesBefore> ordered;
        for (const Emergency& emergency : emergencies_) {
            ordered.push(&emergency);
        }

        std::set<std::string> zones;
        std::size_t waiting = 0;
        std::size_t open = 0;
        std::size_t ready = 0;
        for (const Emergency& emergency : emergencies_) {
            zones.insert(emergency.location);
            if (emergency.status == "Waiting") ++waiting;
            if (emergency.status != "Completed") ++open;
        }
        for (const Vehicle& vehicle : vehicles_) {
            if (vehicle.status == "Ready") ++ready;
        }

        std::ostringstream json;
        json << "{\"total\":" << emergencies_.size()
             << ",\"open\":" << open
             << ",\"waiting\":" << waiting
             << ",\"readyVehicles\":" << ready
             << ",\"sampleZones\":" << zones.size()
             << ",\"exampleResponse\":\"08:42\",\"emergencies\":[";
        const std::size_t count = std::min(limit, emergencies_.size());
        for (std::size_t index = 0; index < count; ++index) {
            if (index) json << ',';
            const Emergency* emergency = ordered.pop();
            json << "{\"id\":" << jsonString(emergency->id)
                 << ",\"type\":" << jsonString(emergency->type)
                 << ",\"location\":" << jsonString(emergency->location)
                 << ",\"priority\":" << emergency->priority
                 << ",\"reported\":" << jsonString(emergency->reported)
                 << ",\"status\":" << jsonString(emergency->status) << '}';
        }
        json << "]}";
        return json.str();
    }

    bool processNextEmergency(std::string& error, std::string& emergencyId, std::string& vehicleId) {
        MinHeap<Emergency*, EmergencyComesBefore> waiting;
        for (Emergency& emergency : emergencies_) {
            if (emergency.status == "Waiting") waiting.push(&emergency);
        }
        if (waiting.empty()) {
            error = "There are no waiting requests.";
            return false;
        }

        auto vehicle = std::find_if(vehicles_.begin(), vehicles_.end(), [](const Vehicle& item) {
            return item.status == "Ready";
        });
        if (vehicle == vehicles_.end()) {
            error = "There are no ready vehicles.";
            return false;
        }

        Emergency* emergency = waiting.pop();
        emergency->status = "In progress";
        vehicle->status = "On call";
        emergencyId = emergency->id;
        vehicleId = vehicle->id;
        return true;
    }

    void addQueueItem(const std::string& place, int priority) {
        demoQueue_.push({place, priority, nextArrival_++});
    }

    bool processQueueItem(QueueItem& item) {
        if (demoQueue_.empty()) return false;
        item = demoQueue_.pop();
        return true;
    }

    std::string queueJson(const QueueItem* processed = nullptr, bool hasProcessed = false) const {
        std::ostringstream json;
        json << "{\"items\":[";
        const std::vector<QueueItem>& items = demoQueue_.items();
        for (std::size_t index = 0; index < items.size(); ++index) {
            if (index) json << ',';
            json << "{\"place\":" << jsonString(items[index].place)
                 << ",\"priority\":" << items[index].priority
                 << ",\"order\":" << items[index].arrival << '}';
        }
        json << ']';
        if (hasProcessed) {
            json << ",\"processed\":";
            if (processed) {
                json << "{\"place\":" << jsonString(processed->place)
                     << ",\"priority\":" << processed->priority << '}';
            } else {
                json << "null";
            }
        }
        json << '}';
        return json.str();
    }

    RouteResult findNearestStation(const std::string& start, const std::string& type) const {
        std::set<std::string> targets;
        for (const Station& station : stations_) {
            if (type == "all" || station.type == type) targets.insert(station.name);
        }

        std::unordered_map<std::string, double> distances;
        std::unordered_map<std::string, std::string> previous;
        for (const auto& entry : roadGraph_) distances[entry.first] = INFINITY;
        distances[start] = 0;

        MinHeap<RouteState, RouteStateComesBefore> pending;
        pending.push({start, 0});
        RouteResult result;

        while (!pending.empty()) {
            const RouteState current = pending.pop();
            if (current.distance != distances[current.name]) continue;
            result.settled.push_back(current);
            if (targets.count(current.name)) {
                result.station = current.name;
                result.distance = current.distance;
                for (std::string name = current.name;; name = previous[name]) {
                    result.path.push_back(name);
                    if (name == start) break;
                }
                std::reverse(result.path.begin(), result.path.end());
                for (const Station& station : stations_) {
                    if (station.name == result.station) result.stationType = station.type;
                }
                return result;
            }
            for (const RoadEdge& edge : roadGraph_.at(current.name)) {
                const double candidate = current.distance + edge.distance;
                if (candidate < distances[edge.destination]) {
                    distances[edge.destination] = candidate;
                    previous[edge.destination] = current.name;
                    pending.push({edge.destination, candidate});
                }
            }
        }
        return result;
    }

    const std::map<std::string, Coordinates>& locations() const {
        return locations_;
    }

    const std::vector<Station>& stations() const {
        return stations_;
    }

    const std::vector<std::pair<std::string, std::string>>& roadConnections() const {
        return roadConnections_;
    }

private:
    static std::string jsonString(const std::string& value) {
        std::ostringstream json;
        json << '"';
        for (unsigned char character : value) {
            switch (character) {
                case '"': json << "\\\""; break;
                case '\\': json << "\\\\"; break;
                case '\b': json << "\\b"; break;
                case '\f': json << "\\f"; break;
                case '\n': json << "\\n"; break;
                case '\r': json << "\\r"; break;
                case '\t': json << "\\t"; break;
                default:
                    if (character < 0x20) {
                        json << "\\u00" << std::hex << static_cast<int>(character) << std::dec;
                    } else {
                        json << character;
                    }
            }
        }
        json << '"';
        return json.str();
    }

    void seedRecords() {
        const std::vector<std::string> zones = {
            "Connaught Place", "Lajpat Nagar", "Dwarka", "Rohini", "Saket", "Karol Bagh",
            "Hauz Khas", "Vasant Kunj", "Shahdara", "Civil Lines", "India Gate", "Noida border"
        };
        const std::vector<std::string> types = {"Medical", "Fire", "Accident", "Public safety"};
        for (int index = 0; index < 100; ++index) {
            const int priority = index % 11 == 0 ? 1 : (index % 3 == 0 ? 2 : 3);
            std::ostringstream id;
            id << "KD-" << std::setw(3) << std::setfill('0') << index + 1;
            std::ostringstream reported;
            reported << std::setw(2) << std::setfill('0') << 7 + index / 8
                     << ':' << std::setw(2) << std::setfill('0') << (index * 7) % 60;
            emergencies_.push_back({
                id.str(),
                types[index % types.size()],
                zones[(index * 5 + 2) % zones.size()],
                priority,
                reported.str(),
                index < 3 ? "In progress" : "Waiting"
            });

            std::ostringstream vehicleId;
            vehicleId << "VH-" << std::setw(3) << std::setfill('0') << index + 1;
            vehicles_.push_back({vehicleId.str(), index % 7 == 0 ? "On call" : "Ready"});
        }
    }

    void seedQueue() {
        demoQueue_.push({"India Gate", 1, nextArrival_++});
        demoQueue_.push({"Connaught Place", 1, nextArrival_++});
        demoQueue_.push({"Saket", 2, nextArrival_++});
        demoQueue_.push({"Dwarka", 3, nextArrival_++});
    }

    void buildRoadGraph() {
        locations_ = {
            {"Chandni Chowk", {28.6506, 77.2303}}, {"India Gate", {28.6129, 77.2295}},
            {"Saket", {28.5244, 77.2066}}, {"Dwarka Sector 10", {28.5813, 77.0585}},
            {"Rohini Sector 18", {28.7376, 77.1180}}, {"Hauz Khas", {28.5494, 77.2001}},
            {"Central Delhi Junction", {28.632, 77.224}}, {"South Delhi Junction", {28.565, 77.210}},
            {"West Delhi Junction", {28.625, 77.120}}, {"North Delhi Junction", {28.700, 77.185}},
            {"East Delhi Junction", {28.675, 77.270}}
        };
        stations_ = {
            {"AIIMS Trauma Centre", "Hospital", 28.5672, 77.2100},
            {"Safdarjung Hospital", "Hospital", 28.5677, 77.2066},
            {"Lok Nayak Hospital", "Hospital", 28.6391, 77.2407},
            {"Deen Dayal Upadhyay Hospital", "Hospital", 28.6651, 77.1465},
            {"GTB Hospital", "Hospital", 28.6853, 77.3026},
            {"Central Police Station", "Police station", 28.6353, 77.2249},
            {"Saket Police Station", "Police station", 28.5245, 77.2110},
            {"Dwarka Sector 10 Police", "Police station", 28.5814, 77.0585},
            {"Rohini Sector 18 Police", "Police station", 28.7378, 77.1183},
            {"Hauz Khas Police Station", "Police station", 28.5498, 77.2020}
        };
        for (const Station& station : stations_) {
            locations_[station.name] = {station.latitude, station.longitude};
        }

        roadConnections_ = {
            {"Chandni Chowk", "Central Delhi Junction"},
            {"India Gate", "Central Delhi Junction"},
            {"Central Police Station", "Central Delhi Junction"},
            {"Lok Nayak Hospital", "Central Delhi Junction"},
            {"Central Delhi Junction", "South Delhi Junction"},
            {"Central Delhi Junction", "North Delhi Junction"},
            {"Central Delhi Junction", "East Delhi Junction"},
            {"North Delhi Junction", "West Delhi Junction"},
            {"North Delhi Junction", "GTB Hospital"},
            {"North Delhi Junction", "Rohini Sector 18 Police"},
            {"Rohini Sector 18", "Rohini Sector 18 Police"},
            {"South Delhi Junction", "AIIMS Trauma Centre"},
            {"South Delhi Junction", "Safdarjung Hospital"},
            {"South Delhi Junction", "Hauz Khas Police Station"},
            {"South Delhi Junction", "Saket Police Station"},
            {"Hauz Khas", "Hauz Khas Police Station"},
            {"Saket", "Saket Police Station"},
            {"South Delhi Junction", "West Delhi Junction"},
            {"West Delhi Junction", "Dwarka Sector 10 Police"},
            {"Dwarka Sector 10", "Dwarka Sector 10 Police"},
            {"West Delhi Junction", "Deen Dayal Upadhyay Hospital"},
            {"East Delhi Junction", "GTB Hospital"}
        };

        for (const auto& road : roadConnections_) {
            const Coordinates from = locations_.at(road.first);
            const Coordinates to = locations_.at(road.second);
            const double distance = std::hypot((from.latitude - to.latitude) * 111,
                                               (from.longitude - to.longitude) * 103);
            roadGraph_[road.first].push_back({road.second, distance});
            roadGraph_[road.second].push_back({road.first, distance});
        }
    }

    std::vector<Emergency> emergencies_;
    std::vector<Vehicle> vehicles_;
    MinHeap<QueueItem, QueueItemComesBefore> demoQueue_;
    int nextArrival_ = 0;
    std::map<std::string, Coordinates> locations_;
    std::vector<Station> stations_;
    std::vector<std::pair<std::string, std::string>> roadConnections_;
    std::unordered_map<std::string, std::vector<RoadEdge>> roadGraph_;
};

struct HttpRequest {
    std::string method;
    std::string target;
    std::string path;
    std::string query;
};

struct HttpResponse {
    int status;
    std::string contentType;
    std::string body;
};

std::string jsonEscape(const std::string& value) {
    std::ostringstream json;
    json << '"';
    for (unsigned char character : value) {
        switch (character) {
            case '"': json << "\\\""; break;
            case '\\': json << "\\\\"; break;
            case '\n': json << "\\n"; break;
            case '\r': json << "\\r"; break;
            case '\t': json << "\\t"; break;
            default:
                if (character < 0x20) json << ' ';
                else json << character;
        }
    }
    json << '"';
    return json.str();
}

int hexValue(char character) {
    if (character >= '0' && character <= '9') return character - '0';
    if (character >= 'a' && character <= 'f') return character - 'a' + 10;
    if (character >= 'A' && character <= 'F') return character - 'A' + 10;
    return -1;
}

std::string urlDecode(const std::string& value) {
    std::string decoded;
    for (std::size_t index = 0; index < value.size(); ++index) {
        if (value[index] == '+' ) {
            decoded.push_back(' ');
        } else if (value[index] == '%' && index + 2 < value.size()) {
            const int high = hexValue(value[index + 1]);
            const int low = hexValue(value[index + 2]);
            if (high < 0 || low < 0) throw std::invalid_argument("Invalid URL encoding.");
            const char character = static_cast<char>(high * 16 + low);
            if (character == '\0') throw std::invalid_argument("Invalid URL encoding.");
            decoded.push_back(character);
            index += 2;
        } else {
            decoded.push_back(value[index]);
        }
    }
    return decoded;
}

std::map<std::string, std::string> parseQuery(const std::string& query) {
    std::map<std::string, std::string> values;
    std::istringstream parts(query);
    std::string part;
    while (std::getline(parts, part, '&')) {
        const std::size_t equals = part.find('=');
        const std::string key = urlDecode(part.substr(0, equals));
        const std::string value = equals == std::string::npos ? "" : urlDecode(part.substr(equals + 1));
        values[key] = value;
    }
    return values;
}

bool readRequest(SOCKET client, HttpRequest& request, std::string& error) {
    std::string data;
    char buffer[4096];
    std::size_t headerEnd = std::string::npos;
    while ((headerEnd = data.find("\r\n\r\n")) == std::string::npos) {
        const int received = recv(client, buffer, sizeof(buffer), 0);
        if (received <= 0) return false;
        data.append(buffer, received);
        if (data.size() > 16384) {
            error = "Request headers are too large.";
            return false;
        }
    }

    std::istringstream headerStream(data.substr(0, headerEnd));
    std::string requestLine;
    std::getline(headerStream, requestLine);
    std::istringstream requestLineStream(requestLine);
    requestLineStream >> request.method >> request.target;
    if (request.method.empty() || request.target.empty()) {
        error = "Invalid HTTP request line.";
        return false;
    }

    std::size_t contentLength = 0;
    std::string header;
    while (std::getline(headerStream, header)) {
        if (!header.empty() && header.back() == '\r') header.pop_back();
        const std::size_t colon = header.find(':');
        if (colon == std::string::npos) continue;
        std::string name = header.substr(0, colon);
        std::transform(name.begin(), name.end(), name.begin(), [](unsigned char ch) {
            return static_cast<char>(std::tolower(ch));
        });
        if (name == "content-length") {
            contentLength = static_cast<std::size_t>(std::stoul(header.substr(colon + 1)));
        }
    }
    if (contentLength > 16384) {
        error = "Request body is too large.";
        return false;
    }
    const std::size_t bodyStart = headerEnd + 4;
    while (data.size() < bodyStart + contentLength) {
        const int received = recv(client, buffer, sizeof(buffer), 0);
        if (received <= 0) {
            error = "Incomplete HTTP request body.";
            return false;
        }
        data.append(buffer, received);
    }

    const std::size_t question = request.target.find('?');
    request.path = request.target.substr(0, question);
    request.query = question == std::string::npos ? "" : request.target.substr(question + 1);
    return true;
}

void sendResponse(SOCKET client, const HttpResponse& response) {
    const std::string reason = response.status == 200 ? "OK"
        : response.status == 400 ? "Bad Request"
        : response.status == 403 ? "Forbidden"
        : response.status == 404 ? "Not Found"
        : response.status == 405 ? "Method Not Allowed"
        : response.status == 409 ? "Conflict"
        : response.status == 413 ? "Payload Too Large"
        : "Internal Server Error";
    std::ostringstream header;
    header << "HTTP/1.1 " << response.status << ' ' << reason << "\r\n"
           << "Content-Type: " << response.contentType << "\r\n"
           << "Content-Length: " << response.body.size() << "\r\n"
           << "Cache-Control: no-store\r\n"
           << "X-Content-Type-Options: nosniff\r\n"
           << "Connection: close\r\n\r\n";
    const std::string message = header.str() + response.body;
    std::size_t sent = 0;
    while (sent < message.size()) {
        const int result = send(client, message.data() + sent, static_cast<int>(message.size() - sent), 0);
        if (result <= 0) return;
        sent += static_cast<std::size_t>(result);
    }
}

HttpResponse jsonResponse(int status, const std::string& body) {
    return {status, "application/json; charset=utf-8", body};
}

std::string mimeType(const fs::path& path) {
    const std::string extension = path.extension().string();
    if (extension == ".html") return "text/html; charset=utf-8";
    if (extension == ".css") return "text/css; charset=utf-8";
    if (extension == ".js") return "application/javascript; charset=utf-8";
    if (extension == ".json") return "application/json; charset=utf-8";
    if (extension == ".svg") return "image/svg+xml";
    if (extension == ".png") return "image/png";
    if (extension == ".jpg" || extension == ".jpeg") return "image/jpeg";
    if (extension == ".ico") return "image/x-icon";
    return "application/octet-stream";
}

HttpResponse serveFile(const fs::path& root, const std::string& urlPath) {
    std::string decoded = urlDecode(urlPath);
    if (decoded.empty() || decoded == "/") decoded = "/index.html";
    if (decoded.front() != '/' || decoded.find('\\') != std::string::npos || decoded.find(':') != std::string::npos) {
        return {403, "text/plain; charset=utf-8", "Forbidden"};
    }

    const fs::path relative(decoded.substr(1));
    for (const fs::path& part : relative) {
        if (part == "..") return {403, "text/plain; charset=utf-8", "Forbidden"};
    }
    std::error_code error;
    const fs::path file = fs::canonical(root / relative, error);
    if (error || !fs::is_regular_file(file)) return {404, "text/plain; charset=utf-8", "Not found"};
    const fs::path withinRoot = file.lexically_relative(root);
    if (withinRoot.empty() || withinRoot.is_absolute() || *withinRoot.begin() == "..") {
        return {403, "text/plain; charset=utf-8", "Forbidden"};
    }

    std::ifstream input(file, std::ios::binary);
    if (!input) return {404, "text/plain; charset=utf-8", "Not found"};
    std::ostringstream contents;
    contents << input.rdbuf();
    return {200, mimeType(file), contents.str()};
}

HttpResponse handleApi(const HttpRequest& request, KindredApp& app) {
    if (request.path == "/api/health" && request.method == "GET") {
        return jsonResponse(200, "{\"status\":\"ok\",\"backend\":\"C++\"}");
    }
    if (request.path == "/api/dashboard" && request.method == "GET") {
        std::size_t limit = 8;
        const auto query = parseQuery(request.query);
        const auto value = query.find("limit");
        if (value != query.end()) {
            try {
                std::size_t parsed = 0;
                limit = std::stoul(value->second, &parsed);
                if (parsed != value->second.size()) throw std::invalid_argument("limit");
            } catch (...) {
                return jsonResponse(400, "{\"error\":\"The limit must be a whole number.\"}");
            }
        }
        return jsonResponse(200, app.dashboardJson(std::min<std::size_t>(limit, 100)));
    }
    if (request.path == "/api/emergencies/next" && request.method == "POST") {
        std::string error;
        std::string emergencyId;
        std::string vehicleId;
        if (!app.processNextEmergency(error, emergencyId, vehicleId)) {
            return jsonResponse(409, "{\"error\":" + jsonEscape(error) + "}");
        }
        std::string dashboard = app.dashboardJson(8);
        dashboard.pop_back();
        dashboard += ",\"assignedEmergencyId\":" + jsonEscape(emergencyId)
            + ",\"assignedVehicleId\":" + jsonEscape(vehicleId) + '}';
        return jsonResponse(200, dashboard);
    }
    if (request.path == "/api/queue" && request.method == "GET") {
        return jsonResponse(200, app.queueJson());
    }
    if (request.path == "/api/queue/add" && request.method == "POST") {
        const auto query = parseQuery(request.query);
        const auto place = query.find("place");
        const auto priority = query.find("priority");
        const std::set<std::string> validPlaces = {
            "India Gate", "Connaught Place", "Saket", "Dwarka", "Rohini", "Hauz Khas"
        };
        if (place == query.end() || !validPlaces.count(place->second)) {
            return jsonResponse(400, "{\"error\":\"Choose a listed response location.\"}");
        }
        int level = 0;
        try {
            std::size_t parsed = 0;
            if (priority == query.end()) throw std::invalid_argument("priority");
            level = std::stoi(priority->second, &parsed);
            if (parsed != priority->second.size() || level < 1 || level > 3) throw std::invalid_argument("priority");
        } catch (...) {
            return jsonResponse(400, "{\"error\":\"Priority must be 1, 2, or 3.\"}");
        }
        app.addQueueItem(place->second, level);
        return jsonResponse(200, app.queueJson());
    }
    if (request.path == "/api/queue/next" && request.method == "POST") {
        QueueItem processed;
        const bool hasProcessed = app.processQueueItem(processed);
        return jsonResponse(200, app.queueJson(hasProcessed ? &processed : nullptr, true));
    }
    if (request.path == "/api/route" && request.method == "GET") {
        const auto query = parseQuery(request.query);
        const auto location = query.find("location");
        const auto type = query.find("type");
        if (location == query.end() || type == query.end()) {
            return jsonResponse(400, "{\"error\":\"Choose a location and checkpoint type.\"}");
        }
        if (type->second != "all" && type->second != "Hospital" && type->second != "Police station") {
            return jsonResponse(400, "{\"error\":\"Checkpoint type is not recognized.\"}");
        }
        if (!app.locations().count(location->second)) {
            return jsonResponse(400, "{\"error\":\"Location is not in the sample road network.\"}");
        }
        const RouteResult result = app.findNearestStation(location->second, type->second);
        if (result.station.empty()) return jsonResponse(404, "{\"error\":\"No eligible station is reachable.\"}");

        std::ostringstream json;
        json << "{\"station\":" << jsonEscape(result.station)
             << ",\"stationType\":" << jsonEscape(result.stationType)
             << ",\"distance\":" << result.distance << ",\"path\":[";
        for (std::size_t index = 0; index < result.path.size(); ++index) {
            if (index) json << ',';
            json << jsonEscape(result.path[index]);
        }
        json << "],\"settled\":[";
        for (std::size_t index = 0; index < result.settled.size(); ++index) {
            if (index) json << ',';
            json << "{\"name\":" << jsonEscape(result.settled[index].name)
                 << ",\"distance\":" << result.settled[index].distance << '}';
        }
        json << "]}";
        return jsonResponse(200, json.str());
    }
    if (request.path.rfind("/api/", 0) == 0) {
        return jsonResponse(404, "{\"error\":\"API endpoint not found.\"}");
    }
    return {405, "text/plain; charset=utf-8", "Method not allowed"};
}

HttpResponse handleRequest(const HttpRequest& request, KindredApp& app, const fs::path& root) {
    if (request.path.rfind("/api/", 0) == 0) return handleApi(request, app);
    if (request.method != "GET" && request.method != "HEAD") {
        return {405, "text/plain; charset=utf-8", "Method not allowed"};
    }
    HttpResponse response = serveFile(root, request.path);
    if (request.method == "HEAD") response.body.clear();
    return response;
}

int runServer(const fs::path& root, unsigned short port) {
    WSADATA data;
    if (WSAStartup(MAKEWORD(2, 2), &data) != 0) {
        std::cerr << "Could not start Winsock.\n";
        return 1;
    }

    SOCKET server = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server == INVALID_SOCKET) {
        std::cerr << "Could not create the local server socket.\n";
        WSACleanup();
        return 1;
    }

    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    address.sin_port = htons(port);
    if (bind(server, reinterpret_cast<sockaddr*>(&address), sizeof(address)) == SOCKET_ERROR
        || listen(server, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "Could not listen on 127.0.0.1:" << port << ". Is the port already in use?\n";
        closesocket(server);
        WSACleanup();
        return 1;
    }

    KindredApp app;
    std::cout << "Kindred C++ backend: http://127.0.0.1:" << port << "\nPress Ctrl+C to stop.\n";
    while (true) {
        SOCKET client = accept(server, nullptr, nullptr);
        if (client == INVALID_SOCKET) continue;
        HttpRequest request;
        HttpResponse response{400, "application/json; charset=utf-8", "{\"error\":\"Invalid HTTP request.\"}"};
        std::string error;
        try {
            if (readRequest(client, request, error)) {
                response = handleRequest(request, app, root);
                std::cout << request.method << ' ' << request.target << " -> " << response.status << '\n';
            } else if (!error.empty()) {
                response = jsonResponse(error == "Request body is too large." ? 413 : 400,
                    "{\"error\":" + jsonEscape(error) + "}");
            }
        } catch (const std::exception& exception) {
            response = jsonResponse(500, "{\"error\":" + jsonEscape(exception.what()) + "}");
            std::cerr << "Request error: " << exception.what() << '\n';
        }
        sendResponse(client, response);
        shutdown(client, SD_SEND);
        closesocket(client);
    }
    closesocket(server);
    WSACleanup();
    return 0;
}

int main(int argc, char* argv[]) {
    fs::path root = fs::current_path();
    unsigned short port = 8000;
    try {
        for (int index = 1; index < argc; ++index) {
            const std::string argument = argv[index];
            if (argument == "--root" && index + 1 < argc) {
                root = argv[++index];
            } else if (argument == "--port" && index + 1 < argc) {
                const int value = std::stoi(argv[++index]);
                if (value < 1 || value > 65535) throw std::invalid_argument("Port must be from 1 to 65535.");
                port = static_cast<unsigned short>(value);
            } else {
                throw std::invalid_argument("Usage: kindred-server.exe [--root PATH] [--port NUMBER]");
            }
        }
        root = fs::canonical(root);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
    return runServer(root, port);
}
