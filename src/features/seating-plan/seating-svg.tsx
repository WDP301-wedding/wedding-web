'use client';

import {
  maxZoom,
  minZoom,
  viewBoxOf,
  zoomedViewBox,
  type SeatingPlan,
  type SeatingTable,
} from './seating-api';
import { useSeatingPan } from './use-seating-pan';
import styles from './seating.module.css';

export function SeatingSvg({
  plan,
  selected,
  onSelectTable,
  colorOf,
}: Readonly<{
  plan: SeatingPlan;
  selected: string | null;
  onSelectTable: (tableId: string) => void;
  colorOf: (table: SeatingTable) => string;
}>) {
  const { view, svgRef, panned, startPan, movePan, endPan, zoomIn, zoomOut, resetZoom } =
    useSeatingPan();

  return (
    <>
      <div
        className={`hy-zoom-bar ${styles.zoomToolbar}`}
        role="group"
        aria-label="Thu phóng sơ đồ"
      >
        <button
          type="button"
          className="button button-secondary"
          aria-label="Thu nhỏ"
          disabled={view.zoom <= minZoom}
          onClick={zoomOut}
        >
          −
        </button>
        <span className={styles.zoomValue} aria-live="polite">
          {Math.round(view.zoom * 100)}%
        </span>
        <button
          type="button"
          className="button button-secondary"
          aria-label="Phóng to"
          disabled={view.zoom >= maxZoom}
          onClick={zoomIn}
        >
          +
        </button>
        <button type="button" className="cw-text-button" onClick={resetZoom}>
          Vừa khung
        </button>
        <small>Kéo để di chuyển khi đã phóng to.</small>
      </div>

      <svg
        ref={svgRef}
        className={'cw-seating' + (view.zoom > 1 ? ' hy-pannable' : '')}
        viewBox={zoomedViewBox(viewBoxOf(plan.renderSnapshot), view.zoom, view.x, view.y)}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        role="img"
        aria-label={`Sơ đồ ${plan.renderSnapshot.length} bàn. Chọn một bàn để gắn nhóm.`}
      >
        {plan.renderSnapshot.map((table) => {
          const cx = table.x + table.width / 2;
          const cy = table.y + table.height / 2;
          const isSelected = table.layoutTableId === selected;
          return (
            <g
              key={table.layoutTableId}
              transform={`translate(${cx} ${cy}) rotate(${table.rotationDegrees})`}
              tabIndex={0}
              role="button"
              aria-label={`Bàn ${table.tableLabel}`}
              className={styles.tableInteractive}
              onClick={() => {
                if (panned.current) {
                  panned.current = false;
                  return;
                }
                onSelectTable(table.layoutTableId);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectTable(table.layoutTableId);
                }
              }}
            >
              {table.shape === 'ROUND' ? (
                <ellipse
                  rx={table.width / 2}
                  ry={table.height / 2}
                  fill={colorOf(table)}
                  stroke={isSelected ? '#7A1F3D' : '#6E5D63'}
                  strokeWidth={isSelected ? 4 : 1.5}
                />
              ) : (
                <rect
                  x={-table.width / 2}
                  y={-table.height / 2}
                  width={table.width}
                  height={table.height}
                  fill={colorOf(table)}
                  stroke={isSelected ? '#7A1F3D' : '#6E5D63'}
                  strokeWidth={isSelected ? 4 : 1.5}
                />
              )}
              <text
                transform={`rotate(${-table.rotationDegrees})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(10, Math.min(table.width, table.height) / 5)}
                fill="#2B1D22"
                stroke="#ffffff"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {table.tableLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </>
  );
}
