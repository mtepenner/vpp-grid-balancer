use rand::Rng;
use serde::{Deserialize, Serialize};

/// Physical constants for a typical residential lithium-ion battery pack.
const CHARGE_EFFICIENCY: f64 = 0.95;
const DISCHARGE_EFFICIENCY: f64 = 0.95;
/// Maximum charge / discharge rate as a fraction of total capacity per second.
const MAX_C_RATE_PER_SEC: f64 = 0.5 / 3600.0; // 0.5 C expressed per second

/// The complete runtime state of one simulated battery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryState {
    /// State of charge in [0.0, 1.0].
    pub soc: f64,
    /// Rated maximum power output in kilowatts.
    pub capacity_kw: f64,
    /// Current net power flow (positive = discharging, negative = charging).
    pub current_power_kw: f64,
    /// Temperature in Celsius — affects efficiency slightly.
    pub temperature_c: f64,
}

impl BatteryState {
    /// Create a new battery with a randomised initial SoC between 50 % and 95 %.
    pub fn new(capacity_kw: f64) -> Self {
        let mut rng = rand::thread_rng();
        Self {
            soc: rng.gen_range(0.5..0.95),
            capacity_kw,
            current_power_kw: 0.0,
            temperature_c: 25.0,
        }
    }

    /// Advance physics by `dt` seconds when the battery is charging.
    ///
    /// The battery draws `power_kw` from the grid; SoC rises accordingly.
    pub fn charge(&mut self, power_kw: f64, dt: f64) {
        let power = power_kw.abs().min(self.capacity_kw);
        self.current_power_kw = -power; // negative = charging convention
        let delta_soc = (power * CHARGE_EFFICIENCY * dt) / (self.capacity_kw * 3600.0);
        self.soc = (self.soc + delta_soc).min(1.0);
        self.temperature_c += 0.001 * power; // minor thermal rise
    }

    /// Advance physics by `dt` seconds when the battery is discharging.
    ///
    /// Returns the actual power delivered (may be less than requested if SoC is low).
    pub fn discharge(&mut self, requested_kw: f64, dt: f64) -> f64 {
        let max_delta = MAX_C_RATE_PER_SEC * self.capacity_kw * dt * 3600.0;
        let deliverable_kw = (self.soc * self.capacity_kw * DISCHARGE_EFFICIENCY)
            .min(requested_kw)
            .min(self.capacity_kw);
        let actual_power = deliverable_kw.min(max_delta * 3600.0 / dt); // clamp to C-rate
        self.current_power_kw = actual_power;
        let delta_soc = (actual_power * dt) / (self.capacity_kw * DISCHARGE_EFFICIENCY * 3600.0);
        self.soc = (self.soc - delta_soc).max(0.0);
        self.temperature_c += 0.002 * actual_power;
        actual_power
    }

    /// Passive idle — no charge/discharge. Model slight self-discharge and cooling.
    pub fn update_physics(&mut self, dt: f64) {
        self.current_power_kw = 0.0;
        // Tiny self-discharge: ~2 % per day
        let self_discharge = 0.02 / 86400.0 * dt;
        self.soc = (self.soc - self_discharge).max(0.0);
        // Cool towards ambient (25 °C)
        self.temperature_c += (25.0 - self.temperature_c) * 0.01 * dt;
    }

    /// Return State-of-Charge as a percentage in [0.0, 100.0].
    pub fn get_soc(&self) -> f64 {
        self.soc * 100.0
    }

    /// Whether the battery can usefully participate in a dispatch event.
    pub fn is_available(&self) -> bool {
        self.soc > 0.15 && self.temperature_c < 45.0
    }
}
