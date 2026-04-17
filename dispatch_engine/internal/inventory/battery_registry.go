package inventory

import (
	"sync"
)

// Battery represents the state of a single home battery unit.
type Battery struct {
	ID             string
	StateOfCharge  float64 // 0–100 %
	MaxCapacityKW  float64
	CurrentPowerKW float64
	IsAvailable    bool
}

// Registry is a thread-safe in-memory store of battery states.
type Registry struct {
	mu        sync.RWMutex
	batteries map[string]*Battery
}

// NewRegistry returns an initialised Registry.
func NewRegistry() *Registry {
	return &Registry{batteries: make(map[string]*Battery)}
}

// Register adds or replaces a battery entry.
func (r *Registry) Register(b Battery) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.batteries[b.ID] = &b
}

// UpdateState merges the supplied fields into an existing battery entry.
// If the battery is not yet registered it is created.
func (r *Registry) UpdateState(id string, soc, currentPowerKW float64, available bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if b, ok := r.batteries[id]; ok {
		b.StateOfCharge = soc
		b.CurrentPowerKW = currentPowerKW
		b.IsAvailable = available
	} else {
		r.batteries[id] = &Battery{
			ID:             id,
			StateOfCharge:  soc,
			CurrentPowerKW: currentPowerKW,
			IsAvailable:    available,
		}
	}
}

// GetAvailable returns a snapshot of all batteries that are currently available.
func (r *Registry) GetAvailable() []Battery {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Battery, 0, len(r.batteries))
	for _, b := range r.batteries {
		if b.IsAvailable {
			out = append(out, *b)
		}
	}
	return out
}

// GetAll returns a snapshot of every registered battery.
func (r *Registry) GetAll() []Battery {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Battery, 0, len(r.batteries))
	for _, b := range r.batteries {
		out = append(out, *b)
	}
	return out
}

// Count returns the total number of registered batteries.
func (r *Registry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.batteries)
}
