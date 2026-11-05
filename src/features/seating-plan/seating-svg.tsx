'use client';

import { useEffect, useMemo, useRef } from 'react';
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

  const dragStateRef = useRef<{
    tableId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startTableX: number;
    startTableY: number;
    currentX: number;
    currentY: number;
    width: number;
    height: number;
    rotationDegrees: number;
    element: SVGGElement;
    hasMoved: boolean;
    rafPending: boolean;
  } | null>(null);

  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const dynamicTables = useMemo(() => {
    return plan.renderSnapshot.map((table) => {
      const pos = positions?.[table.layoutTableId];
      return pos ? { ...table, x: pos.x, y: pos.y } : table;
    });
  }, [plan.renderSnapshot, positions]);

  const handleTablePointerDown = (
    event: React.PointerEvent<SVGGElement>,
    table: SeatingTable,
  ) => {
    if (!onMoveTable || event.button !== 0) return;
    event.stopPropagation();

    // Dọn dẹp session drag trước nếu còn sót
    cleanupDragRef.current?.();

    const gElement = event.currentTarget;
    const pointerId = event.pointerId;

    const currentPos = positions?.[table.layoutTableId];
    const initialX = currentPos ? currentPos.x : table.x;
    const initialY = currentPos ? currentPos.y : table.y;

    dragStateRef.current = {
      tableId: table.layoutTableId,
      pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTableX: initialX,
      startTableY: initialY,
      currentX: initialX,
      currentY: initialY,
      width: table.width,
      height: table.height,
      rotationDegrees: table.rotationDegrees,
      element: gElement,
      hasMoved: false,
      rafPending: false,
    };

    const onWindowPointerMove = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startClientX;
      const dy = e.clientY - state.startClientY;

      // Ngưỡng 4px để phân biệt click chọn bàn với kéo di chuyển
      if (!state.hasMoved) {
        if (Math.hypot(dx, dy) < 4) return;
        state.hasMoved = true;
        state.element.style.cursor = 'grabbing';
        state.element.style.filter = 'drop-shadow(0 10px 24px rgba(122, 31, 61, 0.4))';
        state.element.style.opacity = '0.96';
      }

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const box = svg.viewBox.baseVal;
      const scaleX = (box.width || 1000) / (rect.width || 1);
      const scaleY = (box.height || 1000) / (rect.height || 1);

      let nextX = Math.round(state.startTableX + dx * scaleX);
      let nextY = Math.round(state.startTableY + dy * scaleY);

      // Giữ toạ độ trong phạm vi hợp lệ của sảnh
      nextX = Math.max(0, Math.min(10000, nextX));
      nextY = Math.max(0, Math.min(10000, nextY));

      state.currentX = nextX;
      state.currentY = nextY;

      // Render mượt 60-120fps qua RAF trực tiếp trên DOM, không kích hoạt re-render toàn cây React
      if (!state.rafPending) {
        state.rafPending = true;
        requestAnimationFrame(() => {
          const s = dragStateRef.current;
          if (!s || !s.rafPending) return;
          s.rafPending = false;
          const cx = s.currentX + s.width / 2;
          const cy = s.currentY + s.height / 2;
          s.element.setAttribute('transform', `translate(${cx} ${cy}) rotate(${s.rotationDegrees})`);
        });
      }
    };

    const endSession = (cancelled: boolean) => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
      cleanupDragRef.current = null;

      const state = dragStateRef.current;
      if (!state) return;
      dragStateRef.current = null;

      // Reset inline visual styling
      state.element.style.cursor = '';
      state.element.style.filter = '';
      state.element.style.opacity = '';

      if (cancelled) {
        const cx = state.startTableX + state.width / 2;
        const cy = state.startTableY + state.height / 2;
        state.element.setAttribute('transform', `translate(${cx} ${cy}) rotate(${state.rotationDegrees})`);
        return;
      }

      if (!state.hasMoved) {
        onSelectTable(state.tableId);
      } else {
        if (state.currentX !== state.startTableX || state.currentY !== state.startTableY) {
          onMoveTable?.(state.tableId, state.currentX, state.currentY);
        }
      }
    };

    const onWindowPointerUp = (e: PointerEvent) => {
      if (dragStateRef.current?.pointerId === e.pointerId) {
        endSession(false);
      }
    };

    const onWindowPointerCancel = (e: PointerEvent) => {
      if (dragStateRef.current?.pointerId === e.pointerId) {
        endSession(true);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current) {
        endSession(true);
      }
    };

    cleanupDragRef.current = () => endSession(true);

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerCancel);
    window.addEventListener('keydown', onKeyDown);
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
        aria-label={`Sơ đồ ${plan.renderSnapshot.length} bàn${onMoveTable ? '. Kéo thả để đổi vị trí hoặc chọn bàn để gắn nhóm.' : '.'}`}
      >
        {dynamicTables.map((table) => {
          const cx = table.x + table.width / 2;
          const cy = table.y + table.height / 2;
          const isSelected = table.layoutTableId === selected;
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
              data-table-node="true"
              transform={`translate(${cx} ${cy}) rotate(${table.rotationDegrees})`}
              tabIndex={0}
              role="button"
              aria-label={`${tableName}${groupName ? `, Nhóm: ${groupName}` : ''}`}
              className={sx.table}
              onPointerDown={(event) => handleTablePointerDown(event, table)}
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
