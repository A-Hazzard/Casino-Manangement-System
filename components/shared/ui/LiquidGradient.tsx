/**
 * Liquid Gradient Component
 * Animated liquid gradient background using canvas and blob physics.
 *
 * Features:
 * - Animated blob physics
 * - Color-based attraction/repulsion
 * - Canvas-based rendering
 * - Post-processing blur
 * - Responsive canvas sizing
 * - Fixed background positioning
 */
import { useRef, useEffect } from 'react';
import type { Blob, RGBAColor } from '@/lib/types/components';

// ============================================================================
// Constants & Helper Functions
// ============================================================================

const BlobConfig = {
  transparency: 0.04, // just a whisper of color
  colors: [
    '#0AB40B',
    '#5119E9',
    '#A8A8A8',
    '#ECF0F9',
    '#707070',
    '#FFA203',
    '#F6B37F',
    '#5A69E7',
    '#4EA7FF',
    '#94F394',
    '#96E3D4',
    '#F9687D',
  ],
};

const G = 10000;
const MAX_FORCE = 0.25;
const DAMPING = 0.985;
const EDGE_REPULSION = 1.05;
const SAME_COLOR_ATTRACTION = 0.1;
const DIFFERENT_COLOR_REPULSION = 0.3;

function hexToRgba(hex: string, alpha: number): RGBAColor {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b, a: alpha };
}

const colorPool: RGBAColor[] = BlobConfig.colors.map(hex =>
  hexToRgba(hex, BlobConfig.transparency)
);

export default function LiquidGradient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const blobs: Blob[] = Array.from({ length: 14 }, (_, i) => {
      const color = colorPool[i % colorPool.length];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() * 2 - 1) * 0.2,
        vy: (Math.random() * 2 - 1) * 0.2,
        radius: Math.max(canvas.width, canvas.height) * 0.55,
        color,
      };
    });

    const applyPostBlur = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(canvas, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = 'blur(40px) saturate(140%)';
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.filter = 'none';
    };

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      blobs.forEach((b1, i) => {
        let ax = 0;
        let ay = 0;

        blobs.forEach((b2, j) => {
          if (i === j) return;
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist > 0) {
            const sameColor =
              b1.color.r === b2.color.r &&
              b1.color.g === b2.color.g &&
              b1.color.b === b2.color.b;
            const forceDir = sameColor ? 1 : -1;
            const forceMag =
              Math.min(G / distSq, MAX_FORCE) *
              forceDir *
              (sameColor ? SAME_COLOR_ATTRACTION : DIFFERENT_COLOR_REPULSION);
            ax += (dx / dist) * forceMag;
            ay += (dy / dist) * forceMag;
          }
        });

        b1.vx = (b1.vx + ax) * DAMPING;
        b1.vy = (b1.vy + ay) * DAMPING;
        b1.x += b1.vx;
        b1.y += b1.vy;

        if (b1.x < 0 || b1.x > canvas.width) b1.vx *= -EDGE_REPULSION;
        if (b1.y < 0 || b1.y > canvas.height) b1.vy *= -EDGE_REPULSION;
      });

      blobs.forEach(blob => {
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          blob.radius * 0.1,
          blob.x,
          blob.y,
          blob.radius
        );
        gradient.addColorStop(
          0,
          `rgba(${blob.color.r},${blob.color.g},${blob.color.b},${blob.color.a})`
        );
        gradient.addColorStop(
          1,
          `rgba(${blob.color.r},${blob.color.g},${blob.color.b},0)`
        );

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      applyPostBlur();
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        backgroundColor: 'hsl(var(--background))',
      }}
    />
  );
}

