import React, { useRef, useEffect, useState } from 'react';

interface AttentionGuideProps {
  targetRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  animation?: 'pulse' | 'bounce' | 'shake' | 'highlight' | 'none';
  duration?: number; // milliseconds
  delay?: number; // milliseconds before start
  repeat?: number; // -1 for infinite, or number of times
  className?: string;
  onComplete?: () => void;
}

const AttentionGuide: React.FC<AttentionGuideProps> = ({
  targetRef,
  children,
  animation = 'pulse',
  duration = 2000,
  delay = 0,
  repeat = 1,
  className = '',
  onComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  const animationClasses = {
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    shake: 'animate-shake',
    highlight: 'animate-highlight',
    none: ''
  };

  const removeShadowDomAnimations = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }

    @keyframes highlight {
      0% { background-color: transparent; }
      50% { background-color: rgba(255, 215, 0, 0.3); }
      100% { background-color: transparent; }
    }

    .animate-shake { animation: shake 0.5s ease-in-out; }
    .animate-highlight { animation: highlight 1s ease-in-out; }
  `;

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setIsPlaying(true), delay);
      return () => clearTimeout(timer);
    } else {
      setIsPlaying(true);
    }
  }, [delay]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setPlayCount(prev => prev + 1);
      setIsPlaying(false);

      if (repeat === -1 || playCount + 1 < repeat) {
        // Delay before next repetition
        setTimeout(() => setIsPlaying(true), 1000);
      } else {
        onComplete?.();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, playCount, repeat, duration, onComplete]);

  useEffect(() => {
    // Inject custom animations into Shadow DOM if using web components
    const style = document.createElement('style');
    style.textContent = removeShadowDomAnimations;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const shouldAnimate = isPlaying && (repeat === -1 || playCount < repeat);

  return (
    <div
      ref={containerRef}
      className={`
        relative
        ${shouldAnimate ? animationClasses[animation] : ''}
        ${className}
      `}
    >
      {children}

      {/* Optional visual indicator */}
      {shouldAnimate && animation === 'highlight' && (
        <div className="absolute inset-0 pointer-events-none rounded-lg border-2 border-yellow-400 animate-pulse" />
      )}

      {shouldAnimate && animation === 'bounce' && targetRef.current && (
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
      )}
    </div>
  );
};

export default AttentionGuide;
