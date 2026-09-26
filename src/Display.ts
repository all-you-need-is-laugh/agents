import { EnvironmentDisplayState } from "./Environment";

interface DisplayContext {
  environmentState: EnvironmentDisplayState;
  time: number;
};

export class Display {
  constructor(private contentElement: HTMLElement) {}

  public update({
  time,
  environmentState: {
    exchangeRate,
    agents
  }
}: DisplayContext) {
    this.contentElement.innerHTML = `
      <div>Time lapsed: ${time}</div>
      <div>Exchange rate: ${exchangeRate}</div>
      <br/>
      <table>
        <tr>
          <td width=100><b>Name</b></td><td width=100><b>USD</b></td><td width=100><b>Gold</b></td><td width=100><b>Capital</b></td>
        </tr>
        ${
          agents.map(agent => `
            <tr>
              <td>${agent.name}</td><td>${agent.usdAmount.toFixed(2)}</td><td>${agent.goldAmount.toFixed(2)}</td><td>${agent.capital.toFixed(2)}</td>
            </tr>
          `).join('\n')
        }
      </table>
    `;
  }
}
