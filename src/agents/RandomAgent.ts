import { Action, Agent, EnvironmentAgentState } from "../Environment";

export class RandomAgent implements Agent {
  private _leverage = Math.ceil(Math.random() * 100);
  public readonly id: string;
  constructor(name: string) {
    this.id = `${name} (random: ${this._leverage})`
  }

  getAction(time: number, state: EnvironmentAgentState): Action {
    return {
      buyGoldAmount: (Math.random() * 2 - 1) * this._leverage
    };
  }
}
