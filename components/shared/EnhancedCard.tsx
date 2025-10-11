import React from 'react';
import Card from './Card';
import { cardAnimations, hoverScale } from '../../utils/animationUtils';

interface EnhancedCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animation?: 'none' | 'hover' | 'scale' | 'lift';
  onClick?: () => void;
  disabled?: boolean;
}

const EnhancedCard: React.FC<EnhancedCardProps> = ({
  title,
  children,
  className = '',
  actions,
  variant = 'default',
  size = 'md',
  padding = 'md',
  animation = 'hover',
  onClick,
  disabled = false
}) => {
  const getAnimationProps = () => {
    switch (animation) {
      case 'hover':
        return cardAnimations.hover;
      case 'scale':
        return hoverScale;
      case 'lift':
        return cardAnimations.hover;
      case 'none':
      default:
        return {};
    }
  };

  const animationProps = getAnimationProps();

  return (
    <Card
      title={title}
      className={`${onClick ? 'cursor-pointer' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      variant={variant}
      size={size}
      padding={padding}
      actions={actions}
    >
      <div
        onClick={!disabled ? onClick : undefined}
        className={onClick ? 'h-full' : ''}
        {...animationProps}
      >
        {children}
      </div>
    </Card>
  );
};

export default EnhancedCard;
