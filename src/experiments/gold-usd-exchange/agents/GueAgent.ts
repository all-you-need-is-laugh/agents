import { Agent } from "../../../base/Environment";
import { GueAction, GueAgentId, GueEnvironmentAgentState } from "../GueEnvironment";

export type GueAgent = Agent<GueAgentId, GueAction, GueEnvironmentAgentState>
