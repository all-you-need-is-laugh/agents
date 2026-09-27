import { EnvironmentDisplayState } from "./Environment";

interface DisplayContext {
  environmentState: EnvironmentDisplayState;
  time: number;
};

export class Display {
  private _lastUpdateTime = 0;
  constructor(private contentElement: HTMLElement) {}

  public update({
  time,
  environmentState: {
    exchangeRate,
    agents
  }
}: DisplayContext) {
    const now = Date.now();
    const fps = this._lastUpdateTime ? 1_000 / (now - this._lastUpdateTime): 0;
    this._lastUpdateTime = now;

    this.contentElement.innerHTML = `
      <div>Time lapsed: ${time} [FPS: ${fps.toFixed(0)}]</div>
      <div>Exchange rate: ${exchangeRate}</div>
      <br/>
      <table>
        <tr>
          <td width=200><b>Name</b></td><td width=100><b>USD</b></td><td width=100><b>Gold</b></td><td width=100><b>Capital</b></td>
        </tr>
        ${
          agents.map(agent => `
            <tr>
              <td>${agent.id}</td><td>${agent.usdAmount.toFixed(2)}</td><td>${agent.goldAmount.toFixed(2)}</td><td>${agent.capital.toFixed(2)}</td>
            </tr>
          `).join('\n')
        }
      </table>
    `;
  }
}
