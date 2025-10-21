import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface MobileOptimizedContainerProps {
  children: React.ReactNode;
  className?: string;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  noPadding?: boolean;
}

const MobileOptimizedContainer: React.FC<MobileOptimizedContainerProps> = ({
  children,
  className = '',
  safeAreaTop = false,
  safeAreaBottom = false,
  noPadding = false
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const paddingClasses = noPadding ? '' : 'p-2 sm:p-4 lg:p-6';

  return (
    <div className={`
      ${safeAreaTop ? 'pt-12 sm:pt-16 md:pt-0' : ''}
      ${safeAreaBottom ? 'pb-16 sm:pb-20 md:pb-0' : ''}
      ${paddingClasses}
      ${className}
      ${isMobile ? 'max-w-full' : 'max-w-4xl mx-auto'}
      ${isMobile ? 'overscroll-contain' : ''}
    `}>
      {children}
    </div>
  );
};

export default MobileOptimizedContainer;
