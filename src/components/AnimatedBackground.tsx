import React from 'react';

/**
 * AnimatedBackground Component
 *
 * Beautiful floating gradient orbs that create depth and visual interest.
 * Inspired by modern UI/UX design patterns with smooth animations.
 *
 * Features:
 * - Three floating gradient orbs (blue, yellow, green)
 * - 20-second smooth infinite animation
 * - Blur effect for soft, dreamy appearance
 * - Fixed positioning to stay behind all content
 * - No performance impact (GPU-accelerated transforms)
 */

const AnimatedBackground: React.FC = () => {
  return (
    <div
      className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      style={{ zIndex: 'var(--z-background)' }}
      aria-hidden="true"
    >
      {/* Blue Orb - Top Left */}
      <div
        className="absolute rounded-full opacity-50 animate-float"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, hsl(var(--gradient-blue)) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '-10%',
          left: '-10%',
          animationDelay: '0s',
        }}
      />

      {/* Yellow Orb - Bottom Right */}
      <div
        className="absolute rounded-full opacity-50 animate-float"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, hsl(var(--gradient-yellow)) 0%, transparent 70%)',
          filter: 'blur(80px)',
          bottom: '-10%',
          right: '-10%',
          animationDelay: '7s',
        }}
      />

      {/* Green Orb - Center */}
      <div
        className="absolute rounded-full opacity-50 animate-float"
        style={{
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, hsl(var(--gradient-green)) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animationDelay: '14s',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
