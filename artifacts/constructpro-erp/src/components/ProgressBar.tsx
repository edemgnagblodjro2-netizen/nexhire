interface ProgressBarProps {
  pct: number;
  color?: string;
  style?: React.CSSProperties;
}

export default function ProgressBar({ pct, color = 'var(--green)', style }: ProgressBarProps) {
  return (
    <div className="pb" style={style}>
      <div className="pf" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}
