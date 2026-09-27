export interface Agent<TAgentId, TAction, TEnvironmentAgentState> {
  id: TAgentId;
  getAction(time: number, state: TEnvironmentAgentState): TAction;
}

interface AgentState<TAgentId> {
  id: TAgentId;
}

export interface EnvironmentDisplayState<TAgentId, TAction> {
  agents: {
    id: TAgentId;
    intentAction: TAction | null;
    appliedAction: TAction | null;
  }[];
}

export abstract class Environment<
  TAgentId,
  TAction,
  TEnvironmentAgentState,
  TEnvironmentDisplayState extends EnvironmentDisplayState<TAgentId, TAction> = EnvironmentDisplayState<TAgentId, TAction>,
  TAgentState extends AgentState<TAgentId> = AgentState<TAgentId>,
  TAgent extends Agent<TAgentId, TAction, TEnvironmentAgentState> = Agent<TAgentId, TAction, TEnvironmentAgentState>,
> {
  
  protected _agentActionIntents = new Map<TAgentId, TAction>();
  protected _lastAgentActionIntents = new Map<TAgentId, TAction>();
  protected _lastAgentAppliedActions = new Map<TAgentId, TAction>();
  protected _agentStates: TAgentState[] = [];

  abstract getStateFor(agentId: TAgentId): TEnvironmentAgentState;
  abstract getDisplayState(): TEnvironmentDisplayState;
  protected abstract _generateStartingAgentState (agent: TAgent): TAgentState;
  protected abstract _convertAgentIntentToAllowedAction(agentId: TAgentId, action: TAction, agentState: TAgentState): TAction;

  addAgent(agent: TAgent) {
    this._agentStates.push(
      this._generateStartingAgentState(agent)
    );
  }

  addActionIntent(agentId: TAgentId, action: TAction) {
    this._agentActionIntents.set(agentId, action);
  }

  protected _getAgentState(agentId: TAgentId): TAgentState {
    const agentState = this._agentStates.find((s) => s.id === agentId);
    if (!agentState) {
      throw new Error(`Agent state not found for ${agentId}`);
    }

    return agentState;
  }

  update (_time: number) {
    this._lastAgentAppliedActions = new Map();

    for (const [agentId, action] of this._agentActionIntents.entries()) {
      const agentState = this._getAgentState(agentId);

      const allowedAction = this._convertAgentIntentToAllowedAction(agentId, action, agentState);

      this._lastAgentAppliedActions.set(agentId, allowedAction);
    }

    this._lastAgentActionIntents = new Map(this._agentActionIntents);
    this._agentActionIntents.clear();
  }
}
