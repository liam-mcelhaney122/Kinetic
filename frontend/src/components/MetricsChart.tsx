import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useUnit } from '../context/UnitContext';

export interface ChartPoint {
  date: string;
  topSet: number;
  reps: number;
}

interface MetricsChartProps {
  points: ChartPoint[];
}

const PRIMARY = '#b7102a';
const OUTLINE = '#e4bebc';
const ON_SURFACE_VARIANT = '#5b403f';

function formatTick(date: string): string {
  const [y, m] = date.split('-');
  return `${m}/${y.slice(2)}`;
}

interface TooltipPayloadEntry {
  payload: ChartPoint;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const unit = useUnit();
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-on-surface px-3 py-2 shadow-lg">
      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-primary/70">
        {p.date}
      </p>
      <p className="font-headline text-sm font-extrabold text-on-primary">
        {p.topSet} {unit} × {p.reps}
      </p>
    </div>
  );
}

export function MetricsChart({ points }: MetricsChartProps) {
  const unit = useUnit();
  if (points.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center px-4 text-center">
        <p className="font-body text-sm text-secondary/70">
          No history yet for this lift.
        </p>
      </div>
    );
  }

  if (points.length === 1) {
    const p = points[0];
    return (
      <div className="flex h-[200px] flex-col items-center justify-center px-4 text-center">
        <p className="font-headline text-3xl font-extrabold text-primary">
          {p.topSet} {unit}
        </p>
        <p className="font-label mt-2 text-xs text-secondary">
          One session so far — {p.date}
        </p>
      </div>
    );
  }

  const firstTick = points[0].date;
  const lastTick = points[points.length - 1].date;

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={OUTLINE} strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="date"
            ticks={[firstTick, lastTick]}
            tickFormatter={formatTick}
            tick={{ fill: ON_SURFACE_VARIANT, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: ON_SURFACE_VARIANT, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: PRIMARY, strokeOpacity: 0.2 }} />
          <Line
            type="monotone"
            dataKey="topSet"
            stroke={PRIMARY}
            strokeWidth={2.5}
            dot={{ r: 3, fill: PRIMARY, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: PRIMARY, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
