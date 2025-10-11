import { animations } from './themeUtils';

// Animation utility functions
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

export const bounceIn = {
  initial: { opacity: 0, scale: 0.3 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    duration: 0.6,
    ease: [0.68, -0.55, 0.265, 1.55]
  }
};

// Stagger animation for lists
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

// Hover animations
export const hoverScale = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.2 }
};

export const hoverLift = {
  whileHover: { y: -2, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
  transition: { duration: 0.2 }
};

// Loading animations
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const shimmer = {
  animate: {
    backgroundPosition: ['-200% 0', '200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Page transition animations
export const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: 'easeInOut' }
};

// Utility function to create custom animations
export const createAnimation = (
  from: Record<string, any>,
  to: Record<string, any>,
  options: {
    duration?: number;
    delay?: number;
    ease?: string;
    repeat?: number;
  } = {}
) => ({
  initial: from,
  animate: to,
  transition: {
    duration: options.duration || 0.3,
    delay: options.delay || 0,
    ease: options.ease || 'easeOut',
    repeat: options.repeat || 0
  }
});

// Scroll-triggered animations
export const scrollAnimations = {
  fadeInOnScroll: {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-100px' },
    transition: { duration: 0.6, ease: 'easeOut' }
  },

  slideInFromLeft: {
    initial: { opacity: 0, x: -100 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: '-100px' },
    transition: { duration: 0.8, ease: 'easeOut' }
  },

  slideInFromRight: {
    initial: { opacity: 0, x: 100 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: '-100px' },
    transition: { duration: 0.8, ease: 'easeOut' }
  }
};

// Button animations
export const buttonAnimations = {
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  },

  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },

  loading: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Card animations
export const cardAnimations = {
  hover: {
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: { duration: 0.2 }
  },

  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// Text animations
export const textAnimations = {
  typewriter: {
    initial: { width: 0 },
    animate: { width: '100%' },
    transition: { duration: 2, ease: 'easeInOut' }
  },

  glow: {
    animate: {
      textShadow: [
        '0 0 5px rgba(99, 102, 241, 0.5)',
        '0 0 10px rgba(99, 102, 241, 0.8)',
        '0 0 5px rgba(99, 102, 241, 0.5)'
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }
};

// Utility to combine animations
export const combineAnimations = (...animations: any[]) => {
  return animations.reduce((combined, animation) => ({
    ...combined,
    ...animation
  }), {});
};

// Animation presets for common UI patterns
export const animationPresets = {
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 }
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  },

  dropdown: {
    initial: { opacity: 0, scale: 0.95, y: -10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },

  tooltip: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.15 }
  }
};
