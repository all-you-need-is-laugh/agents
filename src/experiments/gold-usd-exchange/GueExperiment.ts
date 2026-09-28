import { Experiment } from "../../base/Experiment";
import { GueAgent } from "./agents/GueAgent";
import { GueGreedyAgent } from "./agents/GueGreedyAgent";
import { GueNeuralNetworkAgent } from "./agents/GueNeuralNetworkAgent";
import { GueRandomAgent } from "./agents/GueRandomAgent";
import { GueDisplay } from "./display/GueDisplay";
import { GueAction, GueAgentId, GueEnvironment, GueEnvironmentAgentState } from "./GueEnvironment";

export class GueExperiment extends Experiment<
  GueAgentId,
  GueAction,
  GueEnvironmentAgentState
> {
  constructor(htmlContainerElement: HTMLElement) {
    super(htmlContainerElement);
  }

  get LOOP_MAX_ITERATIONS(): number {
    return 1_000;
  }

  protected _constructAgents(): GueAgent[] {
    return [
      new GueRandomAgent('Alice'),
      new GueRandomAgent('Bob'),
      new GueRandomAgent('Carl'),
      new GueGreedyAgent('Dave', 0.4, 0.8),
      new GueGreedyAgent('Erl', 0.59, 0.6),
      new GueNeuralNetworkAgent('Freddy', [3]),
      new GueNeuralNetworkAgent('Geena', [4]),
      new GueNeuralNetworkAgent('Henry', [5]),
    ];
  }
    
  protected _constructEnvironment() {
    return new GueEnvironment();
  }

  protected _constructDisplay(htmlContainerElement: HTMLElement): GueDisplay {
    return new GueDisplay(htmlContainerElement);
  }  
}
