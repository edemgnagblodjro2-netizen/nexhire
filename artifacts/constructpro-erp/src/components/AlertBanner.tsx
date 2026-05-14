type AlertVariant = 'a' | 'r' | 'g' | 'b';

interface AlertBannerProps {
  variant: AlertVariant;
  icon: string;
  children: React.ReactNode;
}

export default function AlertBanner({ variant, icon, children }: AlertBannerProps) {
  return (
    <div className={`alert al-${variant}`}>
      <i className={`ti ${icon}`} />
      <div>{children}</div>
    </div>
  );
}
