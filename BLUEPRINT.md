vpp-grid-balancer/
│
├── .github/                             # CI/CD for scaling and latency tests
│   └── workflows/
│       ├── test-dispatch-logic.yml      # Unit tests for the sub-second optimization math
│       └── build-edge-client.yml
│
├── mqtt_broker/                         # Infrastructure: High-performance message bus
│   ├── config/
│   │   └── vernemq.conf                 # Specialized MQTT config for high-concurrency
│   └── Dockerfile
│
├── dispatch_engine/                     # Go: The "Central Brain" 
│   ├── cmd/
│   │   └── master/
│   │       └── main.go                  # Main loop: Monitor grid Hz and fire dispatch events
│   ├── internal/
│   │   ├── inventory/
│   │   │   └── battery_registry.go      # In-memory store of 5,000+ battery states (SOC/Capacity)
│   │   ├── optimization/
│   │   │   └── knapsack_solver.go       # Finds the best battery mix to meet the MW target
│   │   └── grid_monitor/
│   │       └── frequency_sensor.py      # Simulates 60Hz grid fluctuations and "trips"
│   ├── go.mod
│   └── Dockerfile
│
├── battery_edge_client/                 # Rust: The Home IoT Simulator (1 container per home)
│   ├── src/
│   │   ├── main.rs                      # High-efficiency MQTT client
│   │   ├── battery_sim/
│   │   │   └── physics.rs               # Simulates charge/discharge curves and hardware limits
│   │   └── telemetry/
│   │       └── publisher.rs             # Reports State-of-Charge (SoC) every 5 seconds
│   ├── Cargo.toml
│   └── Dockerfile                       # Ultra-slim Alpine-based image
│
├── vpp_dashboard/                       # React + TypeScript: The Utility Command Center
│   ├── src/
│   │   ├── components/
│   │   │   ├── FrequencyGauge.tsx       # Live 60Hz dial (flashes red when < 59.9Hz)
│   │   │   ├── AggregatePowerMap.tsx    # Geographic heatmap of battery participation
│   │   │   └── DispatchTerminal.tsx     # Logs showing "5,234 homes responding to event"
│   │   ├── hooks/
│   │   │   └── useGridMetrics.ts        # Connects to the dispatch engine via WebSockets
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── Dockerfile
│
├── orchestration/                       # Massive Scale Simulation
│   ├── docker-compose.yaml              # Local dev setup (1 dispatcher, 5-10 batteries)
│   └── scale_vpp.sh                     # Bash script to spin up 1,000-5,000 Rust containers
├── Makefile
└── README.md
