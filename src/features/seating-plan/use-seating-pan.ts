'use client';

import { useCallback, useRef, useState } from 'react';
import { maxZoom, minZoom } from './seating-api';

export function useSeatingPan() {
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panned = useRef(false);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(
    null,
  );

  /**
   * Kéo để di chuyển: chỉ coi là "kéo" khi chuột/ngón tay đi quá 4px, để một cú bấm bình thường
   * vào bàn vẫn chọn được bàn. Đổi pixel sang đơn vị sơ đồ bằng tỉ lệ viewBox / kích thước thật.
   */
  const startPan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (view.zoom <= 1) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: view.x, panY: view.y, moved: false };
  };

  const movePan = (event: React.PointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    const svg = svgRef.current;
    if (!start || !svg) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    start.moved = true;
    const box = svg.viewBox.baseVal;
    const scale = box.width / svg.getBoundingClientRect().width || 1;
    setView((v) => ({ ...v, x: start.panX - dx * scale, y: start.panY - dy * scale }));
  };

  const endPan = () => {
    // Nhớ lại vừa kéo hay chưa để cú "click" sinh ra khi thả chuột không chọn nhầm bàn.
    panned.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  const zoomIn = useCallback(
    () => setView((v) => ({ ...v, zoom: Math.min(maxZoom, Number((v.zoom * 1.25).toFixed(2))) })),
    [],
  );
  const zoomOut = useCallback(
    () => setView((v) => ({ ...v, zoom: Math.max(minZoom, Number((v.zoom / 1.25).toFixed(2))) })),
    [],
  );
  const resetZoom = useCallback(() => setView({ zoom: 1, x: 0, y: 0 }), []);

  /** Hỗ trợ cuộn chuột (Mouse Wheel Zoom) khi rê trên sơ đồ. */
  const onWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    // Nếu giữ Ctrl hoặc đang ở chế độ zoom/fullscreen, ưu tiên thu phóng sơ đồ
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        setView((v) => ({ ...v, zoom: Math.min(maxZoom, Number((v.zoom * 1.15).toFixed(2))) }));
      } else {
        setView((v) => ({ ...v, zoom: Math.max(minZoom, Number((v.zoom / 1.15).toFixed(2))) }));
      }
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return {
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
  };
}
