import React, { useEffect, useRef } from 'react';

export interface DispatchEvent {
  id: string;
  timestamp: string;
  message: string;
  isTrip: boolean;
}

interface Props {
  events: DispatchEvent[];
}

const DispatchTerminal: React.FC<Props> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div style={styles.terminal}>
      {events.length === 0 && (
        <div style={styles.placeholder}>Waiting for dispatch events…</div>
      )}
      {events.map(ev => (
        <div key={ev.id} style={styles.line}>
          <span style={styles.ts}>{ev.timestamp}</span>
          {' '}
          <span style={{ color: ev.isTrip ? '#f85149' : '#3fb950' }}>
            {ev.isTrip ? '[TRIP]' : '[INFO]'}
          </span>
          {' '}
          <span style={styles.msg}>{ev.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  terminal: {
    background: '#010409',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 12px',
    height: '320px',
    overflowY: 'auto',
    fontFamily: "'Courier New', monospace",
    fontSize: '0.78rem',
    lineHeight: '1.6',
  },
  placeholder: { color: '#6e7681', fontStyle: 'italic' },
  line: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  ts: { color: '#6e7681' },
  msg: { color: '#c9d1d9' },
};

export default DispatchTerminal;
