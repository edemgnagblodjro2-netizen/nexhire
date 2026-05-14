import { bdgClass, bdgLabel } from '../utils';

interface BadgeProps {
  st: string;
  children?: React.ReactNode;
  className?: string;
}

export default function Badge({ st, children, className }: BadgeProps) {
  return (
    <span className={`bdg ${bdgClass(st)} ${className || ''}`}>
      {children ?? bdgLabel(st)}
    </span>
  );
}
