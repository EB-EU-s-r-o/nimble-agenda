import React, { useRef, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import "@/styles/liquid-glass.css";

const SNAP_THRESHOLD = 16; // px – magnetic pull distance

interface Rect { x: number; y: number; w: number; h: number }

/** Snap a position to viewport edges and sibling window edges */
function snapToEdges(
  cx: number,
  cy: number,
  w: number,
  h: number,
  siblings: Rect[],
): { x: number; y: number; guides: { axis: "x" | "y"; pos: number }[] } {
  let sx = cx;
  let sy = cy;
  const guides: { axis: "x" | "y"; pos: number }[] = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Viewport edge snap
  if (Math.abs(cx) < SNAP_THRESHOLD) { sx = 0; guides.push({ axis: "x", pos: 0 }); }
  if (Math.abs(cy) < SNAP_THRESHOLD) { sy = 0; guides.push({ axis: "y", pos: 0 }); }
  if (Math.abs(cx + w - vw) < SNAP_THRESHOLD) { sx = vw - w; guides.push({ axis: "x", pos: vw }); }
  if (Math.abs(cy + h - vh) < SNAP_THRESHOLD) { sy = vh - h; guides.push({ axis: "y", pos: vh }); }

  // Sibling edge snap
  for (const s of siblings) {
    // left edge → sibling right edge
    if (Math.abs(cx - (s.x + s.w)) < SNAP_THRESHOLD) { sx = s.x + s.w; guides.push({ axis: "x", pos: s.x + s.w }); }
    // right edge → sibling left edge
    if (Math.abs(cx + w - s.x) < SNAP_THRESHOLD) { sx = s.x - w; guides.push({ axis: "x", pos: s.x }); }
    // top edge → sibling bottom edge
    if (Math.abs(cy - (s.y + s.h)) < SNAP_THRESHOLD) { sy = s.y + s.h; guides.push({ axis: "y", pos: s.y + s.h }); }
    // bottom edge → sibling top edge
    if (Math.abs(cy + h - s.y) < SNAP_THRESHOLD) { sy = s.y - h; guides.push({ axis: "y", pos: s.y }); }
  }

  return { x: sx, y: sy, guides };
}

interface LiquidWindowProps {
  id: string;
  title: string;
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResizeEnd?: (id: string, w: number, h: number) => void;
  /** Sibling rects for cross-window snap */
  siblings?: Rect[];
}

export default function LiquidWindow({
  id,
  title,
  x,
  y,
  z,
  width = 260,
  height,
  minWidth = 180,
  minHeight = 100,
  children,
  onDragStart,
  onDragEnd,
  onResizeEnd,
  siblings = [],
}: LiquidWindowProps) {
  const isMobile = useIsMobile();
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [pos, setPos] = useState({ x, y });
  const [size, setSize] = useState({ w: width, h: height });
  const origin = useRef({ px: 0, py: 0, ox: 0, oy: 0, ow: 0, oh: 0 });
  const specRef = useRef<HTMLDivElement>(null);

  // Sync prop → state when idle
  const lastPropPos = useRef({ x, y });
  if (!dragging && (lastPropPos.current.x !== x || lastPropPos.current.y !== y)) {
    lastPropPos.current = { x, y };
    setPos({ x, y });
  }

  const snapAndClamp = useCallback(
    (cx: number, cy: number) => {
      const clamped = {
        x: Math.max(-size.w + 80, Math.min(cx, window.innerWidth - 80)),
        y: Math.max(0, Math.min(cy, window.innerHeight - 40)),
      };
      const snapped = snapToEdges(clamped.x, clamped.y, size.w, size.h ?? 200, siblings);
      return { x: snapped.x, y: snapped.y };
    },
    [size.w, size.h, siblings]
  );

  // ── Drag handlers ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      origin.current = { ...origin.current, px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
      setDragging(true);
      onDragStart(id);
    },
    [id, pos, onDragStart]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - origin.current.px;
      const dy = e.clientY - origin.current.py;
      setPos(snapAndClamp(origin.current.ox + dx, origin.current.oy + dy));
    },
    [dragging, snapAndClamp]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onDragEnd(id, pos.x, pos.y);
  }, [dragging, id, pos, onDragEnd]);

  // ── Resize handlers ──
  const onResizeDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      origin.current = { ...origin.current, px: e.clientX, py: e.clientY, ow: size.w, oh: size.h ?? 0 };
      setResizing(true);
      onDragStart(id);
    },
    [id, size, onDragStart]
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizing) return;
      const dw = e.clientX - origin.current.px;
      const dh = e.clientY - origin.current.py;
      setSize({
        w: Math.max(minWidth, origin.current.ow + dw),
        h: origin.current.oh ? Math.max(minHeight, origin.current.oh + dh) : undefined,
      });
    },
    [resizing, minWidth, minHeight]
  );

  const onResizeUp = useCallback(() => {
    if (!resizing) return;
    setResizing(false);
    onResizeEnd?.(id, size.w, size.h ?? 0);
  }, [resizing, id, size, onResizeEnd]);

  // Specular highlight
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!specRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * 100;
    const ry = ((e.clientY - rect.top) / rect.height) * 100;
    specRef.current.style.background = `radial-gradient(320px circle at ${rx}% ${ry}%, rgba(255,255,255,0.18) 0%, transparent 70%)`;
  }, []);

  const active = dragging || resizing;

  return (
    <div
      className={`liquid-window${active ? " liquid-window--dragging" : ""}`}
      style={isMobile ? undefined : { left: pos.x, top: pos.y, width: size.w, height: size.h ?? "auto", zIndex: z }}
      onMouseMove={onMouseMove}
    >
      <div ref={specRef} className="liquid-window__specular" />
      <div
        className="liquid-window__title"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {title}
      </div>
      <div className="liquid-window__content" style={{ overflow: size.h ? "auto" : undefined }}>{children}</div>
      <div
        className="liquid-window__resize"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
      />
    </div>
  );
}
