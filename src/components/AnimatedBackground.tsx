import React from 'react';

/**
 * AnimatedBackground Component
 *
 * Beautiful floating gradient orbs that create depth and visual interest.
 * Inspired by modern UI/UX design patterns (VSCode, Linear, Vercel).
 *
 * Features:
 * - Three floating gradient orbs (blue, yellow, green)
 * - 20-second smooth infinite animation with opacity changes
 * - Blur effect for soft, dreamy appearance
 * - Fixed positioning to stay behind all content
 * - GPU-accelerated transforms for optimal performance
 */

const AnimatedBackground: React.FC = () => {
  return (
    <div
      className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* Blue Orb - Top Left */}
      <div
        className="gradient-orb orb-1"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(30, 144, 255, 0.4) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '-10%',
          left: '-10%',
        }}
      />

      {/* Yellow Orb - Bottom Right */}
      <div
        className="gradient-orb orb-2"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(251, 188, 5, 0.3) 0%, transparent 70%)',
          filter: 'blur(80px)',
          bottom: '-10%',
          right: '-10%',
        }}
      />

      {/* Green Orb - Center */}
      <div
        className="gradient-orb orb-3"
        style={{
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(52, 168, 83, 0.3) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
