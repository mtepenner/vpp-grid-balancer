#!/usr/bin/env python3
"""
frequency_sensor.py — Grid frequency simulation script.

Simulates a 60 Hz power grid, randomly introducing "trip" events
(frequency < 59.9 Hz). Publishes readings to stdout (JSON, one per line)
so the output can be consumed by any upstream process or piped to a file.

This script is NOT imported by the Go dispatch engine; it is a standalone
simulation utility.

Usage:
    python3 frequency_sensor.py [--broker mqtt://localhost:1883] [--interval 0.5]
"""

import argparse
import json
import math
import random
import sys
import time


NORMAL_HZ = 60.0
TRIP_PROBABILITY = 0.05
NOISE_AMPLITUDE = 0.2   # ±0.2 Hz normal jitter


def simulate_frequency(t: float) -> float:
    """Return a simulated grid frequency with sinusoidal base + noise."""
    base = NORMAL_HZ + math.sin(t * 0.1) * 0.05
    noise = random.gauss(0, NOISE_AMPLITUDE / 3)
    freq = base + noise
    if random.random() < TRIP_PROBABILITY:
        freq = random.uniform(59.5, 59.89)
    return round(freq, 4)


def publish_stdout(interval: float) -> None:
    """Write frequency readings as JSON lines to stdout."""
    t = 0.0
    try:
        while True:
            freq = simulate_frequency(t)
            reading = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "frequency_hz": freq,
                "trip": freq < 59.9,
            }
            sys.stdout.write(json.dumps(reading) + "\n")
            sys.stdout.flush()
            t += interval
            time.sleep(interval)
    except KeyboardInterrupt:
        pass


def publish_mqtt(broker_url: str, interval: float) -> None:
    """Publish frequency readings to the MQTT broker on vpp/grid/frequency."""
    try:
        import paho.mqtt.client as mqtt_client
    except ImportError:
        print("paho-mqtt not installed; falling back to stdout", file=sys.stderr)
        publish_stdout(interval)
        return

    client = mqtt_client.Client(client_id="frequency-sensor")
    parts = broker_url.replace("mqtt://", "").replace("tcp://", "").split(":")
    host = parts[0]
    port = int(parts[1]) if len(parts) > 1 else 1883

    client.connect(host, port, keepalive=60)
    client.loop_start()

    t = 0.0
    try:
        while True:
            freq = simulate_frequency(t)
            payload = json.dumps({
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "frequency_hz": freq,
                "trip": freq < 59.9,
            })
            client.publish("vpp/grid/frequency", payload, qos=1)
            t += interval
            time.sleep(interval)
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()


def main() -> None:
    parser = argparse.ArgumentParser(description="Grid frequency simulator")
    parser.add_argument(
        "--broker",
        default=None,
        help="MQTT broker URL (e.g. mqtt://localhost:1883). "
             "Omit to write JSON lines to stdout.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0.5,
        help="Seconds between readings (default: 0.5)",
    )
    args = parser.parse_args()

    if args.broker:
        publish_mqtt(args.broker, args.interval)
    else:
        publish_stdout(args.interval)


if __name__ == "__main__":
    main()
