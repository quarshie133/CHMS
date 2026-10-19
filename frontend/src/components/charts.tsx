"use client";

/**
 * Lightweight, accessible bar chart (no chart library). Bars scale to the
 * largest value; the latest bar is emphasized. A visually hidden table carries
 * the same data for screen readers.
 */
export function BarChart({
  data,
  caption,
  valueLabel = "Value",
  formatValue = (n: number) => String(n),
  height = 192,
}: {
  data: Array<{ key: string; label: string; value: number }>;
  caption: string;
  valueLabel?: string;
  formatValue?: (n: number) => string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <div className="flex items-end gap-2 border-b border-line pb-px" style={{ height }} aria-hidden>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const last = i === data.length - 1;
          return (
            <div key={d.key} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
                {formatValue(d.value)}
              </span>
              <div
                className={`w-full max-w-10 rounded-t-md transition-[height] duration-500 ${last ? "bg-brand" : "bg-[#b9cde3] group-hover:bg-[#93b2d3]"}`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        {data.map((d) => (
          <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-subtle">
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
