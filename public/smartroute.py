
import networkx as nx
import matplotlib.pyplot as plt

# Create a weighted road network
G = nx.Graph()

roads = [
    ("A", "B", 4),
    ("A", "F", 7),
    ("B", "C", 3),
    ("B", "D", 6),
    ("B", "E", 5),
    ("C", "D", 5),
    ("D", "E", 2),
    ("D", "F", 4)
]

G.add_weighted_edges_from(roads)

# Location names
locations = {
    "A": "Rescue Base",
    "B": "Shelter",
    "C": "Supply Center",
    "D": "Flood Zone",
    "E": "Hospital",
    "F": "Safe Zone"
}

# Find the shortest route using Dijkstra's algorithm
route = nx.dijkstra_path(G, "A", "E", weight="weight")
cost = nx.dijkstra_path_length(G, "A", "E", weight="weight")

print("Shortest Route:")
print(" -> ".join(locations[node] for node in route))
print("Total Route Cost:", cost)

# Set positions for the locations
positions = {
    "A": (0, 2),
    "B": (2, 3),
    "C": (4, 4),
    "D": (4, 1),
    "E": (6, 3),
    "F": (2, 0)
}

# Identify the roads used by the shortest route
route_edges = list(zip(route, route[1:]))

# Draw the graph
nx.draw_networkx_nodes(
    G, positions,
    node_color="lightblue",
    node_size=1800
)

nx.draw_networkx_labels(
    G, positions,
    labels=locations,
    font_size=8
)

# Draw ordinary roads
other_edges = [
    edge for edge in G.edges()
    if edge not in route_edges
    and (edge[1], edge[0]) not in route_edges
]

nx.draw_networkx_edges(
    G, positions,
    edgelist=other_edges,
    edge_color="gray",
    width=1.5
)

# Highlight the shortest route
nx.draw_networkx_edges(
    G, positions,
    edgelist=route_edges,
    edge_color="green",
    width=4
)

# Display road costs
weights = nx.get_edge_attributes(G, "weight")
nx.draw_networkx_edge_labels(
    G, positions,
    edge_labels=weights,
    font_size=9
)

plt.title(f"SmartRoute: Shortest Emergency Route (Cost: {cost})")
plt.axis("off")
plt.tight_layout()
plt.show()
