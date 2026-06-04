import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Key, Trash2 } from 'lucide-react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { useProfile } from '../hooks/useProfile';
import { updateProfile } from '../api/profile';
import { apiDelete, apiGet, apiPost } from '../api/client';
import { useSetUnit } from '../context/UnitContext';
import type { WeightUnit } from '../utils/units';

interface ProfileScreenProps {
  onNavigateStart: () => void;
  onNavigateMetrics: () => void;
}

interface ApiKeyResponse {
  id: string;
  name: string;
  created_at: string;
  last_used: string | null;
}

interface ApiKeyCreatedResponse extends ApiKeyResponse {
  raw_key: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ProfileScreen({ onNavigateStart, onNavigateMetrics }: ProfileScreenProps) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data, loading } = useProfile();
  const setContextUnit = useSetUnit();
  const [unit, setUnit] = useState<WeightUnit>('lbs');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // API key state
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const rawKeyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading) {
      setUnit(data.unit);
      setInstructions(data.custom_instructions);
    }
  }, [loading, data]);

  useEffect(() => {
    apiGet<ApiKeyResponse[]>('/api-keys/').then(setApiKeys).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ unit, custom_instructions: instructions });
      setContextUnit(unit);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateKey() {
    setGeneratingKey(true);
    try {
      const res = await apiPost<ApiKeyCreatedResponse>('/api-keys/', { name: 'MCP Key' });
      setNewRawKey(res.raw_key);
      setApiKeys((prev) => [res, ...prev]);
    } finally {
      setGeneratingKey(false);
    }
  }

  async function handleRevokeKey(id: string) {
    await apiDelete(`/api-keys/${id}`);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    if (apiKeys.length === 1) setNewRawKey(null);
  }

  function handleCopy() {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-dvh bg-surface">
      <TopAppBar />

      <main
        className="mx-auto max-w-md px-6 pb-32"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5.5rem)' }}
      >
        <section className="mb-10">
          <h2 className="font-headline mb-4 text-5xl font-extrabold leading-[0.9] tracking-tighter text-on-surface">
            PROFILE
          </h2>
          <p className="font-body max-w-[280px] text-lg leading-snug text-secondary">
            Your settings and AI preferences.
          </p>
        </section>

        {/* Unit toggle */}
        <section className="mb-8">
          <p className="font-label mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            Weight Unit
          </p>
          <div className="inline-flex rounded-2xl bg-surface-container p-1">
            {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-xl px-8 py-2.5 font-label text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  unit === u
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-secondary'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </section>

        {/* Custom instructions */}
        <section className="mb-8">
          <p className="font-label mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            Training Notes
          </p>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value.slice(0, 1000))}
            placeholder="Tell the AI trainer anything… e.g. lower-back recovery, equipment limits, intensity preferences."
            rows={6}
            className="w-full resize-none rounded-2xl bg-surface-container px-4 py-3 font-body text-sm leading-relaxed text-on-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="font-label mt-1.5 text-right text-[10px] text-secondary/50">
            {instructions.length} / 1000
          </p>
        </section>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mb-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-6 font-headline text-xl font-extrabold uppercase tracking-[0.1em] text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ boxShadow: '0 12px 40px rgba(187,21,44,0.2)' }}
        >
          {saved ? (
            <>
              <Check className="h-5 w-5" strokeWidth={2.5} />
              Saved
            </>
          ) : saving ? (
            'Saving…'
          ) : (
            'Save Settings'
          )}
        </button>

        {/* User ID section */}
        {user?.id && (
          <section className="mb-8">
            <p className="font-label mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              Your User ID (MCP setup)
            </p>
            <div className="flex items-center gap-2 rounded-2xl bg-surface-container px-4 py-3">
              <code className="flex-1 break-all font-mono text-xs text-on-surface">{user.id}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(user.id)}
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary active:scale-90 transition-transform"
              >
                <Copy className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <p className="font-label mt-1.5 text-[10px] text-secondary/50">
              Set as <code className="font-mono">KINETIC_USER_ID</code> in <code className="font-mono">mcp/.env</code>
            </p>
          </section>
        )}

        {/* API Key section */}
        <section className="mb-10">
          <p className="font-label mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            API Key (for MCP)
          </p>
          <p className="font-body mb-4 text-sm text-secondary/70">
            Generate a key and add it to <code className="rounded bg-surface-container px-1 font-mono text-xs">mcp/.env</code> as <code className="rounded bg-surface-container px-1 font-mono text-xs">KINETIC_API_KEY</code>.
          </p>

          {/* New key display */}
          {newRawKey && (
            <div className="mb-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
              <p className="font-label mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
                New Key — Copy Now (won't be shown again)
              </p>
              <div className="flex items-center gap-2">
                <code ref={rawKeyRef} className="flex-1 break-all font-mono text-xs text-on-surface">
                  {newRawKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary active:scale-90 transition-transform"
                >
                  {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerateKey}
            disabled={generatingKey}
            className="mb-4 flex items-center gap-2 rounded-full border-2 border-outline-variant px-5 py-2.5 font-label text-sm font-semibold uppercase tracking-wider text-secondary transition-transform active:scale-95 disabled:opacity-50"
          >
            <Key className="h-4 w-4" strokeWidth={2.5} />
            {generatingKey ? 'Generating…' : 'Generate API Key'}
          </button>

          {/* Key list */}
          {apiKeys.length > 0 && (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-label text-xs font-semibold text-on-surface">{key.name}</p>
                    <p className="font-label text-[10px] text-secondary/60">
                      Created {formatDate(key.created_at)}
                      {key.last_used ? ` · Last used ${formatDate(key.last_used)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(key.id)}
                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-secondary/50 hover:text-primary active:scale-90 transition-all"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-full border-2 border-outline-variant py-4 font-label text-sm font-semibold uppercase tracking-wider text-secondary transition-transform active:scale-95"
        >
          Sign Out
        </button>
      </main>

      <BottomNav
        active="profile"
        onSelect={(tab) => {
          if (tab === 'train') onNavigateStart();
          if (tab === 'metrics') onNavigateMetrics();
        }}
      />
    </div>
  );
}
