import { TrendingUp, TrendingDown } from 'lucide-react';

interface DeltaCardProps {
  delta: number | null;
  caption: string;
}

export function DeltaCard({ delta, caption }: DeltaCardProps) {
  const positive = delta !== null && delta > 0;
  const negative = delta !== null && delta < 0;

  const tone = positive
    ? 'text-primary'
    : negative
      ? 'text-on-surface'
      : 'text-secondary/70';

  const Icon = positive ? TrendingUp : negative ? TrendingDown : null;
  const valueText = delta === null ? '—' : `${positive ? '+' : ''}${delta}%`;

  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4">
      <div className={`flex items-center gap-1.5 ${tone}`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={2.5} />}
        <span className="font-headline text-xl font-extrabold leading-none">{valueText}</span>
      </div>
      <p className="font-label mt-1.5 text-[11px] font-semibold text-secondary/80">
        {caption}
      </p>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4">
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
        {label}
      </p>
      <p className="font-headline mt-1.5 text-xl font-extrabold leading-none text-on-surface">
        {value}
      </p>
    </div>
  );
}
