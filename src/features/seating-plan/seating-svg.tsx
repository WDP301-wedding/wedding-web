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
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { sx } from './seating-classes';

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
      <div className={sx.zoomBar} role="group" aria-label="Thu phóng sơ đồ">
        <button
          type="button"
          className={sx.zoomButton}
          aria-label="Thu nhỏ"
          disabled={view.zoom <= minZoom}
          onClick={zoomOut}
        >
          <Minus aria-hidden="true" />
        </button>
        <span className={sx.zoomValue} aria-live="polite">
          {Math.round(view.zoom * 100)}%
        </span>
        <button
          type="button"
          className={sx.zoomButton}
          aria-label="Phóng to"
          disabled={view.zoom >= maxZoom}
          onClick={zoomIn}
        >
          <Plus aria-hidden="true" />
        </button>
        <button type="button" className={sx.textButton} onClick={resetZoom}>
          Vừa khung
        </button>
        <button type="button" className={sx.fullscreenButton} onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          {isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
        </button>
        <small className={sx.zoomHint}>Kéo để di chuyển · Giữ Ctrl + cuộn chuột để thu phóng</small>
      </div>

      <svg
        ref={svgRef}
        className={view.zoom > 1 ? `${sx.svg} ${sx.svgPannable}` : sx.svg}
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
              className={sx.table}
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
                  strokeWidth={isSelected ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <rect
                  x={-table.width / 2}
                  y={-table.height / 2}
                  width={table.width}
                  height={table.height}
                  fill={colorOf(table)}
                  stroke={isSelected ? '#7A1F3D' : '#6E5D63'}
                  strokeWidth={isSelected ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
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
    return (
      <div className={sx.fullscreen} data-fullscreen>
        {content}
      </div>
    );
  }

  return content;
}
