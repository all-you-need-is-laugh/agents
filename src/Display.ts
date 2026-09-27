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
    // draw a graph of this._buyRateHistory on the this rateHistoryCanvasElement
  }
}
