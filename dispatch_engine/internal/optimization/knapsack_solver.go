package optimization

import (
	"sort"

	"github.com/mtepenner/vpp-grid-balancer/dispatch_engine/internal/inventory"
)

// Solve selects the best mix of batteries to meet targetMW (megawatts).
//
// Strategy: greedy knapsack — sort by available capacity descending, pick
// until target is satisfied. This runs in O(n log n) and is well within the
// sub-second budget required for frequency-event response.
func Solve(batteries []inventory.Battery, targetMW float64) []inventory.Battery {
	if targetMW <= 0 || len(batteries) == 0 {
		return nil
	}

	targetKW := targetMW * 1000.0

	// Work on a copy so callers keep their original slice order.
	candidates := make([]inventory.Battery, len(batteries))
	copy(candidates, batteries)

	// Sort by available discharge capacity descending (higher SOC first).
	sort.Slice(candidates, func(i, j int) bool {
		availI := candidates[i].MaxCapacityKW * (candidates[i].StateOfCharge / 100.0)
		availJ := candidates[j].MaxCapacityKW * (candidates[j].StateOfCharge / 100.0)
		return availI > availJ
	})

	selected := make([]inventory.Battery, 0)
	accumulated := 0.0

	for _, b := range candidates {
		if accumulated >= targetKW {
			break
		}
		available := b.MaxCapacityKW * (b.StateOfCharge / 100.0)
		if available <= 0 {
			continue
		}
		selected = append(selected, b)
		accumulated += available
	}

	return selected
}
