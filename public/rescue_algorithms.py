
import json
from collections import deque

GRAPHS = {
    "Flood": [
        ("A", "B", 4), ("A", "F", 7), ("B", "C", 3),
        ("B", "D", 6), ("B", "E", 5), ("C", "D", 5),
        ("D", "E", 2), ("D", "F", 4)
    ],
    "Earthquake": [
        ("A", "B", 3), ("A", "F", 6), ("B", "C", 5),
        ("B", "D", 4), ("B", "E", 7), ("C", "D", 2),
        ("D", "E", 3), ("D", "F", 5)
    ]
}

LOCATIONS = {
    "A": "Rescue Base",
    "B": "Shelter",
    "C": "Supply Center",
    "D": "Flood Zone",
    "E": "Hospital",
    "F": "Safe Zone"
}

SUPPLY_NEEDS = [
    {"location": "Hospital", "needed": 30, "urgency": 100},
    {"location": "Flood Zone", "needed": 50, "urgency": 90},
    {"location": "Shelter", "needed": 40, "urgency": 60}
]

KITS = [
    {"name": "First Aid Kit", "weight": 3, "value": 8},
    {"name": "Water Supply", "weight": 4, "value": 9},
    {"name": "Rescue Tools", "weight": 5, "value": 12},
    {"name": "Emergency Radio", "weight": 2, "value": 6},
    {"name": "Food Pack", "weight": 3, "value": 7}
]


def prepare_graph(scenario, closed_roads):
    edges = GRAPHS.get(scenario, GRAPHS["Flood"])
    closed = {tuple(sorted(pair)) for pair in closed_roads}

    graph = {node: [] for node in LOCATIONS}
    active_edges = []

    for start, end, cost in edges:
        if tuple(sorted((start, end))) in closed:
            continue

        graph[start].append((end, cost))
        graph[end].append((start, cost))

        active_edges.append({
            "from": start,
            "to": end,
            "cost": cost
        })

    return graph, active_edges


# Dijkstra's shortest-path algorithm
def dijkstra(graph, start, destination):
    distances = {node: float("inf") for node in graph}
    previous = {node: None for node in graph}
    unvisited = set(graph)

    distances[start] = 0

    while unvisited:
        current = min(
            unvisited,
            key=lambda node: distances[node]
        )

        if distances[current] == float("inf"):
            break

        unvisited.remove(current)

        if current == destination:
            break

        for neighbor, cost in graph[current]:
            if neighbor in unvisited:
                candidate = distances[current] + cost

                if candidate < distances[neighbor]:
                    distances[neighbor] = candidate
                    previous[neighbor] = current

    if distances[destination] == float("inf"):
        return {"path": [], "cost": None}

    path = []
    current = destination

    while current is not None:
        path.append(current)
        current = previous[current]

    path.reverse()

    return {
        "path": path,
        "cost": int(distances[destination])
    }


# Breadth-first search
def bfs(graph, start):
    visited = set()
    queue = deque([start])
    order = []

    while queue:
        current = queue.popleft()

        if current in visited:
            continue

        visited.add(current)
        order.append(current)

        for neighbor, _ in graph[current]:
            if neighbor not in visited:
                queue.append(neighbor)

    return order


# Greedy supply allocation
def greedy_allocation(total_supply=100):
    remaining = total_supply
    allocation = []

    ranked = sorted(
        SUPPLY_NEEDS,
        key=lambda item: item["urgency"] / item["needed"],
        reverse=True
    )

    for item in ranked:
        amount = min(item["needed"], remaining)

        allocation.append({
            "location": item["location"],
            "needed": item["needed"],
            "urgency": item["urgency"],
            "allocated": amount,
            "shortage": item["needed"] - amount
        })

        remaining -= amount

    return {
        "total_supply": total_supply,
        "allocated": total_supply - remaining,
        "remaining": remaining,
        "items": allocation
    }


# 0/1 Knapsack using dynamic programming
def knapsack(capacity=10):
    n = len(KITS)

    dp = [
        [0 for _ in range(capacity + 1)]
        for _ in range(n + 1)
    ]

    for i in range(1, n + 1):
        weight = KITS[i - 1]["weight"]
        value = KITS[i - 1]["value"]

        for cap in range(capacity + 1):
            dp[i][cap] = dp[i - 1][cap]

            if weight <= cap:
                dp[i][cap] = max(
                    dp[i][cap],
                    value + dp[i - 1][cap - weight]
                )

    selected = []
    cap = capacity

    for i in range(n, 0, -1):
        if dp[i][cap] != dp[i - 1][cap]:
            kit = KITS[i - 1]
            selected.append(kit)
            cap -= kit["weight"]

    selected.reverse()

    return {
        "capacity": capacity,
        "total_weight": sum(
            item["weight"] for item in selected
        ),
        "total_value": sum(
            item["value"] for item in selected
        ),
        "selected": selected
    }


# Statistics using standard Python only
def route_cost_analysis(costs):
    valid_costs = [
        float(cost)
        for cost in costs
        if cost is not None
    ]

    if not valid_costs:
        return {
            "count": 0,
            "mean": None,
            "minimum": None,
            "maximum": None,
            "values": []
        }

    return {
        "count": len(valid_costs),
        "mean": round(
            sum(valid_costs) / len(valid_costs), 2
        ),
        "minimum": min(valid_costs),
        "maximum": max(valid_costs),
        "values": valid_costs
    }


# Main RescueNet calculation
def run_rescuenet(scenario="Flood", closed_roads=None):
    if closed_roads is None:
        closed_roads = []

    graph, active_edges = prepare_graph(
        scenario,
        closed_roads
    )

    route = dijkstra(graph, "A", "E")
    reachable = bfs(graph, "A")
    allocation = greedy_allocation(100)
    kit_plan = knapsack(10)

    analysis = route_cost_analysis([route["cost"]])

    return {
        "scenario": scenario,
        "route": route,
        "route_names": [
            LOCATIONS[node] for node in route["path"]
        ],
        "reachable": reachable,
        "reachable_names": [
            LOCATIONS[node] for node in reachable
        ],
        "edges": active_edges,
        "allocation": allocation,
        "knapsack": kit_plan,
        "analysis": analysis,
        "locations": LOCATIONS
    }


# JSON output for React
def run_as_json(scenario="Flood", closed_roads=None):
    return json.dumps(
        run_rescuenet(scenario, closed_roads),
        allow_nan=False
    )
