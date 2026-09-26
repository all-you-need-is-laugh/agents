export type AgentId = string;

export interface Agent {
  id: AgentId;
  getAction(state: EnvironmentAgentState): Action;
}

interface AgentState {
  id: AgentId;
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
    id: AgentId;
    goldAmount: number;
    usdAmount: number;
    capital: number;
  }[];
}

export class Environment {
  private _agentActions = new Map<AgentId, Action>();
  private _agentStates: AgentState[] = [];

  private _exchangeRate = 1;

  addAgent(agentId: AgentId) {
    this._agentStates.push({
      id: agentId,
      goldAmount: 0,    // Initial amount in gold
      usdAmount: 1000,  // Initial amount in USD
    });
  }

  private _getAgentState(agentId: AgentId): AgentState {
    const agentState = this._agentStates.find((s) => s.id === agentId);
    if (!agentState) {
      throw new Error(`Agent state not found for ${agentId}`);
    }

    return agentState;
  }

  getStateFor(agentId: AgentId): EnvironmentAgentState {
    const agentState = this._getAgentState(agentId);

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
        id: s.id,
        goldAmount: s.goldAmount,
        usdAmount: s.usdAmount,
        capital: s.usdAmount + s.goldAmount * this._exchangeRate
      }))
    };
  }

  addActionIntent(agentId: AgentId, action: Action) {
    this._agentActions.set(agentId, action);
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
