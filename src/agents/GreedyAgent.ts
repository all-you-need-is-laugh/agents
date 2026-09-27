import { Action, Agent, EnvironmentAgentState } from "../Environment";

export class GreedyAgent implements Agent {
  public readonly id: string;
  constructor(
    name: string,
    private _buyThreshold = 0.1,
    private _sellThreshold = 0.9,
  ) {
    this.id = `${name} (greedy: ${this._buyThreshold}/${this._sellThreshold})`
  }

  getAction(time: number, state: EnvironmentAgentState): Action {
    if (state.buyRate <= this._buyThreshold) {
      return { buy: 1 }
    }

    if (state.sellRate >= this._sellThreshold) {
      return { buy: -1 }
    }

    return { buy: 0 };
  }
}
