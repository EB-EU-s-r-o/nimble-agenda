import LiquidWindow from "@/components/LiquidWindow";
import { useWindowManager } from "@/lib/useWindowManager";
import "@/styles/liquid-glass.css";

const DEFAULTS: Record<string, { x: number; y: number }> = {
  intro: { x: 60, y: 60 },
  features: { x: 360, y: 120 },
  about: { x: 180, y: 320 },
};

export default function LiquidPlayground() {
  const { positions, bringToFront, updatePosition } =
    useWindowManager(DEFAULTS);

  return (
    <div className="liquid-glass-bg relative overflow-hidden">
      <LiquidWindow
        id="intro"
        title="Introduction"
        width={280}
        {...positions.intro}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
      >
        <p>
          Welcome to <strong>Liquid Glass</strong> — a translucent, draggable
          window system inspired by macOS vibrancy. Each card is blurred,
          layered, and fully interactive.
        </p>
      </LiquidWindow>

      <LiquidWindow
        id="features"
        title="Features"
        width={260}
        {...positions.features}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
      >
        <ul className="list-disc pl-4 space-y-1">
          <li>Pointer-event drag &amp; drop</li>
          <li>Z-index management</li>
          <li>localStorage persistence</li>
          <li>Viewport clamping</li>
          <li>Animated specular highlight</li>
        </ul>
      </LiquidWindow>

      <LiquidWindow
        id="about"
        title="About"
        width={300}
        {...positions.about}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
      >
        <p>
          Built with React + TypeScript. No heavy UI libraries — pure Pointer
          Events, CSS backdrop-filter, and a radial-gradient specular overlay
          that follows your cursor.
        </p>
      </LiquidWindow>

      <span className="liquid-attr">Liquid Glass UI</span>
    </div>
  );
}
