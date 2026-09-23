import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'h-10',
  md: 'h-14',
  lg: 'h-20',
  xl: 'h-28',
};

export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Allianç@ SAFETY"
      className={cn('w-auto object-contain', sizes[size], className)}
    />
  );
}
