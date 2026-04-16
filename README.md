# ⚡ VPP Grid Balancer

A massively scalable Virtual Power Plant (VPP) simulation platform. This system simulates the coordination of thousands of distributed energy resources (like home batteries) to balance power grid frequencies in real-time. It features a high-performance Go dispatch engine, ultra-efficient Rust IoT edge clients, and an interactive React utility command center.

## 📑 Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Technologies Used](#-technologies-used)
- [Installation](#-installation)
- [Usage](#-usage)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features
* **Sub-Second Optimization:** Utilizes a custom knapsack solver algorithm within the Go dispatch engine to calculate the optimal mix of batteries needed to meet specific megawatt (MW) targets.
* **Massive Scale Simulation:** Orchestration tools capable of spinning up 1,000 to 5,000 individual Rust-based battery edge containers to test system concurrency.
* **Accurate Physics & Telemetry:** Rust edge clients simulate real battery charge/discharge curves and hardware limits, reporting State-of-Charge (SoC) every 5 seconds.
* **Grid Frequency Monitoring:** Simulates 60Hz grid fluctuations and automatic trip events.
* **Utility Command Center:** A comprehensive React and TypeScript dashboard featuring a live 60Hz frequency gauge, geographic heatmaps of battery participation, and real-time dispatch logs.
* **High-Concurrency Infrastructure:** Backed by a VerneMQ broker optimized for heavy, high-throughput IoT pub/sub traffic.

## 🏗️ Architecture
The platform is composed of four primary, containerized subsystems:
1. **MQTT Broker:** A high-performance message bus (VerneMQ) handling all telemetry and dispatch events.
2. **Dispatch Engine (Go):** The "Central Brain" that monitors grid frequency, maintains an in-memory registry of thousands of battery states, and fires optimization dispatch events.
3. **Battery Edge Client (Rust):** The home IoT simulator. Deployed as one slim container per home, handling physics simulation and MQTT telemetry.
4. **VPP Dashboard (React/TypeScript):** The web-based visualization frontend that connects to the dispatch engine via WebSockets.

## 🛠️ Technologies Used
* **Central Brain:** Go (Golang)
* **Edge Clients:** Rust
* **Frontend UI:** React, TypeScript, WebSockets
* **Message Broker:** VerneMQ (MQTT)
* **Deployment & CI/CD:** Docker, Docker Compose, Bash Orchestration, GitHub Actions

## 💻 Installation

### Prerequisites
* Docker and Docker Compose installed.
* Bash environment (for running large-scale simulation scripts).

### Setup Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/mtepenner/vpp-grid-balancer.git
   cd vpp-grid-balancer
   ```
2. For a local development setup (1 dispatcher, 5-10 batteries), use Docker Compose:
   ```bash
   docker-compose -f orchestration/docker-compose.yaml up --build -d
   ```
3. To test high-concurrency dispatching (1,000+ batteries), use the included scaling script:
   ```bash
   ./orchestration/scale_vpp.sh
   ```

## 🎮 Usage
Once the virtual power plant is online and batteries are reporting telemetry:
1. Open your browser and navigate to the Utility Command Center (typically `http://localhost:3000`).
2. Monitor the **Frequency Gauge** to watch live grid behavior (gauge flashes red when frequency drops below 59.9Hz).
3. Observe the **Aggregate Power Map** to view the geographic density and availability of home batteries.
4. When a frequency trip is simulated, watch the **Dispatch Terminal** log the sub-second response as thousands of homes coordinate to inject power back into the grid.

## 🤝 Contributing
Contributions are highly encouraged! When modifying the dispatch logic, please ensure that your changes maintain sub-second latency targets and pass the automated optimization tests.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/NewSolver`)
3. Commit your Changes (`git commit -m 'Implement enhanced optimization algorithm'`)
4. Push to the Branch (`git push origin feature/NewSolver`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
