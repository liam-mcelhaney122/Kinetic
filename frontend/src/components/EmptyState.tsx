import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-xl bg-surface-container-low p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-6 w-6 text-primary" strokeWidth={2.25} />
      </div>
      <h3 className="font-headline text-xl font-bold text-on-surface mb-2">{title}</h3>
      <p className="font-body text-sm text-secondary leading-snug max-w-[240px] mx-auto">
        {message}
      </p>
    </div>
  );
}
