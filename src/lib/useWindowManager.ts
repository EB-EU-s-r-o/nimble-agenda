import { useState, useCallback, useRef, useEffect } from "react";

export interface WindowPosition {
  x: number;
  y: number;
  z: number;
  w?: number;
  h?: number;
}

const STORAGE_KEY = "liquid-window-positions";

function loadPositions(): Record<string, WindowPosition> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, WindowPosition>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (e) {
    // Silently fail as this is a non-critical side effect
  }
}

export function useWindowManager(
  defaults: Record<string, { x: number; y: number }>
) {
  const topZ = useRef(10);
  const [positions, setPositions] = useState<Record<string, WindowPosition>>(
    () => {
      const saved = loadPositions();
      const merged: Record<string, WindowPosition> = {};
      for (const id of Object.keys(defaults)) {
        if (saved[id]) {
          merged[id] = saved[id];
          if (saved[id].z > topZ.current) topZ.current = saved[id].z;
        } else {
          merged[id] = { x: defaults[id].x, y: defaults[id].y, z: ++topZ.current };
        }
      }
      return merged;
    }
  );

  const bringToFront = useCallback((id: string) => {
    setPositions((prev) => {
      const next = { ...prev };
      next[id] = { ...next[id], z: ++topZ.current };
      return next;
    });
  }, []);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { ...prev[id], x, y } };
      savePositions(next);
      return next;
    });
  }, []);

  const updateSize = useCallback((id: string, w: number, h: number) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { ...prev[id], w, h } };
      savePositions(next);
      return next;
    });
  }, []);

  /** Get sibling rects for snap-to-edge (excludes the given id) */
  const getSiblingRects = useCallback(
    (excludeId: string, defaultSizes: Record<string, { w: number; h: number }>) =>
      Object.entries(positions)
        .filter(([id]) => id !== excludeId)
        .map(([id, p]) => ({
          x: p.x,
          y: p.y,
          w: p.w ?? defaultSizes[id]?.w ?? 260,
          h: p.h ?? defaultSizes[id]?.h ?? 200,
        })),
    [positions]
  );

  // Clamp to viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPositions((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          const clamped = {
            ...next[id],
            x: Math.min(next[id].x, window.innerWidth - 80),
            y: Math.max(0, Math.min(next[id].y, window.innerHeight - 40)),
          };
          if (clamped.x !== next[id].x || clamped.y !== next[id].y) {
            next[id] = clamped;
            changed = true;
          }
        }
        if (changed) savePositions(next);
        return changed ? next : prev;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { positions, bringToFront, updatePosition, updateSize, getSiblingRects };
}
