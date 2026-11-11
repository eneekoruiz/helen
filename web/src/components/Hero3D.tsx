'use client';

import React from 'react';

export default function Hero3D() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black">
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

      {/* Animated glassmorphic blob 1 */}
      <div className="absolute top-[20%] left-[25%] w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-gradient-to-tr from-cyan-400/10 via-pink-400/5 to-indigo-400/15 blur-[100px] md:blur-[150px] rounded-full animate-float-1" />
      
      {/* Animated glassmorphic blob 2 */}
      <div className="absolute bottom-[20%] right-[25%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-gradient-to-tr from-emerald-400/10 via-sky-300/5 to-violet-400/10 blur-[90px] md:blur-[130px] rounded-full animate-float-2" />
    </div>
  );
}
