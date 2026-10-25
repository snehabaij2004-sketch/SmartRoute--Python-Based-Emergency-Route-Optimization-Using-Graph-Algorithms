
import { useCallback, useEffect, useState } from "react";
import { loadPyodide } from "pyodide";
import "./App.css";

const NODES = [
  { id: "A", name: "Rescue Base", x: 75, y: 150 },
  { id: "B", name: "Shelter", x: 220, y: 65 },
  { id: "C", name: "Supply Center", x: 390, y: 45 },
  { id: "D", name: "Flood Zone", x: 390, y: 205 },
  { id: "E", name: "Hospital", x: 555, y: 95 },
  { id: "F", name: "Safe Zone", x: 220, y: 245 }
];

const ROADS = {
  Flood: [
    ["A", "B", 4], ["A", "F", 7], ["B", "C", 3],
    ["B", "D", 6], ["B", "E", 5], ["C", "D", 5],
    ["D", "E", 2], ["D", "F", 4]
  ],
  Earthquake: [
    ["A", "B", 3], ["A", "F", 6], ["B", "C", 5],
    ["B", "D", 4], ["B", "E", 7], ["C", "D", 2],
    ["D", "E", 3], ["D", "F", 5]
  ]
};

const roadKey = (a, b) => [a, b].sort().join("-");

export default function App() {
  const [runtime, setRuntime] = useState(null);
  const [result, setResult] = useState(null);
  const [scenario, setScenario] = useState("Flood");
  const [closedRoads, setClosedRoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Starting RescueNet...");
  const [error, setError] = useState("");

  const calculate = useCallback(
    async (py, selectedScenario, closures) => {
      if (!py) return;

      setBusy(true);
      setError("");

      try {
        py.globals.set(
          "rescuenet_input",
          JSON.stringify({
            scenario: selectedScenario,
            closed_roads: closures.map((road) => road.split("-"))
          })
        );

        const output = await py.runPythonAsync(`
import json
data = json.loads(rescuenet_input)
run_as_json(data["scenario"], data["closed_roads"])
`);

        const parsed = JSON.parse(output);
        setResult(parsed);
        setStatus("Algorithms calculated successfully");
      } catch (err) {
        setError(err?.message || String(err));
        setStatus("Calculation failed");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setLoading(true);
        setError("");
        setStatus("Loading Python runtime...");

        const py = await loadPyodide();

        if (cancelled) return;

        setStatus("Loading RescueNet algorithms...");

        const response = await fetch("/rescue_algorithms.py");

        if (!response.ok) {
          throw new Error(
            "Cannot load public/rescue_algorithms.py. Check the file location."
          );
        }

        const pythonCode = await response.text();

        // The Python file uses only the standard library.
        // No NumPy or Matplotlib packages are required.
        await py.runPythonAsync(pythonCode);

        if (cancelled) return;

        setRuntime(py);
        setStatus("RescueNet is ready");
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || String(err));
          setStatus("Initialization failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (runtime) {
      calculate(runtime, scenario, closedRoads);
    }
  }, [runtime, scenario, closedRoads, calculate]);

  function toggleRoad(a, b) {
    const key = roadKey(a, b);

    setClosedRoads((current) =>
      current.includes(key)
        ? current.filter((road) => road !== key)
        : [...current, key]
    );
  }

  const path = result?.route?.path || [];
  const edges = result?.edges || [];
  const allocation = result?.allocation;
  const knapsack = result?.knapsack;
  const analysis = result?.analysis;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">R</span>
          <span>
            Rescue<span className="brand-accent">Net</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className={`status-dot ${error ? "status-error" : ""}`} />
          <span className="status-text">{status}</span>
          <span className="live-pill">LIVE SIMULATION</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">DISASTER RESPONSE INTELLIGENCE</p>
          <h1>
            Every second matters.
            <br />
            <span>Every route counts.</span>
          </h1>

          <p className="hero-description">
            A disaster-response dashboard using graph algorithms
            and resource optimization to support emergency decisions.
          </p>

          <div className="hero-controls">
            <label htmlFor="scenario">Disaster scenario</label>

            <select
              id="scenario"
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            >
              <option value="Flood">Flood response</option>
              <option value="Earthquake">Earthquake response</option>
            </select>

            <button
              className="button button-secondary"
              onClick={() => setClosedRoads([])}
              disabled={closedRoads.length === 0}
            >
              Reset road closures
            </button>
          </div>
        </div>

        <div className="hero-badge">
          <span className="pulse-ring">+</span>
          <div>
            <strong>RESCUE</strong>
            <small>OPERATIONS CENTER</small>
          </div>
        </div>
      </section>

      {error && (
        <section className="error-panel">
          <strong>RescueNet error</strong>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </section>
      )}

      <section className="metrics-grid">
        <Metric
          label="SHORTEST ROUTE COST"
          value={result?.route?.cost ?? "—"}
          unit="cost units"
          icon="↗"
        />
        <Metric
          label="LOCATIONS REACHABLE"
          value={result?.reachable?.length ?? "—"}
          unit="of 6 locations"
          icon="◎"
        />
        <Metric
          label="SUPPLIES DISTRIBUTED"
          value={allocation?.allocated ?? "—"}
          unit="supply units"
          icon="▣"
        />
        <Metric
          label="EMERGENCY KIT VALUE"
          value={knapsack?.total_value ?? "—"}
          unit="optimized value"
          icon="✚"
        />
      </section>

      <section className="content-grid">
        <article className="panel network-panel">
          <PanelHeading
            eyebrow="ROUTE PLANNING"
            title="Emergency network"
            tag={scenario.toUpperCase()}
          />

          <div className="map-legend">
            <span>
              <i className="legend-line route-line" />
              Recommended route
            </span>
            <span>
              <i className="legend-line" />
              Available road
            </span>
            <span>
              <i className="legend-line closed-line" />
              Closed road
            </span>
          </div>

          <div className="network-canvas">
            <svg
              viewBox="0 0 630 310"
              role="img"
              aria-label="Interactive emergency road network"
            >
              <defs>
                <pattern
                  id="grid"
                  width="22"
                  height="22"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 22 0 L 0 0 0 22"
                    fill="none"
                    stroke="rgba(148,163,184,.09)"
                  />
                </pattern>
              </defs>

              <rect width="630" height="310" fill="url(#grid)" />

              {ROADS[scenario].map(([a, b, cost]) => {
                const start = NODES.find((node) => node.id === a);
                const end = NODES.find((node) => node.id === b);
                const key = roadKey(a, b);
                const isClosed = closedRoads.includes(key);

                const isRoute =
                  path.some(
                    (node, i) =>
                      i < path.length - 1 &&
                      roadKey(node, path[i + 1]) === key
                  ) && !isClosed;

                return (
                  <g
                    key={key}
                    className="road-control"
                    onClick={() => toggleRoad(a, b)}
                    role="button"
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRoad(a, b);
                      }
                    }}
                  >
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      className="road-hitbox"
                    />

                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      className={`road ${
                        isClosed
                          ? "road-closed"
                          : isRoute
                          ? "road-route"
                          : ""
                      }`}
                    />

                    <rect
                      x={(start.x + end.x) / 2 - 13}
                      y={(start.y + end.y) / 2 - 10}
                      width="26"
                      height="20"
                      rx="6"
                      className={`cost-label ${
                        isClosed ? "cost-label-closed" : ""
                      }`}
                    />

                    <text
                      x={(start.x + end.x) / 2}
                      y={(start.y + end.y) / 2 + 4}
                      textAnchor="middle"
                      className="cost-text"
                    >
                      {isClosed ? "×" : cost}
                    </text>
                  </g>
                );
              })}

              {NODES.map((node) => (
                <g key={node.id} className="node">
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    className={`node-circle node-${node.id}`}
                  />
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    className="node-letter"
                  >
                    {node.id}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 37}
                    textAnchor="middle"
                    className="node-name"
                  >
                    {node.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="route-summary">
            <div>
              <span className="small-label">
                BEST ROUTE · BASE A TO HOSPITAL E
              </span>

              <div className="route-sequence">
                {path.length ? (
                  path.map((node, index) => (
                    <span className="route-step" key={`${node}-${index}`}>
                      <b>{node}</b>
                      {index < path.length - 1 && <i>→</i>}
                    </span>
                  ))
                ) : (
                  <span className="unreachable">
                    No route available. Reopen a road.
                  </span>
                )}
              </div>

              {result?.route_names?.length > 0 && (
                <p className="muted route-names">
                  {result.route_names.join(" → ")}
                </p>
              )}
            </div>

            <div className="route-cost">
              <strong>{result?.route?.cost ?? "∞"}</strong>
              <span>total cost</span>
            </div>
          </div>

          <p className="hint">
            Click a road to close or reopen it. The route recalculates
            automatically.
          </p>
        </article>

        <article className="panel analysis-panel">
          <PanelHeading
            eyebrow="ROUTE STATISTICS"
            title="Route cost analysis"
            tag="PURE PYTHON"
          />

          <p className="panel-description">
            Statistics are calculated with built-in Python functions.
            The chart is drawn using React SVG.
          </p>

          <div className="analysis-stats">
            <AnalysisStat
              label="Mean cost"
              value={analysis?.mean ?? "—"}
            />
            <AnalysisStat
              label="Minimum"
              value={analysis?.minimum ?? "—"}
            />
            <AnalysisStat
              label="Maximum"
              value={analysis?.maximum ?? "—"}
            />
          </div>

          {analysis?.values?.length ? (
            <RouteChart values={analysis.values} />
          ) : (
            <div className="chart-placeholder">
              {loading || busy
                ? "Calculating route analysis..."
                : "No route costs available."}
            </div>
          )}

          <div className="algorithm-note">
            <span className="algorithm-icon">ƒ</span>
            <div>
              <strong>Python-powered calculations</strong>
              <p>
                Dijkstra finds the shortest path. Python calculates
                statistics, and React displays the chart.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel">
          <PanelHeading
            eyebrow="RESOURCE DISTRIBUTION"
            title="Greedy supply allocation"
            tag="100 UNITS"
          />

          <p className="panel-description">
            Supplies are prioritized by urgency relative to need.
          </p>

          <div className="supply-list">
            {(allocation?.items || []).map((item) => (
              <div className="supply-item" key={item.location}>
                <div className="supply-topline">
                  <strong>{item.location}</strong>
                  <span>
                    {item.allocated} / {item.needed} units
                  </span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${
                        item.needed
                          ? (item.allocated / item.needed) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>

                <div className="supply-meta">
                  <span>Urgency {item.urgency}/100</span>
                  <span>
                    {item.shortage
                      ? `${item.shortage} still needed`
                      : "Need met"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <PanelFoot
            label="Total distributed"
            value={`${allocation?.allocated ?? "—"} units`}
          />
        </article>

        <article className="panel">
          <PanelHeading
            eyebrow="EMERGENCY KIT PLANNING"
            title="0/1 knapsack optimization"
            tag="CAPACITY 10"
          />

          <p className="panel-description">
            Dynamic programming selects the highest-value kit combination
            without exceeding the weight capacity.
          </p>

          <div className="kit-summary">
            <div>
              <span className="small-label">SELECTED WEIGHT</span>
              <strong>
                {knapsack?.total_weight ?? "—"}
                <small> / 10</small>
              </strong>
            </div>
            <div>
              <span className="small-label">TOTAL VALUE</span>
              <strong>{knapsack?.total_value ?? "—"}</strong>
            </div>
          </div>

          <div className="kit-list">
            {(knapsack?.selected || []).map((kit) => (
              <div className="kit-item" key={kit.name}>
                <span className="kit-check">✓</span>
                <span className="kit-name">{kit.name}</span>
                <span className="kit-weight">
                  Weight {kit.weight}
                </span>
                <strong>+{kit.value}</strong>
              </div>
            ))}
          </div>

          <PanelFoot
            label="Optimization method"
            value="Dynamic programming"
          />
        </article>

        <article className="panel reach-panel">
          <PanelHeading
            eyebrow="CONNECTIVITY CHECK"
            title="Reachable locations"
            tag="BFS"
          />

          <p className="panel-description">
            Breadth-first search identifies locations reachable from
            Rescue Base A.
          </p>

          <div className="reachable-list">
            {(result?.reachable_names || []).map((name, index) => (
              <div className="reachable-item" key={name}>
                <span className="reachable-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{name}</span>
                <span className="reachable-check">Connected</span>
              </div>
            ))}
          </div>

          <PanelFoot
            label="Reachability"
            value={`${result?.reachable?.length ?? 0} / 6 locations`}
          />
        </article>
      </section>

      <footer className="footer">
        <div className="brand footer-brand">
          <span className="brand-mark">R</span>
          <span>
            Rescue<span className="brand-accent">Net</span>
          </span>
        </div>

        <p>
          Academic mini project · Design and Analysis of Algorithms + Python
        </p>

        <span className="footer-status">
          <i />
          {loading
            ? "Initializing"
            : error
            ? "Needs attention"
            : busy
            ? "Updating"
            : "System ready"}
        </span>
      </footer>
    </main>
  );
}

function Metric({ label, value, unit, icon }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-unit">{unit}</div>
    </article>
  );
}

function PanelHeading({ eyebrow, title, tag }) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span className="panel-tag">{tag}</span>
    </div>
  );
}

function AnalysisStat({ label, value }) {
  return (
    <div className="analysis-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanelFoot({ label, value }) {
  return (
    <div className="panel-foot">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RouteChart({ values }) {
  const width = 420;
  const height = 150;
  const baseline = 118;
  const maxValue = Math.max(...values, 1);
  const barWidth = Math.min(72, 220 / values.length);
  const gap =
    values.length > 1
      ? (width - values.length * barWidth) / (values.length + 1)
      : (width - barWidth) / 2;

  return (
    <div className="chart-image-wrap route-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Route cost bar chart"
      >
        {[0, 1, 2, 3].map((tick) => {
          const y = 20 + tick * 30;

          return (
            <line
              key={tick}
              x1="28"
              y1={y}
              x2="405"
              y2={y}
              stroke="currentColor"
              strokeDasharray="3 4"
              opacity="0.2"
            />
          );
        })}

        {values.map((value, index) => {
          const barHeight = (value / maxValue) * 82;
          const x = gap + index * (barWidth + gap);

          return (
            <g key={`${index}-${value}`}>
              <rect
                x={x}
                y={baseline - barHeight}
                width={barWidth}
                height={barHeight}
                rx="5"
                fill="#26b9b2"
              />

              <text
                x={x + barWidth / 2}
                y={baseline - barHeight - 7}
                textAnchor="middle"
                fill="currentColor"
                fontSize="11"
                fontWeight="700"
              >
                {value}
              </text>

              <text
                x={x + barWidth / 2}
                y="137"
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
              >
                Route {index + 1}
              </text>
            </g>
          );
        })}

        <line
          x1="28"
          y1={baseline}
          x2="405"
          y2={baseline}
          stroke="currentColor"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}
