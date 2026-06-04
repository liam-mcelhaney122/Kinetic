import { Menu } from 'lucide-react';

export function TopAppBar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4">
        <button
          type="button"
          aria-label="Menu"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-on-surface active:scale-90 transition-transform"
        >
          <Menu strokeWidth={2.25} className="h-6 w-6" />
        </button>

        <h1 className="font-headline text-xl font-black uppercase tracking-tighter text-primary">
          KINETIC
        </h1>

        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/10 bg-surface-container-high">
          <div className="h-full w-full bg-gradient-to-br from-surface-container-high to-surface-container-highest" />
        </div>
      </div>
    </header>
  );
}
