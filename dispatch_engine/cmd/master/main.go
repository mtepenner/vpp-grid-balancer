package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gorilla/websocket"
	"github.com/mtepenner/vpp-grid-balancer/dispatch_engine/internal/inventory"
	"github.com/mtepenner/vpp-grid-balancer/dispatch_engine/internal/optimization"
)

const (
	mqttBrokerURL    = "tcp://vernemq:1883"
	telemetryTopic   = "vpp/telemetry/#"
	dispatchTopic    = "vpp/dispatch"
	normalFrequency  = 60.0
	tripThreshold    = 59.9
	dispatchTargetMW = 10.0
	wsAddr           = ":8080"
)

// GridMetrics is broadcast to WebSocket clients.
type GridMetrics struct {
	Frequency       float64 `json:"frequency"`
	DispatchedCount int     `json:"dispatchedCount"`
	TotalBatteries  int     `json:"totalBatteries"`
	Event           string  `json:"event,omitempty"`
	Timestamp       string  `json:"timestamp"`
}

// TelemetryPayload is published by each battery edge client.
type TelemetryPayload struct {
	BatteryID      string  `json:"battery_id"`
	StateOfCharge  float64 `json:"soc"`
	MaxCapacityKW  float64 `json:"max_capacity_kw"`
	CurrentPowerKW float64 `json:"current_power_kw"`
	IsAvailable    bool    `json:"is_available"`
}

// DispatchCommand is sent to selected batteries.
type DispatchCommand struct {
	BatteryID  string  `json:"battery_id"`
	TargetKW   float64 `json:"target_kw"`
	Action     string  `json:"action"` // "discharge" | "idle"
	EventID    string  `json:"event_id"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]struct{}
}

func newHub() *hub { return &hub{clients: make(map[*websocket.Conn]struct{})} }

func (h *hub) add(c *websocket.Conn) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *hub) remove(c *websocket.Conn) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
}

func (h *hub) broadcast(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("ws write error: %v", err)
		}
	}
}

func main() {
	registry := inventory.NewRegistry()
	wsHub := newHub()

	// Pre-populate registry with 5 000 simulated batteries for scale testing.
	for i := 0; i < 5000; i++ {
		registry.Register(inventory.Battery{
			ID:            fmt.Sprintf("sim-battery-%04d", i),
			StateOfCharge: 50.0 + rand.Float64()*50.0,
			MaxCapacityKW: 5.0 + rand.Float64()*10.0,
			IsAvailable:   true,
		})
	}

	// MQTT client setup.
	mqttOpts := mqtt.NewClientOptions().
		AddBroker(mqttBrokerURL).
		SetClientID("dispatch-engine").
		SetConnectRetry(true).
		SetConnectRetryInterval(5 * time.Second).
		SetAutoReconnect(true)

	mqttOpts.OnConnect = func(c mqtt.Client) {
		log.Println("MQTT connected")
		token := c.Subscribe(telemetryTopic, 1, func(_ mqtt.Client, msg mqtt.Message) {
			var payload TelemetryPayload
			if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
				return
			}
			registry.UpdateState(payload.BatteryID, payload.StateOfCharge,
				payload.CurrentPowerKW, payload.IsAvailable)
		})
		token.Wait()
	}

	mqttClient := mqtt.NewClient(mqttOpts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		log.Printf("MQTT initial connect error (will retry): %v", token.Error())
	}

	// Grid monitor goroutine — simulates 60 Hz readings.
	freqCh := make(chan float64, 8)
	go runGridMonitor(freqCh)

	// Dispatch loop.
	go func() {
		for freq := range freqCh {
			total := registry.Count()
			dispatched := 0
			event := ""

			if freq < tripThreshold {
				available := registry.GetAvailable()
				selected := optimization.Solve(available, dispatchTargetMW)
				dispatched = len(selected)
				eventID := fmt.Sprintf("evt-%d", time.Now().UnixNano())
				event = fmt.Sprintf("%d homes responding to event %s", dispatched, eventID)
				log.Printf("TRIP %.3f Hz — dispatching %d batteries (event %s)", freq, dispatched, eventID)

				for _, b := range selected {
					cmd := DispatchCommand{
						BatteryID: b.ID,
						TargetKW:  b.MaxCapacityKW,
						Action:    "discharge",
						EventID:   eventID,
					}
					payload, _ := json.Marshal(cmd)
					mqttClient.Publish(dispatchTopic+"/"+b.ID, 1, false, payload)
				}
			}

			metrics := GridMetrics{
				Frequency:       freq,
				DispatchedCount: dispatched,
				TotalBatteries:  total,
				Event:           event,
				Timestamp:       time.Now().UTC().Format(time.RFC3339),
			}
			data, _ := json.Marshal(metrics)
			wsHub.broadcast(data)
		}
	}()

	// WebSocket endpoint.
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		wsHub.add(conn)
		defer func() {
			wsHub.remove(conn)
			conn.Close()
		}()
		// Keep connection alive; drain any incoming messages.
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "ok")
	})

	log.Printf("Dispatch engine listening on %s", wsAddr)
	log.Fatal(http.ListenAndServe(wsAddr, nil))
}

// runGridMonitor simulates 60 Hz grid readings and randomly introduces trips.
func runGridMonitor(out chan<- float64) {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		freq := normalFrequency + (rand.Float64()-0.5)*0.4 // ±0.2 Hz jitter
		// ~5 % chance of a trip event.
		if rand.Float64() < 0.05 {
			freq = 59.5 + rand.Float64()*0.39 // 59.5–59.89 Hz
		}
		out <- freq
	}
}
