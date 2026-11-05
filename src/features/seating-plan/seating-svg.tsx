'use client';

import { useMemo, useRef, useState } from 'react';
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
  positions,
  onMoveTable,
}: Readonly<{
  plan: SeatingPlan;
  selected: string | null;
  onSelectTable: (tableId: string) => void;
  colorOf: (table: SeatingTable) => string;
  groupNameOf?: (table: SeatingTable) => string | undefined;
  positions?: Record<string, { x: number; y: number }>;
  onMoveTable?: (tableId: string, x: number, y: number) => void;
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

  const dragRef = useRef<{
    tableId: string;
    startClientX: number;
    startClientY: number;
    startTableX: number;
    startTableY: number;
    moved: boolean;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const dynamicTables = useMemo(() => {
    return plan.renderSnapshot.map((table) => {
      const pos = positions?.[table.layoutTableId];
      return pos ? { ...table, x: pos.x, y: pos.y } : table;
    });
  }, [plan.renderSnapshot, positions]);

  const sortedTables = useMemo(() => {
    if (!draggingId) return dynamicTables;
    const regular = dynamicTables.filter((t) => t.layoutTableId !== draggingId);
    const dragging = dynamicTables.find((t) => t.layoutTableId === draggingId);
    return dragging ? [...regular, dragging] : dynamicTables;
  }, [dynamicTables, draggingId]);

  const handleTablePointerDown = (
    event: React.PointerEvent,
    tableId: string,
    currentX: number,
    currentY: number,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    dragRef.current = {
      tableId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTableX: currentX,
      startTableY: currentY,
      moved: false,
    };
  };

  const handleTablePointerMove = (event: React.PointerEvent, tableId: string) => {
    const start = dragRef.current;
    if (!start || start.tableId !== tableId) return;
    const dx = event.clientX - start.startClientX;
    const dy = event.clientY - start.startClientY;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    if (!start.moved) {
      start.moved = true;
      setDraggingId(tableId);
    }
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const box = svg.viewBox.baseVal;
    const scaleX = (box.width || 1000) / (rect.width || 1);
    const scaleY = (box.height || 1000) / (rect.height || 1);

    const nextX = Math.round(start.startTableX + dx * scaleX);
    const nextY = Math.round(start.startTableY + dy * scaleY);

    onMoveTable?.(tableId, nextX, nextY);
  };

  const handleTablePointerUp = (event: React.PointerEvent, tableId: string) => {
    const start = dragRef.current;
    if (!start || start.tableId !== tableId) return;
    try {
      (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    const moved = start.moved;
    dragRef.current = null;
    setDraggingId(null);

    if (!moved) {
      onSelectTable(tableId);
    }
  };

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
        <small className={sx.zoomHint}>
          Kéo bàn để đổi vị trí · Kéo nền để di chuyển · Ctrl + cuộn chuột để thu phóng
        </small>
      </div>

      <svg
        ref={svgRef}
        data-wide
        className={view.zoom > 1 ? `${sx.svg} ${sx.svgPannable}` : sx.svg}
        viewBox={zoomedViewBox(viewBoxOf(dynamicTables), view.zoom, view.x, view.y)}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={onWheel}
        role="group"
        aria-label={`Sơ đồ ${plan.renderSnapshot.length} bàn. Kéo thả để đổi vị trí hoặc chọn bàn để gắn nhóm.`}
      >
        {sortedTables.map((table) => {
          const cx = table.x + table.width / 2;
          const cy = table.y + table.height / 2;
          const isSelected = table.layoutTableId === selected;
          const isDragging = table.layoutTableId === draggingId;
          const groupName = groupNameOf?.(table);
          // Nhãn mẫu có thể đã gồm chữ "Bàn" (Bàn 01) hoặc chỉ là mã (G1).
          const tableName = /^bàn\s/iu.test(table.tableLabel)
            ? table.tableLabel
            : `Bàn ${table.tableLabel}`;
          const hasGroup = Boolean(groupName);

          // Cỡ chữ theo mặt bàn; mẫu vẽ bằng đơn vị lớn (vd. bàn 1000) thì nới giới hạn theo tỉ lệ k.
          const minDim = Math.min(table.width, table.height);
          const k = Math.max(1, minDim / 100);
          const labelFontSize = Math.max(10 * k, Math.min(18 * k, minDim / (hasGroup ? 4.2 : 3.5)));
          const groupFontSize = Math.max(8 * k, Math.min(12 * k, minDim / 6.2));

          return (
            <g
              key={table.layoutTableId}
              transform={`translate(${cx} ${cy}) rotate(${table.rotationDegrees})`}
              tabIndex={0}
              role="button"
              aria-label={`${tableName}${groupName ? `, Nhóm: ${groupName}` : ''}`}
              className={sx.table}
              onPointerDown={(event) =>
                handleTablePointerDown(event, table.layoutTableId, table.x, table.y)
              }
              onPointerMove={(event) => handleTablePointerMove(event, table.layoutTableId)}
              onPointerUp={(event) => handleTablePointerUp(event, table.layoutTableId)}
              onPointerCancel={(event) => handleTablePointerUp(event, table.layoutTableId)}
              style={
                isDragging
                  ? {
                      filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.35))',
                      cursor: 'grabbing',
                    }
                  : undefined
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectTable(table.layoutTableId);
                }
              }}
            >
              <title>
                {`${tableName}${groupName ? ` · Nhóm: ${groupName}` : ' · (Chưa gán nhóm)'}`}
              </title>

              {table.shape === 'ROUND' ? (
                <ellipse
                  rx={table.width / 2}
                  ry={table.height / 2}
                  fill={colorOf(table)}
                  stroke={isSelected || isDragging ? '#7A1F3D' : '#6E5D63'}
                  strokeWidth={isSelected || isDragging ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <rect
                  x={-table.width / 2}
                  y={-table.height / 2}
                  width={table.width}
                  height={table.height}
                  fill={colorOf(table)}
                  stroke={isSelected || isDragging ? '#7A1F3D' : '#6E5D63'}
                  strokeWidth={isSelected || isDragging ? 4 : 2}
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
                strokeWidth={3 * k}
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
                  strokeWidth={2.5 * k}
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
