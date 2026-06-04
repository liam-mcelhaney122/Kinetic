export const QUOTES: string[] = [
  'Strength is forged one rep at a time.',
  'The work you put in today writes tomorrow.',
  'You showed up. That is half the battle.',
  'Iron sharpens iron. Today, you sharpened yours.',
  'Progress is built in pounds, not promises.',
  'Discipline is the bridge between goals and results.',
  'Earn the body. Earn the mind.',
  'Sweat now. Shine later.',
  'Every set is a vote for who you are becoming.',
  'No shortcuts. Just the work.',
  'You against you. And you are winning.',
  'Stronger than yesterday. Lighter than tomorrow.',
  'The barbell does not lie.',
  'Pain is temporary. Pride is forever.',
  'You are the reason this happened.',
];

export function pickQuote(seed?: string): string {
  if (!seed) return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return QUOTES[Math.abs(hash) % QUOTES.length];
}
