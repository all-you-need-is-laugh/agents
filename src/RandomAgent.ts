import { Action, Agent, EnvironmentAgentState } from "./Environment";

export class RandomAgent implements Agent {
  private _leverage = Math.ceil(Math.random() * 100);
  public readonly id: string;
  constructor(name: string) {
    this.id = `${name} (random: ${this._leverage})`
  }

  getAction(state: EnvironmentAgentState): Action {
    return {
      buy: (Math.random() * 2 - 1) * this._leverage
    };
  }
}
