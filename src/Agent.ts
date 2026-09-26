import { Action, EnvironmentAgentState } from "./Environment";

export class Agent {
  private _leverage = Math.ceil(Math.random() * 100);
  public readonly name: string;
  constructor(name: string) {
    this.name = `${name} (${this._leverage})`
  }

  getAction(state: EnvironmentAgentState): Action {
    return {
      buy: (Math.random() * 2 - 1) * this._leverage
    };
  }
}
