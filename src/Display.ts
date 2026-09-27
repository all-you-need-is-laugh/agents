import { EnvironmentDisplayState } from "./Environment";

interface DisplayContext {
  environmentState: EnvironmentDisplayState;
  time: number;
};

export class Display {
  private _lastUpdateTime = 0;

  private _buyRateHistory: { label: string; value: number }[] = [];
  private _sellRateHistory: { label: string; value: number }[] = [];

  constructor(
    private textContentElement: HTMLElement,
    private rateHistoryCanvasElement: HTMLCanvasElement
  ) { }

  public update(displayContext: DisplayContext) {
    this._updateText(displayContext);
    this._updateRateHistory(displayContext);
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
    this._buyRateHistory.push({
      label: time.toString(),
      value: buyRate
    });

    this._sellRateHistory.push({
      label: time.toString(),
      value: sellRate
    });

    this._drawRateHistory();
  }

  private _drawRateHistory(): void {
    const canvas = this.rateHistoryCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = { top: 10, right: 10, bottom: 20, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const points = this._buyRateHistory;
    if (points.length === 0) return;

    // loop instead of Math.min(...values): spread overflows the stack on long histories
    let min = Infinity;
    let max = -Infinity;
    for (const { value } of [...points, ...this._sellRateHistory]) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const toX = (index: number) =>
      padding.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * plotWidth);
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
    ctx.fillText(points[0].label, padding.left, padding.top + plotHeight + 4);
    ctx.textAlign = 'right';
    ctx.fillText(points[points.length - 1].label, padding.left + plotWidth, padding.top + plotHeight + 4);

    const drawLine = (history: { value: number }[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      history.forEach((point, index) => {
        const x = toX(index);
        const y = toY(point.value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine(this._buyRateHistory, '#2a9d8f');
    drawLine(this._sellRateHistory, '#e76f51');
  }
}
