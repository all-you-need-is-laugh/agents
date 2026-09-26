import { Agent } from "./Agent";

interface AgentState {
  name: string;
  goldAmount: number;
  usdAmount: number;
}

export interface EnvironmentAgentState {
  exchangeRate: number;
  goldAmount: number;
  usdAmount: number;
}

export type Action = {
  buy: number
};

export interface EnvironmentDisplayState {
  exchangeRate: number;
  agents: {
    name: string;
    goldAmount: number;
    usdAmount: number;
    capital: number;
  }[];
}

export class Environment {
  private _agentActions = new Map<Agent, Action>();
  private _agentStates: AgentState[] = [];

  private _exchangeRate = 1;

  addAgent(agent: Agent) {
    this._agentStates.push({
      name: agent.name,
      goldAmount: 0,    // Initial amount in gold
      usdAmount: 1000,  // Initial amount in USD
    });
  }

  private _getAgentState(agent: Agent): AgentState {
    const agentState = this._agentStates.find((s) => s.name === agent.name);
    if (!agentState) {
      throw new Error(`Agent state not found for ${agent.name}`);
    }

    return agentState;
  }

  getStateFor(agent: Agent): EnvironmentAgentState {
    const agentState = this._getAgentState(agent);

    return {
      exchangeRate: this._exchangeRate,
      goldAmount: agentState.goldAmount,
      usdAmount: agentState.usdAmount,
    };
  }

  getDisplayState(): EnvironmentDisplayState {
    // Return the current state of the environment for display purposes
    return {
      exchangeRate: this._exchangeRate,
      agents: this._agentStates.map((s) => ({
        name: s.name,
        goldAmount: s.goldAmount,
        usdAmount: s.usdAmount,
        capital: s.usdAmount + s.goldAmount * this._exchangeRate
      }))
    };
  }

  addActionIntent(agent: Agent, action: Action) {
    this._agentActions.set(agent, action);
  }

  update (time: number) {
    for (const [agent, action] of this._agentActions.entries()) {
      const agentState = this._getAgentState(agent);

      if (action.buy > 0) {
        const price = action.buy * this._exchangeRate;
        const canSpend = Math.min(price, agentState.usdAmount);

        agentState.usdAmount -= canSpend;
        agentState.goldAmount += canSpend / this._exchangeRate;
      } else if (action.buy < 0) {
        const price = Math.abs(action.buy) * this._exchangeRate;
        const canSell = Math.min(price, agentState.goldAmount);

        agentState.usdAmount += canSell;
        agentState.goldAmount -= canSell / this._exchangeRate;
      }
    }
    
    this._exchangeRate = Math.abs(Math.cos(time * 0.1));
  }
}
