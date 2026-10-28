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
  groupNameOf,
}: Readonly<{
  plan: SeatingPlan;
  selected: string | null;
  onSelectTable: (tableId: string) => void;
  colorOf: (table: SeatingTable) => string;
  groupNameOf?: (table: SeatingTable) => string | undefined;
}>) {
  const {
    view,
    svgRef,
    panned,
    isFullscreen,
    startPan,
    movePan,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom,
    onWheel,
    toggleFullscreen,
  } = useSeatingPan();

  const content = (
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
        <button
          type="button"
          className="button button-secondary"
          style={{ padding: '4px 10px', fontSize: 13 }}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? 'Thu nhỏ cửa sổ' : '⛶ Toàn màn hình'}
        </button>
        <small className={styles.zoomHint}>
          Kéo để di chuyển · Giữ Ctrl + cuộn chuột để thu phóng
        </small>
      </div>

      <svg
        ref={svgRef}
        className={'cw-seating' + (view.zoom > 1 ? ' hy-pannable' : '')}
        viewBox={zoomedViewBox(viewBoxOf(plan.renderSnapshot), view.zoom, view.x, view.y)}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={onWheel}
        role="img"
        aria-label={`Sơ đồ ${plan.renderSnapshot.length} bàn. Chọn một bàn để gắn nhóm.`}
      >
        {plan.renderSnapshot.map((table) => {
          const cx = table.x + table.width / 2;
          const cy = table.y + table.height / 2;
          const isSelected = table.layoutTableId === selected;
          const groupName = groupNameOf?.(table);
          const hasGroup = Boolean(groupName);

          // Tính toán kích thước font chữ phù hợp với mặt bàn
          const minDim = Math.min(table.width, table.height);
          const labelFontSize = Math.max(10, Math.min(18, minDim / (hasGroup ? 4.2 : 3.5)));
          const groupFontSize = Math.max(8, Math.min(12, minDim / 6.2));

          return (
            <g
              key={table.layoutTableId}
              transform={`translate(${cx} ${cy}) rotate(${table.rotationDegrees})`}
              tabIndex={0}
              role="button"
              aria-label={`Bàn ${table.tableLabel}${groupName ? `, Nhóm: ${groupName}` : ''}`}
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
              <title>
                {`Bàn ${table.tableLabel}${
                  groupName ? ` · Nhóm: ${groupName}` : ' · (Chưa gán nhóm)'
                }`}
              </title>

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

              {/* Nhãn số bàn */}
              <text
                transform={`rotate(${-table.rotationDegrees})`}
                textAnchor="middle"
                dominantBaseline="central"
                y={hasGroup ? -labelFontSize * 0.45 : 0}
                fontSize={labelFontSize}
                fontWeight={700}
                fill="#2B1D22"
                stroke="#ffffff"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {table.tableLabel}
              </text>

              {/* Nhãn tên nhóm trên mặt bàn (nếu đã gán nhóm) */}
              {hasGroup ? (
                <text
                  transform={`rotate(${-table.rotationDegrees})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  y={labelFontSize * 0.75}
                  fontSize={groupFontSize}
                  fontWeight={600}
                  fill="#4A353D"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                >
                  {groupName && groupName.length > 12 ? `${groupName.slice(0, 11)}…` : groupName}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </>
  );

  if (isFullscreen) {
    return <div className={styles.fullscreenContainer}>{content}</div>;
  }

  return content;
}
