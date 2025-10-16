
import React, { useEffect, useState } from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  speed?: 'slow' | 'normal' | 'fast';
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  message,
  variant = 'spinner',
  speed = 'normal'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const speedClasses = {
    slow: 'animate-spin-slow',
    normal: 'animate-spin',
    fast: 'animate-spin-fast'
  };

  const renderSpinner = () => (
    <svg
      className={`${sizeClasses[size]} text-indigo-600 ${speedClasses[speed]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-bounce`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-pulse`} />
  );

  const renderBars = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 bg-indigo-600 rounded-full animate-pulse`}
          style={{
            height: size === 'sm' ? '16px' : size === 'md' ? '24px' : size === 'lg' ? '32px' : '48px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s'
          }}
        />
      ))}
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots': return renderDots();
      case 'pulse': return renderPulse();
      case 'bars': return renderBars();
      default: return renderSpinner();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {renderLoader()}
      {message && (
        <p className="text-center text-zinc-600 dark:text-zinc-400 animate-pulse text-sm">
          {message}
        </p>
      )}
    </div>
  );
};

// Progress indicator for multi-step operations
export interface AnalysisStep {
  label: string;
  status: 'waiting' | 'in-progress' | 'completed' | 'error';
}

interface ProgressIndicatorProps {
  steps: AnalysisStep[];
  currentStep: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, currentStep }) => {
  const getStepIcon = (step: AnalysisStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    } else if (step.status === 'error') {
      return (
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    } else if (step.status === 'in-progress') {
      return (
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center justify-center">
          <span className="text-zinc-600 dark:text-zinc-400 font-semibold text-sm">{index + 1}</span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center space-x-4">
          {getStepIcon(step, index)}
          <div className="flex-1">
            <div className={`text-sm font-medium ${
              step.status === 'completed' ? 'text-green-600 dark:text-green-400' :
              step.status === 'error' ? 'text-red-600 dark:text-red-400' :
              step.status === 'in-progress' ? 'text-indigo-600 dark:text-indigo-400' :
              'text-zinc-400 dark:text-zinc-500'
            }`}>
              {step.label}
            </div>
            {step.status === 'in-progress' && (
              <div className="mt-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                <div className="bg-indigo-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Loader;
