import React from 'react';
import FrequencyGauge from './components/FrequencyGauge';
import AggregatePowerMap from './components/AggregatePowerMap';
import DispatchTerminal from './components/DispatchTerminal';
import { useGridMetrics } from './hooks/useGridMetrics';

const App: React.FC = () => {
  const { metrics, events } = useGridMetrics();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>⚡ VPP Grid Balancer — Command Center</h1>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Grid Frequency</h2>
          <FrequencyGauge frequency={metrics.frequency} />
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Battery Participation</h2>
          <AggregatePowerMap
            totalBatteries={metrics.totalBatteries}
            dispatchedCount={metrics.dispatchedCount}
          />
        </section>

        <section style={{ ...styles.card, flex: 2 }}>
          <h2 style={styles.cardTitle}>Dispatch Log</h2>
          <DispatchTerminal events={events} />
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Courier New', monospace",
    background: '#0d1117',
    color: '#c9d1d9',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: '#161b22',
    padding: '12px 24px',
    borderBottom: '1px solid #30363d',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#58a6ff',
  },
  main: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '16px',
    flex: 1,
  },
  card: {
    flex: 1,
    minWidth: '280px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '16px',
  },
  cardTitle: {
    margin: '0 0 12px',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8b949e',
  },
};

export default App;
