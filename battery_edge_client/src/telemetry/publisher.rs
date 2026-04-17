use rumqttc::AsyncClient;
use serde::Serialize;

use crate::battery_sim::physics::BatteryState;

/// The JSON payload sent to the MQTT telemetry topic every 5 seconds.
#[derive(Serialize)]
pub struct TelemetryPayload<'a> {
    pub battery_id: &'a str,
    pub soc: f64,
    pub max_capacity_kw: f64,
    pub current_power_kw: f64,
    pub is_available: bool,
}

/// Serialise the battery state and publish it to `vpp/telemetry/{battery_id}`.
pub async fn publish(
    client: &AsyncClient,
    battery_id: &str,
    state: &BatteryState,
) -> Result<(), rumqttc::ClientError> {
    let payload = TelemetryPayload {
        battery_id,
        soc: state.get_soc(),
        max_capacity_kw: state.capacity_kw,
        current_power_kw: state.current_power_kw,
        is_available: state.is_available(),
    };

    let topic = format!("vpp/telemetry/{battery_id}");
    let json = serde_json::to_string(&payload).expect("serialisation cannot fail");

    client
        .publish(topic, rumqttc::QoS::AtLeastOnce, false, json.as_bytes())
        .await
}
