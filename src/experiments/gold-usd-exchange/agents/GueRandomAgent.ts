import { GueAction, GueEnvironmentAgentState } from "../GueEnvironment";
import { GueAgent } from "./GueAgent";

export class GueRandomAgent implements GueAgent {
  private _leverage = Math.ceil(Math.random() * 100);
  public readonly id: string;
  constructor(name: string) {
    this.id = `${name} (random: ${this._leverage})`
  }

  getAction(time: number, state: GueEnvironmentAgentState): GueAction {
    return {
      buyGoldAmount: (Math.random() * 2 - 1) * this._leverage
    };
  }
}
