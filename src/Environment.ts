export type AgentId = string;

export interface Agent {
  id: AgentId;
  getAction(time: number, state: EnvironmentAgentState): Action;
}

interface AgentState {
  id: AgentId;
  goldAmount: number;
  usdAmount: number;
}

export interface EnvironmentAgentState {
  buyRate: number;
  sellRate: number;
  goldAmount: number;
  usdAmount: number;
}

export type Action = {
  buy: number
};

export interface EnvironmentDisplayState {
  buyRate: number;
  sellRate: number;
  agents: {
    id: AgentId;
    goldAmount: number;
    usdAmount: number;
    capital: number;
    action: Action | null;
  }[];
}

export class Environment {
  private _agentActions = new Map<AgentId, Action>();
  private _lastAgentActions = new Map<AgentId, Action>();
  private _agentStates: AgentState[] = [];

  private _exchangeRate = 1;
  private _buyDeviation = 0.1;
  private _sellDeviation = 0.1;

  private _transactionAmountLimit = 100;

  private get _buyRate(): number {
    return Math.max(0.0001, this._exchangeRate + this._buyDeviation);
  }

  private get _sellRate(): number {
    return Math.max(0.0001, this._exchangeRate - this._sellDeviation);
  }

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
      buyRate: this._buyRate,
      sellRate: this._sellRate,
      goldAmount: agentState.goldAmount,
      usdAmount: agentState.usdAmount,
    };
  }

  getDisplayState(): EnvironmentDisplayState {
    // Return the current state of the environment for display purposes
    return {
      buyRate: this._buyRate,
      sellRate: this._sellRate,
      agents: this._agentStates.map((s) => ({
        id: s.id,
        goldAmount: s.goldAmount,
        usdAmount: s.usdAmount,
        capital: s.usdAmount + s.goldAmount * this._sellRate,
        action: this._lastAgentActions.get(s.id) ?? null,
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
        const price = Math.min(action.buy, this._transactionAmountLimit) * this._buyRate;
        const canSpend = Math.min(price, agentState.usdAmount);

        agentState.usdAmount -= canSpend;
        agentState.goldAmount += canSpend / this._buyRate;
      } else if (action.buy < 0) {
        const price = Math.min(Math.abs(action.buy), this._transactionAmountLimit) * this._sellRate;
        const canSell = Math.min(price, agentState.goldAmount);

        agentState.usdAmount += canSell;
        agentState.goldAmount -= canSell / this._sellRate;
      }
    }
    
    // this._exchangeRate = Math.cos(time * Math.abs(Math.sin(time * 0.01)) * 0.025) / 2 + 0.5 + (Math.random() * 2 - 1) * 0.1;
    this._exchangeRate = Math.cos(time * 0.5) / 2 + 0.5 + (Math.random() * 2 - 1) * 0.1;
    this._buyDeviation = 0.01 + Math.random() * 0.5;
    this._sellDeviation = 0.01 + Math.random() * 0.5;

    this._lastAgentActions = new Map(this._agentActions);
    this._agentActions.clear();
  }
}
