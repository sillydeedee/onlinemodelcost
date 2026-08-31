import { formatCount, formatMoney } from "./format";
import type { Currency } from "./fx";

export type CompareRow = {
  family: string;
  label: string;
  totalUsd: number;
  secondary?: string;
  tokens?: number;
  tokensEstimate?: boolean;
};

/** Costliest → cheapest. Four models get four distinct colors. */
const RANK_COLORS = ["#e11d48", "#eab308", "#3b82f6", "#16a34a"];

function colorsByCost(rows: CompareRow[]): string[] {
  const order = rows
    .map((row, index) => ({ index, usd: row.totalUsd }))
    .sort((a, b) => b.usd - a.usd || a.index - b.index);
  const colors = Array.from({ length: rows.length }, () => RANK_COLORS[RANK_COLORS.length - 1]);
  order.forEach((item, rank) => {
    colors[item.index] = RANK_COLORS[Math.min(rank, RANK_COLORS.length - 1)];
  });
  return colors;
}

function yTickValues(max: number): number[] {
  if (max <= 0) return [0];
  return [max, max * (2 / 3), max / 3, 0];
}

export function renderCostCompare(
  root: HTMLElement,
  rows: CompareRow[],
  currency: Currency,
  options: { yLabel: string },
) {
  root.replaceChildren();

  const max = Math.max(...rows.map((row) => row.totalUsd), 0);
  const colors = colorsByCost(rows);
  const ticks = yTickValues(max);

  const chart = document.createElement("div");
  chart.className = "cost-chart";
  chart.style.setProperty("--cols", String(Math.max(rows.length, 1)));
  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    `${options.yLabel} by model. ${rows
      .map((row) => {
        const tokens =
          row.tokens == null
            ? ""
            : `, ${row.tokensEstimate ? "about " : ""}${formatCount(row.tokens)} tokens`;
        return `${row.family} ${row.label}: ${formatMoney(row.totalUsd, currency)}${tokens}`;
      })
      .join(". ")}`,
  );

  const yTitle = document.createElement("span");
  yTitle.className = "cost-axis-y-title";
  yTitle.textContent = options.yLabel;

  const yTicks = document.createElement("div");
  yTicks.className = "cost-y-ticks";
  yTicks.setAttribute("aria-hidden", "true");
  for (const usd of ticks) {
    const tick = document.createElement("span");
    tick.dataset.usd = String(usd);
    tick.textContent = formatMoney(usd, currency);
    yTicks.append(tick);
  }

  const plot = document.createElement("div");
  plot.className = "cost-plot";

  const grid = document.createElement("div");
  grid.className = "cost-grid";
  grid.setAttribute("aria-hidden", "true");
  for (let i = 0; i < ticks.length; i += 1) {
    grid.append(document.createElement("i"));
  }

  const cols = document.createElement("div");
  cols.className = "cost-cols";

  const xLabels = document.createElement("div");
  xLabels.className = "cost-x-labels";

  rows.forEach((row, index) => {
    const pct = max > 0 ? (row.totalUsd / max) * 100 : 0;
    const height = row.totalUsd > 0 ? Math.max(pct, 2) : 0;

    const col = document.createElement("div");
    col.className = "cost-col";

    const value = document.createElement("span");
    value.className = "cost-col-value";
    value.dataset.usd = String(row.totalUsd);
    value.style.bottom = `calc(${height}% + 4px)`;
    value.textContent = formatMoney(row.totalUsd, currency);

    const bar = document.createElement("div");
    bar.className = "cost-col-bar";
    bar.style.height = `${height}%`;
    bar.style.background = colors[index];
    bar.style.color = colors[index];

    col.append(value, bar);
    cols.append(col);

    const xlab = document.createElement("div");
    xlab.className = "cost-x-label";
    const name = document.createElement("span");
    name.textContent = row.label;
    xlab.append(name);
    if (row.tokens != null) {
      const tokens = document.createElement("span");
      tokens.className = "cost-x-tokens";
      const count = formatCount(row.tokens);
      tokens.textContent = row.tokensEstimate
        ? `~${count} tokens`
        : `${count} tokens`;
      xlab.append(tokens);
    }
    const subParts = [row.family, row.secondary].filter(Boolean);
    if (subParts.length > 0) {
      const sub = document.createElement("span");
      sub.className = "cost-x-sub";
      sub.textContent = subParts.join(" · ");
      xlab.append(sub);
    }
    xLabels.append(xlab);
  });

  plot.append(grid, cols);

  const xTitle = document.createElement("span");
  xTitle.className = "cost-axis-x-title";
  xTitle.textContent = "Models";

  chart.append(yTitle, yTicks, plot, xLabels, xTitle);

  const wrap = document.createElement("div");
  wrap.className = "cost-chart-wrap";
  wrap.append(chart);
  root.append(wrap);
}

export function relabelUsdNodes(root: ParentNode, currency: Currency) {
  for (const node of root.querySelectorAll<HTMLElement>("[data-usd]")) {
    const usd = Number(node.dataset.usd);
    if (Number.isFinite(usd)) node.textContent = formatMoney(usd, currency);
  }
}
