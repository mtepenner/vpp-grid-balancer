mod battery_sim;
mod telemetry;

use std::env;
use std::sync::Arc;
use std::time::Duration;

use log::{error, info, warn};
use rand::Rng;
use rumqttc::{AsyncClient, Event, Incoming, MqttOptions, QoS};
use serde::Deserialize;
use tokio::sync::Mutex;
use tokio::time;

use battery_sim::physics::BatteryState;

/// Command received from the dispatch engine.
#[derive(Deserialize, Debug)]
struct DispatchCommand {
    battery_id: String,
    target_kw: f64,
    action: String, // "discharge" | "idle"
    event_id: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    // Battery identity: configurable via env so each container has a unique ID.
    let battery_id = env::var("BATTERY_ID").unwrap_or_else(|_| {
        format!("battery-{}", uuid::Uuid::new_v4())
    });

    let broker_host = env::var("MQTT_HOST").unwrap_or_else(|_| "vernemq".to_string());
    let broker_port: u16 = env::var("MQTT_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(1883);

    let capacity_kw: f64 = env::var("BATTERY_CAPACITY_KW")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or_else(|| {
            let mut rng = rand::thread_rng();
            5.0 + rng.gen_range(0.0..10.0)
        });

    info!("Starting battery edge client: id={battery_id} capacity={capacity_kw:.1} kW");

    let state = Arc::new(Mutex::new(BatteryState::new(capacity_kw)));

    // MQTT setup.
    let mut mqtt_opts = MqttOptions::new(&battery_id, &broker_host, broker_port);
    mqtt_opts.set_keep_alive(Duration::from_secs(30));
    mqtt_opts.set_clean_session(true);

    let (client, mut event_loop) = AsyncClient::new(mqtt_opts, 64);

    // Subscribe to personalised dispatch commands.
    let dispatch_topic = format!("vpp/dispatch/{battery_id}");
    client
        .subscribe(&dispatch_topic, QoS::AtLeastOnce)
        .await
        .expect("subscribe failed");

    // ── Telemetry publisher: every 5 seconds ─────────────────────────────────
    let telemetry_client = client.clone();
    let telemetry_state = Arc::clone(&state);
    let telemetry_id = battery_id.clone();
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(5));
        loop {
            interval.tick().await;
            let guard = telemetry_state.lock().await;
            if let Err(e) =
                telemetry::publisher::publish(&telemetry_client, &telemetry_id, &guard).await
            {
                warn!("Telemetry publish error: {e}");
            } else {
                info!(
                    "[{telemetry_id}] SoC={:.1}% power={:.2} kW",
                    guard.get_soc(),
                    guard.current_power_kw
                );
            }
        }
    });

    // ── Physics ticker: every second ─────────────────────────────────────────
    let physics_state = Arc::clone(&state);
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(1));
        loop {
            interval.tick().await;
            let mut guard = physics_state.lock().await;
            guard.update_physics(1.0);
        }
    });

    // ── MQTT event loop: handles incoming dispatch commands ───────────────────
    loop {
        match event_loop.poll().await {
            Ok(Event::Incoming(Incoming::Publish(msg))) => {
                let payload = String::from_utf8_lossy(&msg.payload);
                match serde_json::from_str::<DispatchCommand>(&payload) {
                    Ok(cmd) => {
                        info!("[{battery_id}] dispatch cmd: {:?}", cmd);
                        let mut guard = state.lock().await;
                        match cmd.action.as_str() {
                            "discharge" => {
                                let delivered = guard.discharge(cmd.target_kw, 1.0);
                                info!(
                                    "[{battery_id}] discharging {delivered:.2} kW (event {})",
                                    cmd.event_id
                                );
                            }
                            "idle" => guard.update_physics(1.0),
                            other => warn!("Unknown action: {other}"),
                        }
                    }
                    Err(e) => error!("Malformed dispatch command: {e}"),
                }
            }
            Ok(_) => {}
            Err(e) => {
                error!("MQTT event loop error: {e}");
                time::sleep(Duration::from_secs(5)).await;
            }
        }
    }
}
