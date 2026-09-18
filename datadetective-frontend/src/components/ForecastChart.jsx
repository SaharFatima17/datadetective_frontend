import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Panel } from "./ui";

const compact = (n) =>
  n == null
    ? "—"
    : Math.abs(n) >= 1000
      ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n)
      : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="glass rounded-lg px-3 py-2 text-[12px]">
      <div className="mb-1 font-medium">{label}</div>
      {row.actual != null && (
        <div className="font-mono">actual {compact(row.actual)}</div>
      )}
      {row.projected != null && (
        <>
          <div className="font-mono text-[var(--accent)]">
            projected {compact(row.projected)}
          </div>
          <div className="font-mono text-[var(--text-muted)]">
            range {compact(row.lower)} – {compact(row.upper)}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Proposal Sec.17: historical line extending into a shaded band, with the model
 * and its backtested accuracy shown alongside.
 *
 * A withheld forecast is not an empty chart — it is a stated reason. Showing a
 * blank panel would imply the system had nothing to say, when in fact it
 * decided the projection was not good enough to show.
 */
export default function ForecastChart({ forecast }) {
  if (!forecast) return null;

  const predictions = forecast.predictions || [];
  const history = forecast.history || [];
  const backtest = forecast.backtest || forecast.backtest_metrics || {};
  const withheld = forecast.reliability !== "ok" || predictions.length === 0;

  // Real dates where the backend supplies them; a relative counter only as a
  // fallback, because mixing "t-12" with "2026-03-31" on one axis reads as two
  // different scales.
  const periods = forecast.history_periods || [];
  const data = [
    ...history.map((value, i) => ({
      period: periods[i] || `t-${history.length - i}`,
      actual: value,
    })),
    ...predictions.map((p) => ({
      period: p.period,
      projected: p.point,
      lower: p.lower,
      upper: p.upper,
      band: [p.lower, p.upper],
    })),
  ];

  // join the two series so the line does not break at the boundary
  if (history.length && predictions.length) {
    const last = data[history.length - 1];
    last.projected = last.actual;
    last.band = [last.actual, last.actual];
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold leading-tight">
            Forecast — {forecast.target_metric}
          </h2>
          <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
            {forecast.model || forecast.model_name} model
            {backtest.mape != null && ` · backtest error ${backtest.mape}% MAPE`}
            {backtest.naive_mape != null && ` · naive baseline ${backtest.naive_mape}%`}
          </p>
        </div>
        <Badge tone={withheld ? "association" : "verified"}>
          {withheld ? "low confidence" : "validated"}
        </Badge>
      </div>

      {withheld ? (
        <div className="px-5 py-6">
          <p className="text-[13.5px] font-medium">This projection is not shown as fact.</p>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-[var(--text-muted)]">
            {forecast.withheld_reason ||
              "The model failed its accuracy check on held-out periods."}
          </p>
          {predictions.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {predictions.map((p) => (
                <div
                  key={p.period}
                  className="rounded-lg border px-3 py-2"
                  style={{ background: "var(--surface-inset)" }}
                >
                  <div className="text-[11.5px] text-[var(--text-muted)]">{p.period}</div>
                  <div className="font-mono text-[15px]">{compact(p.point)}</div>
                  <div className="font-mono text-[11.5px] text-[var(--text-muted)]">
                    {compact(p.lower)} – {compact(p.upper)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-hairline)" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border-hairline)" }}
                minTickGap={38}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={compact}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                dataKey="band"
                stroke="none"
                fill="var(--accent)"
                fillOpacity={0.14}
                isAnimationActive={false}
              />
              {history.length > 0 && (
                <ReferenceLine
                  x={data[history.length - 1]?.period}
                  stroke="var(--border-strong)"
                  strokeDasharray="3 3"
                  label={{
                    value: "today",
                    position: "top",
                    fontSize: 10,
                    fill: "var(--text-muted)",
                  }}
                />
              )}
              <Line
                dataKey="actual"
                stroke="var(--text-secondary)"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="projected"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "var(--accent)" }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="px-4 pb-1 pt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
            The shaded band is the 95% range, not a margin of error on a single answer.
            This assumes current patterns continue; it is not a guarantee.
          </p>
        </div>
      )}
    </Panel>
  );
}