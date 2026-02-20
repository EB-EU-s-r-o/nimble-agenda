import React, { useRef, useState, useCallback } from "react";
import "@/styles/liquid-glass.css";

interface LiquidWindowProps {
  id: string;
  title: string;
  x: number;
  y: number;
  z: number;
  width?: number;
  children: React.ReactNode;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export default function LiquidWindow({
  id,
  title,
  x,
  y,
  z,
  width = 260,
  children,
  onDragStart,
  onDragEnd,
}: LiquidWindowProps) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x, y });
  const origin = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const specRef = useRef<HTMLDivElement>(null);

  // Sync prop → state when not dragging
  const lastPropPos = useRef({ x, y });
  if (!dragging && (lastPropPos.current.x !== x || lastPropPos.current.y !== y)) {
    lastPropPos.current = { x, y };
    setPos({ x, y });
  }

  const clamp = useCallback(
    (cx: number, cy: number) => ({
      x: Math.max(-width + 80, Math.min(cx, window.innerWidth - 80)),
      y: Math.max(0, Math.min(cy, window.innerHeight - 40)),
    }),
    [width]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      origin.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
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
      setPos(clamp(origin.current.ox + dx, origin.current.oy + dy));
    },
    [dragging, clamp]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onDragEnd(id, pos.x, pos.y);
  }, [dragging, id, pos, onDragEnd]);

  // Specular highlight follows mouse
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!specRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * 100;
    const ry = ((e.clientY - rect.top) / rect.height) * 100;
    specRef.current.style.background = `radial-gradient(320px circle at ${rx}% ${ry}%, rgba(255,255,255,0.18) 0%, transparent 70%)`;
  }, []);

  return (
    <div
      className={`liquid-window${dragging ? " liquid-window--dragging" : ""}`}
      style={{ left: pos.x, top: pos.y, width, zIndex: z }}
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
      <div className="liquid-window__content">{children}</div>
    </div>
  );
}
