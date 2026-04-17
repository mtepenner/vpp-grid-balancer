import React, { useMemo } from 'react';

interface Props {
  totalBatteries: number;
  dispatchedCount: number;
}

const GRID_COLS = 40;

const AggregatePowerMap: React.FC<Props> = ({ totalBatteries, dispatchedCount }) => {
  const cells = useMemo(() => {
    const total = Math.min(totalBatteries, GRID_COLS * 30);
    return Array.from({ length: total }, (_, i) => ({
      id: i,
      dispatched: i < dispatchedCount,
    }));
  }, [totalBatteries, dispatchedCount]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.dot, background: '#f85149' }} /> Dispatched ({dispatchedCount.toLocaleString()})
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.dot, background: '#3fb950' }} /> Available ({(totalBatteries - dispatchedCount).toLocaleString()})
        </span>
      </div>

      <div style={{
        ...styles.grid,
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
      }}>
        {cells.map(c => (
          <div
            key={c.id}
            title={c.dispatched ? 'Dispatched' : 'Available'}
            style={{
              ...styles.cell,
              background: c.dispatched ? '#f85149' : '#238636',
              opacity: c.dispatched ? 1 : 0.55,
            }}
          />
        ))}
      </div>

      <div style={styles.summary}>
        {totalBatteries.toLocaleString()} total batteries
        {totalBatteries > 0 && ` — ${((dispatchedCount / totalBatteries) * 100).toFixed(1)}% active`}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '10px' },
  legend: { display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#8b949e' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%' },
  grid: {
    display: 'grid',
    gap: '2px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  cell: {
    width: '100%',
    paddingTop: '100%', // square aspect ratio
    borderRadius: '1px',
    transition: 'background 0.5s ease',
  },
  summary: { fontSize: '0.78rem', color: '#6e7681', textAlign: 'center' },
};

export default AggregatePowerMap;
