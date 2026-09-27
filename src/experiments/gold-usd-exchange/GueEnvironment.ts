import { Agent, Environment } from "../../base/Environment";

export type GueAgentId = string;

export type GueAction = {
  buyGoldAmount: number
};

interface GueAgentState {
  id: GueAgentId;
  goldAmount: number;
  usdAmount: number;
}

export interface GueEnvironmentAgentState {
  buyRate: number;
  sellRate: number;
  goldAmount: number;
  usdAmount: number;
}


export interface GueEnvironmentDisplayState {
  buyRate: number;
  sellRate: number;
  agents: {
    id: GueAgentId;
    goldAmount: number;
    usdAmount: number;
    capital: number;
    intentAction: GueAction | null;
    appliedAction: GueAction | null;
  }[];
}

export class GueEnvironment extends Environment<
  GueAgentId,
  GueAction,
  GueEnvironmentAgentState,
  GueEnvironmentDisplayState,
  GueAgentState
> {
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

  getStateFor(agentId: GueAgentId): GueEnvironmentAgentState {
    const agentState = this._getAgentState(agentId);

    return {
      buyRate: this._buyRate,
      sellRate: this._sellRate,
      goldAmount: agentState.goldAmount,
      usdAmount: agentState.usdAmount,
    };
  }

  getDisplayState(): GueEnvironmentDisplayState {
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

  protected _generateStartingAgentState(agent: Agent<GueAgentId, GueAction, GueEnvironmentAgentState>): GueAgentState {
    return {
      id: agent.id,
      goldAmount: 0,
      usdAmount: 1000
    }
  }

  protected _convertAgentIntentToAllowedAction(agentId: GueAgentId, action: GueAction, agentState: GueAgentState): GueAction {
    if (action.buyGoldAmount > 0) {
      const price = Math.min(action.buyGoldAmount, this._transactionAmountLimit) * this._buyRate;
      const canSpendUsd = Math.min(price, agentState.usdAmount);
      const canBuyGoldAmoount = canSpendUsd / this._buyRate;

      agentState.usdAmount = this._toMoney(agentState.usdAmount - canSpendUsd);
      agentState.goldAmount += canBuyGoldAmoount;

      return {
        buyGoldAmount: canBuyGoldAmoount
      };
    }
    
    if (action.buyGoldAmount < 0) {
      const canSellGold = Math.min(Math.abs(action.buyGoldAmount), agentState.goldAmount, this._transactionAmountLimit);
      
      agentState.usdAmount = this._toMoney(agentState.usdAmount + canSellGold * this._sellRate);
      agentState.goldAmount -= canSellGold;

      return {
        buyGoldAmount: -canSellGold
      };
    }

    return {
      buyGoldAmount: 0
    };
  }

  addActionIntent(agentId: GueAgentId, action: GueAction) {
    this._agentActionIntents.set(agentId, action);
  }

  private _toMoney(input: number): number {
    return Number(input.toFixed(2));
  }

  update (time: number) {
    super.update(time);
    
    const rateSeed = time + this._exchangeRateRandomOffset;
    this._exchangeRate = Math.cos(rateSeed * 0.05) / 2 + 0.5 + (Math.random() * 2 - 1) * 0.1;
    // this._exchangeRate = Math.cos(time * 0.5) / 2 + 0.5 + (Math.random() * 2 - 1) * 0.1;
    this._buyDeviation = 0.01 + Math.random() * 0.5;
    this._sellDeviation = 0.01 + Math.random() * 0.5;
  }
}
