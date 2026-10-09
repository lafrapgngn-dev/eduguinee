/* =========================================================================
   ChartCard.tsx — UN GRAPHIQUE DANS UNE CARTE
   -------------------------------------------------------------------------
   Chart.js dessine le graphique sur un élément <canvas>.
   Règle importante avec React : on détruit le graphique avant d'en recréer
   un (sinon les dessins se superposent). C'est le rôle de `destroy()` dans
   le nettoyage du `useEffect`.
   Le graphique se redessine automatiquement dès que les données changent.
   ========================================================================= */

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { cn } from "../utils/cn";

export type ChartType = "bar" | "line" | "pie" | "doughnut" | "polarArea";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: ChartType;
  labels: (string | number)[];
  values?: number[];
  series?: { label: string; values: number[] }[];
  className?: string;
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ["#1d4ed8", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#0ea5e9", "#f97316", "#14b8a6"];

export function ChartCard({ title, subtitle, type, labels, values, series, className, colors = DEFAULT_COLORS, height = 210 }: ChartCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /* "any" : Chart.js possède des types très stricts ; on garde un typage simple. */
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();

    const safeValues: number[] = values ?? [];
    const isCircular = type === "pie" || type === "doughnut" || type === "polarArea";

    const datasets =
      series && series.length
        ? series.map((item, index) => ({
            label: item.label,
            data: item.values,
            backgroundColor: type === "line" ? `${colors[index % colors.length]}33` : colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: type === "line" ? 2 : 0,
            borderRadius: 6,
            tension: 0.35,
            fill: type === "line",
          }))
        : [
            {
              label: title,
              data: safeValues,
              backgroundColor: isCircular ? colors : colors.map((color) => `${color}cc`),
              borderColor: colors,
              borderWidth: isCircular ? 0 : 1,
              borderRadius: 6,
              tension: 0.35,
              fill: type === "line",
            },
          ];

    chartRef.current = new Chart(canvasRef.current, {
      type,
      data: { labels: labels as string[], datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: isCircular || (series?.length ?? 0) > 0, position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } },
          tooltip: { enabled: true },
        },
        scales: isCircular
          ? {}
          : {
              x: { grid: { display: false }, ticks: { font: { size: 9 } } },
              y: { beginAtZero: true, ticks: { font: { size: 9 }, precision: 0 } },
            },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [title, type, labels, safeValuesKey(values), series, colors]);

  return (
    <div className={cn("premium-panel rounded-[24px] p-4", className)}>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div style={{ height }} className="relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

/** Clé stable pour détecter un changement de données (évite les redessins inutiles). */
function safeValuesKey(values?: number[]): string {
  return (values ?? []).join(",");
}
