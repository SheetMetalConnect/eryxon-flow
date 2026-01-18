import React from 'react';
import { useThemeMode } from '@/theme/ThemeProvider';

/**
 * AnimatedBackground Component
 *
 * Beautiful floating gradient orbs with dual color animations that create
 * depth and visual interest. Inspired by modern UI/UX design patterns.
 *
 * Features:
 * - Multiple floating gradient orbs with varying sizes and colors
 * - Two distinct background color animations with shifting gradients
 * - 20-second smooth infinite animation with opacity and position changes
 * - Blur effect for soft, dreamy glassmorphism appearance
 * - Fixed positioning to stay behind all content
 * - GPU-accelerated transforms for optimal performance
 * - Adapts colors/intensity for dark/light modes
 * - Subtle pulsing and morphing effects
 */

const AnimatedBackground: React.FC = () => {
  const { resolvedTheme } = useThemeMode();
  const isDark = resolvedTheme === 'dark';

  // Adjust opacity - visible in both modes
  const primaryOpacity = isDark ? 0.5 : 0.55;
  const secondaryOpacity = isDark ? 0.4 : 0.45;
  const accentOpacity = isDark ? 0.35 : 0.4;

  return (
    <div
      className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* Primary Background Gradient Animation - Shifts between blue and purple tones */}
      <div
        className="absolute inset-0 animate-gradient-shift-primary"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 144, 255, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(6, 182, 212, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(30, 144, 255, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(6, 182, 212, 0.05) 100%)',
        }}
      />

      {/* Secondary Background Gradient Animation - Shifts between warm and cool tones */}
      <div
        className="absolute inset-0 animate-gradient-shift-secondary"
        style={{
          background: isDark
            ? 'linear-gradient(225deg, rgba(251, 188, 5, 0.05) 0%, rgba(234, 67, 53, 0.04) 50%, rgba(52, 168, 83, 0.05) 100%)'
            : 'linear-gradient(225deg, rgba(251, 188, 5, 0.06) 0%, rgba(234, 67, 53, 0.05) 50%, rgba(52, 168, 83, 0.06) 100%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Large Blue Orb - Primary accent, top left floating */}
      <div
        className="gradient-orb orb-1"
        style={{
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, rgba(30, 144, 255, ${primaryOpacity}) 0%, rgba(30, 144, 255, ${primaryOpacity * 0.3}) 40%, transparent 70%)`,
          filter: 'blur(100px)',
          top: '-15%',
          left: '-15%',
        }}
      />

      {/* Purple Orb - Secondary accent, top right with pulse */}
      <div
        className="gradient-orb orb-pulse"
        style={{
          width: '450px',
          height: '450px',
          background: `radial-gradient(circle, rgba(139, 92, 246, ${secondaryOpacity}) 0%, rgba(139, 92, 246, ${secondaryOpacity * 0.25}) 50%, transparent 70%)`,
          filter: 'blur(90px)',
          top: '-5%',
          right: '10%',
          animation: 'orbFloat 16s ease-in-out infinite, orbPulse 2.5s ease-in-out infinite alternate',
        }}
      />

      {/* Warm Yellow Orb - Accent, bottom right area */}
      <div
        className="gradient-orb orb-2"
        style={{
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, rgba(251, 188, 5, ${secondaryOpacity}) 0%, rgba(251, 188, 5, ${secondaryOpacity * 0.2}) 45%, transparent 70%)`,
          filter: 'blur(90px)',
          bottom: '-15%',
          right: '-10%',
        }}
      />

      {/* Cyan Orb - Tech accent, bottom left with glow */}
      <div
        className="gradient-orb orb-glow"
        style={{
          width: '380px',
          height: '380px',
          background: `radial-gradient(circle, rgba(6, 182, 212, ${accentOpacity}) 0%, rgba(6, 182, 212, ${accentOpacity * 0.3}) 40%, transparent 70%)`,
          filter: 'blur(80px)',
          bottom: '10%',
          left: '-8%',
          animation: 'orbFloat 14s ease-in-out infinite reverse, orbGlow 3s ease-in-out infinite alternate',
        }}
      />

      {/* Green Orb - Nature accent, center with smooth drift */}
      <div
        className="gradient-orb orb-3"
        style={{
          width: '400px',
          height: '400px',
          background: `radial-gradient(circle, rgba(52, 168, 83, ${accentOpacity}) 0%, rgba(52, 168, 83, ${accentOpacity * 0.25}) 45%, transparent 70%)`,
          filter: 'blur(85px)',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Small Accent Orbs for depth */}
      <div
        className="gradient-orb"
        style={{
          width: '200px',
          height: '200px',
          background: `radial-gradient(circle, rgba(30, 144, 255, ${primaryOpacity * 0.6}) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          top: '25%',
          right: '25%',
          animation: 'orbFloat 11s ease-in-out infinite 1s',
        }}
      />

      <div
        className="gradient-orb"
        style={{
          width: '180px',
          height: '180px',
          background: `radial-gradient(circle, rgba(139, 92, 246, ${secondaryOpacity * 0.5}) 0%, transparent 70%)`,
          filter: 'blur(50px)',
          bottom: '30%',
          left: '30%',
          animation: 'orbFloat 10s ease-in-out infinite 2s reverse',
        }}
      />

      {/* Subtle noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Inline keyframes for additional animations */}
      <style>{`
        @keyframes orbPulse {
          0% {
            transform: scale(1);
            opacity: 0.75;
          }
          100% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes orbGlow {
          0% {
            filter: blur(80px) brightness(1);
          }
          100% {
            filter: blur(90px) brightness(1.2);
          }
        }

        @keyframes gradient-shift-primary {
          0%, 100% {
            opacity: 1;
            transform: rotate(0deg) scale(1);
          }
          33% {
            opacity: 0.8;
            transform: rotate(5deg) scale(1.04);
          }
          66% {
            opacity: 0.9;
            transform: rotate(-4deg) scale(0.96);
          }
        }

        @keyframes gradient-shift-secondary {
          0%, 100% {
            opacity: 0.75;
            transform: rotate(0deg) scale(1);
          }
          50% {
            opacity: 1;
            transform: rotate(-5deg) scale(1.05);
          }
        }

        .animate-gradient-shift-primary {
          animation: gradient-shift-primary 18s ease-in-out infinite;
        }

        .animate-gradient-shift-secondary {
          animation: gradient-shift-secondary 15s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
