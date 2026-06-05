'use client';

import React, { useState, useEffect, Component, type ReactNode } from 'react';
import Spline from '@splinetool/react-spline';

// Error Boundary to catch async load/parse errors from Spline runtime
class SplineErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('[Hero3D] Spline runtime crashed, falling back to CSS background:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function Hero3D() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // If it takes too long to load, we keep the fallback visible
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.warn('[Hero3D] Spline took too long to load, keeping fallback active.');
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* Self-contained organic floating styles */}
      <style jsx global>{`
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-40%, -60%) scale(1.15); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(50%, 50%) scale(1); }
          50% { transform: translate(60%, 40%) scale(1.1); }
        }
        .animate-float-1 {
          animation: float-orb-1 25s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-orb-2 30s ease-in-out infinite;
        }
      `}</style>

      {/* CSS Animated Fallback / Base background blur */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isLoaded && !hasError ? 'opacity-25' : 'opacity-85'
        }`}
      >
        {/* Animated glassmorphic blob 1 */}
        <div className="absolute top-[20%] left-[25%] w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-gradient-to-tr from-cyan-400/20 via-pink-400/10 to-indigo-400/25 blur-[100px] md:blur-[150px] rounded-full animate-float-1" />
        
        {/* Animated glassmorphic blob 2 */}
        <div className="absolute bottom-[20%] right-[25%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-gradient-to-tr from-emerald-400/15 via-sky-300/10 to-violet-400/20 blur-[90px] md:blur-[130px] rounded-full animate-float-2" />
      </div>

      {/* Spline 3D Scene */}
      {!hasError && (
        <div 
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
            isLoaded ? 'opacity-40' : 'opacity-0'
          }`}
        >
          <SplineErrorBoundary fallback={null}>
            <Spline
              scene="https://prod.spline.design/kZqj5O5vOspGLCxi/scene.splinecode"
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                console.warn('[Hero3D] Failed to load Spline scene, using CSS fallback.');
                setHasError(true);
              }}
            />
          </SplineErrorBoundary>
        </div>
      )}
    </div>
  );
}
