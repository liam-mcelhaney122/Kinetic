import { Dumbbell, BarChart3, User } from 'lucide-react';

export type Tab = 'train' | 'metrics' | 'profile';

interface BottomNavProps {
  active?: Tab;
  onSelect?: (tab: Tab) => void;
}

export function BottomNav({ active = 'train', onSelect }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl rounded-t-3xl"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -12px 40px rgba(187, 21, 44, 0.06)',
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-4 pt-2 pb-3">
        <NavItem
          icon={<Dumbbell strokeWidth={2.25} />}
          label="Train"
          active={active === 'train'}
          onClick={() => onSelect?.('train')}
        />
        <NavItem
          icon={<BarChart3 strokeWidth={2.25} />}
          label="Metrics"
          active={active === 'metrics'}
          onClick={() => onSelect?.('metrics')}
        />
        <NavItem
          icon={<User strokeWidth={2.25} />}
          label="Profile"
          active={active === 'profile'}
          onClick={() => onSelect?.('profile')}
        />
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[64px] flex-col items-center justify-center rounded-2xl p-2 transition-all active:scale-90 ${
        active ? 'bg-primary-fixed/40 text-primary' : 'text-stone-400'
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="mt-1 font-label text-[10px] font-semibold uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}
