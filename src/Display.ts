import { EnvironmentDisplayState } from "./Environment";

interface DisplayContext {
  environmentState: EnvironmentDisplayState;
  time: number;
};

interface HistoryPoint {
  time: number;
  value: number;
}

interface ChartSeries {
  name: string;
  color: string;
  history: HistoryPoint[];
}

const SERIES_COLORS = [
  '#2a9d8f', '#e76f51', '#264653', '#e9c46a', '#8338ec',
  '#ff006e', '#3a86ff', '#fb5607', '#6a994e', '#bc6c25',
];

export class Display {
  private _lastUpdateTime = 0;

  private _buyRateHistory: HistoryPoint[] = [];
  private _sellRateHistory: HistoryPoint[] = [];
  private _capitalHistory = new Map<string, HistoryPoint[]>();
  private _decisionHistory = new Map<string, HistoryPoint[]>();

  constructor(
    private textContentElement: HTMLElement,
    private rateHistoryCanvasElement: HTMLCanvasElement,
    private capitalHistoryCanvasElement: HTMLCanvasElement,
    private decisionHistoryCanvasElement: HTMLCanvasElement
  ) { }

  public update(displayContext: DisplayContext) {
    this._updateText(displayContext);
    this._updateRateHistory(displayContext);
    this._updateCapitalHistory(displayContext);
    this._updateDecisionHistory(displayContext);
  }

  private _updateText({
    time,
    environmentState: {
      buyRate,
      sellRate,
      agents
    }
  }: DisplayContext): void {
    const now = Date.now();
    const fps = this._lastUpdateTime ? 1_000 / (now - this._lastUpdateTime) : 0;
    this._lastUpdateTime = now;

    this.textContentElement.innerHTML = `
      <div>Time lapsed: ${time} [FPS: ${fps.toFixed(0)}]</div>
      <div>Buy rate: ${buyRate}</div>
      <div>Sell rate: ${sellRate}</div>
      <br/>
      <table>
        <tr>
          <td width=200><b>Name</b></td><td width=100><b>USD</b></td><td width=100><b>Gold</b></td><td width=100><b>Capital</b></td>
        </tr>
        ${agents.map(agent => `
            <tr>
              <td>${agent.id}</td><td>${agent.usdAmount.toFixed(2)}</td><td>${agent.goldAmount.toFixed(2)}</td><td>${agent.capital.toFixed(2)}</td>
            </tr>
          `).join('\n')
      }
      </table>
    `;
  }

  private _updateRateHistory({
    time,
    environmentState: {
      buyRate,
      sellRate,
    }
  }: DisplayContext): void {
    this._buyRateHistory.push({ time, value: buyRate });
    this._sellRateHistory.push({ time, value: sellRate });

    this._drawChart(this.rateHistoryCanvasElement, [
      { name: 'Sell rate', color: SERIES_COLORS[1], history: this._sellRateHistory },
      { name: 'Buy rate', color: SERIES_COLORS[0], history: this._buyRateHistory },
    ]);
  }

  private _updateCapitalHistory({
    time,
    environmentState: {
      agents,
    }
  }: DisplayContext): void {
    for (const agent of agents) {
      let history = this._capitalHistory.get(agent.id);
      if (!history) {
        history = [];
        this._capitalHistory.set(agent.id, history);
      }
      history.push({ time, value: agent.capital });
    }

    this._drawChart(
      this.capitalHistoryCanvasElement,
      [...this._capitalHistory].map(([name, history], index) => ({
        name,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        history,
      }))
    );
  }

  private _updateDecisionHistory({
    time,
    environmentState: {
      agents,
    }
  }: DisplayContext): void {
    for (const agent of agents) {
      let history = this._decisionHistory.get(agent.id);
      if (!history) {
        history = [];
        this._decisionHistory.set(agent.id, history);
      }
      history.push({ time, value: agent.action?.buy ?? 0 });
    }

    this._drawDecisionChart(this.decisionHistoryCanvasElement);
  }

  // one row per agent, one cell per tick: green = buy, red = sell, opacity = amount
  private _drawDecisionChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = { top: 10, right: 10, bottom: 20, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    let minTime = Infinity;
    let maxTime = -Infinity;
    let maxAmount = 0;
    for (const history of this._decisionHistory.values()) {
      for (const { time, value } of history) {
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;
        if (Math.abs(value) > maxAmount) maxAmount = Math.abs(value);
      }
    }
    if (minTime === Infinity) return;

    const rows = [...this._decisionHistory];
    const rowHeight = plotHeight / rows.length;
    const cellWidth = plotWidth / (maxTime - minTime + 1);

    // agent names
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    rows.forEach(([name], index) => {
      ctx.fillText(name, padding.left - 4, padding.top + (index + 0.5) * rowHeight);
    });

    // time labels
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(minTime.toString(), padding.left, padding.top + plotHeight + 4);
    ctx.textAlign = 'right';
    ctx.fillText(maxTime.toString(), padding.left + plotWidth, padding.top + plotHeight + 4);

    // cells
    rows.forEach(([, history], index) => {
      const y = padding.top + index * rowHeight;
      for (const { time, value } of history) {
        if (value === 0 || maxAmount === 0) continue;
        ctx.globalAlpha = 0.15 + 0.85 * Math.abs(value) / maxAmount;
        ctx.fillStyle = value > 0 ? '#2a9d8f' : '#e76f51';
        ctx.fillRect(padding.left + (time - minTime) * cellWidth, y + 1, Math.max(cellWidth, 1), rowHeight - 2);
      }
    });
    ctx.globalAlpha = 1;
  }

  private _drawChart(canvas: HTMLCanvasElement, series: ChartSeries[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const legendWidth = 100;
    const padding = { top: 10, right: 10 + legendWidth, bottom: 20, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // loop instead of Math.min(...values): spread overflows the stack on long histories
    let minTime = Infinity;
    let maxTime = -Infinity;
    let min = Infinity;
    let max = -Infinity;
    for (const { history } of series) {
      for (const { time, value } of history) {
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    if (minTime === Infinity) return;
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const toX = (time: number) =>
      padding.left + (minTime === maxTime ? 0 : ((time - minTime) / (maxTime - minTime)) * plotWidth);
    const toY = (value: number) =>
      padding.top + (1 - (value - min) / (max - min)) * plotHeight;

    // axes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
    ctx.stroke();

    // labels
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(max.toFixed(2), padding.left - 4, padding.top);
    ctx.fillText(min.toFixed(2), padding.left - 4, padding.top + plotHeight);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(minTime.toString(), padding.left, padding.top + plotHeight + 4);
    ctx.textAlign = 'right';
    ctx.fillText(maxTime.toString(), padding.left + plotWidth, padding.top + plotHeight + 4);

    // lines
    ctx.lineWidth = 1.5;
    for (const { color, history } of series) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      history.forEach(({ time, value }, index) => {
        const x = toX(time);
        const y = toY(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // legend
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    series.forEach(({ name, color }, index) => {
      const x = width - legendWidth;
      const y = padding.top + 6 + index * 16;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 4, 10, 8);
      ctx.fillStyle = '#888';
      ctx.fillText(name, x + 16, y);
    });
  }
}
