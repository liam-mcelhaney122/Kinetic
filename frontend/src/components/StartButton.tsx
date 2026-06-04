interface StartButtonProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function StartButton({ label, disabled, onClick }: StartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container px-8 py-6 font-headline text-xl font-extrabold uppercase tracking-[0.1em] text-on-primary transition-transform duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
      style={{ boxShadow: '0 12px 40px rgba(187, 21, 44, 0.2)' }}
    >
      {label}
    </button>
  );
}
