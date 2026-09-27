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
  buyGoldAmount: number
};

export interface EnvironmentDisplayState {
  buyRate: number;
  sellRate: number;
  agents: {
    id: AgentId;
    goldAmount: number;
    usdAmount: number;
    capital: number;
    intentAction: Action | null;
    appliedAction: Action | null;
  }[];
}

export class Environment {
  private _agentActionIntents = new Map<AgentId, Action>();
  private _lastAgentActionIntents = new Map<AgentId, Action>();
  private _lastAgentAppliedActions = new Map<AgentId, Action>();
  private _agentStates: AgentState[] = [];
  private _exchangeRateRandomOffset = Date.now();

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
        intentAction: this._lastAgentActionIntents.get(s.id) ?? null,
        appliedAction: this._lastAgentAppliedActions.get(s.id) ?? null,
      }))
    };
  }

  addActionIntent(agentId: AgentId, action: Action) {
    this._agentActionIntents.set(agentId, action);
  }

  private _toMoney(input: number): number {
    return Number(input.toFixed(2));
  }

  update (time: number) {
    this._lastAgentAppliedActions = new Map();

    for (const [agentId, action] of this._agentActionIntents.entries()) {
      const agentState = this._getAgentState(agentId);

      if (action.buyGoldAmount > 0) {
        const price = Math.min(action.buyGoldAmount, this._transactionAmountLimit) * this._buyRate;
        const canSpendUsd = Math.min(price, agentState.usdAmount);
        const canBuyGoldAmoount = canSpendUsd / this._buyRate;

        agentState.usdAmount = this._toMoney(agentState.usdAmount - canSpendUsd);
        agentState.goldAmount += canBuyGoldAmoount;

        this._lastAgentAppliedActions.set(agentId, {
          buyGoldAmount: canBuyGoldAmoount
        });

        continue;
      }
      
      if (action.buyGoldAmount < 0) {
        const canSellGold = Math.min(Math.abs(action.buyGoldAmount), agentState.goldAmount, this._transactionAmountLimit);
        
        agentState.usdAmount = this._toMoney(agentState.usdAmount + canSellGold * this._sellRate);
        agentState.goldAmount -= canSellGold;

        this._lastAgentAppliedActions.set(agentId, {
          buyGoldAmount: -canSellGold
        });

        continue;
      }

      this._lastAgentAppliedActions.set(agentId, {
        buyGoldAmount: 0
      });
    }
    
    const rateSeed = time + this._exchangeRateRandomOffset;
    this._exchangeRate = Math.cos(rateSeed * 0.05) / 2 + 0.5 + (Math.random() * 2 - 1) * 0.1;
    // this._exchangeRate = Math.cos(time * 0.5) / 2 + 0.5 + (Math.random() * 2 - 1) * 0.1;
    this._buyDeviation = 0.01 + Math.random() * 0.5;
    this._sellDeviation = 0.01 + Math.random() * 0.5;

    this._lastAgentActionIntents = new Map(this._agentActionIntents);
    this._agentActionIntents.clear();
  }
}
