import React, { useEffect, useRef } from 'react';

interface Props {
  frequency: number;
}

const TRIP_THRESHOLD = 59.9;
const NORMAL_HZ = 60.0;
const RANGE = 0.5; // display ±0.5 Hz

const FrequencyGauge: React.FC<Props> = ({ frequency }) => {
  const isTripping = frequency < TRIP_THRESHOLD;
  const flashRef = useRef<boolean>(false);

  useEffect(() => {
    flashRef.current = isTripping;
  }, [isTripping]);

  // Map frequency to 0–100 % for the fill bar.
  const pct = Math.max(0, Math.min(100,
    ((frequency - (NORMAL_HZ - RANGE)) / (RANGE * 2)) * 100
  ));

  const accentColor = isTripping ? '#f85149' : '#3fb950';

  return (
    <div style={styles.wrapper}>
      {/* Numeric readout */}
      <div style={{
        ...styles.readout,
        color: accentColor,
        animation: isTripping ? 'pulse 0.4s infinite alternate' : 'none',
      }}>
        {frequency.toFixed(3)} Hz
      </div>

      {/* Status badge */}
      <div style={{
        ...styles.badge,
        background: isTripping ? '#f8514933' : '#3fb95033',
        color: accentColor,
        border: `1px solid ${accentColor}`,
      }}>
        {isTripping ? '⚠ TRIP EVENT' : '✓ NORMAL'}
      </div>

      {/* Bar gauge */}
      <div style={styles.track}>
        <div style={{
          ...styles.fill,
          width: `${pct}%`,
          background: accentColor,
          transition: 'width 0.4s ease, background 0.4s ease',
        }} />
      </div>

      <div style={styles.scale}>
        <span>{(NORMAL_HZ - RANGE).toFixed(1)}</span>
        <span>{NORMAL_HZ.toFixed(1)} Hz</span>
        <span>{(NORMAL_HZ + RANGE).toFixed(1)}</span>
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 1; }
          to   { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '10px' },
  readout: { fontSize: '2.4rem', fontWeight: 'bold', textAlign: 'center' },
  badge: {
    alignSelf: 'center',
    padding: '2px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    letterSpacing: '0.06em',
  },
  track: {
    height: '12px',
    background: '#21262d',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid #30363d',
  },
  fill: { height: '100%', borderRadius: '6px' },
  scale: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#6e7681',
  },
};

export default FrequencyGauge;
