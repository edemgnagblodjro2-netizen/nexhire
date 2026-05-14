interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
  subColor?: string;
}

export default function KpiCard({ label, value, sub, valueColor, subColor }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="klbl">{label}</div>
      <div className="kval" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {sub && <div className="ksub" style={subColor ? { color: subColor } : undefined}>{sub}</div>}
    </div>
  );
}
