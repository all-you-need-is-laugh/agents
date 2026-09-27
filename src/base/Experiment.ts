import { Display, DisplayContext } from "./Display";
import { Agent, Environment, EnvironmentDisplayState } from "./Environment";
import { Executable, rafScheduler } from "./schedulers";

export abstract class Experiment<
  TAgentId,
  TAction,
  TEnvironmentAgentState,
  TEnvironmentDisplayState
    extends EnvironmentDisplayState<TAgentId, TAction> = EnvironmentDisplayState<TAgentId, TAction>,
  TEnvironment
    extends Environment<TAgentId, TAction, TEnvironmentAgentState, TEnvironmentDisplayState>
    = Environment<TAgentId, TAction, TEnvironmentAgentState, TEnvironmentDisplayState>,
  TAgent extends Agent<TAgentId, TAction, TEnvironmentAgentState> = Agent<TAgentId, TAction, TEnvironmentAgentState>,
  TDisplay extends Display<TEnvironmentDisplayState>  = Display<TEnvironmentDisplayState> 
> {
  protected _agents: TAgent[];
  protected _display: TDisplay;
  protected _environment: TEnvironment;
  
  constructor (htmlContainerElement: HTMLElement) {
    this._environment = this._constructEnvironment();
    this._display = this._constructDisplay(htmlContainerElement);
    this._agents = this._constructAgents();
  }

  protected abstract _constructAgents(): TAgent[];
  protected abstract _constructEnvironment(): TEnvironment;
  protected abstract _constructDisplay(htmlContainerElement: HTMLElement): TDisplay;
  abstract get LOOP_MAX_ITERATIONS(): number;
  
  protected _init (): void {
    for (const agent of this._agents) {
      this._environment.addAgent(agent);
    }
  }

  run(): void {
    this._init();

    const simulationHistory: DisplayContext<TEnvironmentDisplayState>[] = [];

    this._loop((time: number) => {
      for (const agent of this._agents) {
        const state = this._environment.getStateFor(agent.id);
        const action = agent.getAction(time, state);
        this._environment.addActionIntent(agent.id, action);
      }

      this._environment.update(time);

      const environmentState = this._environment.getDisplayState();

      simulationHistory.push({ time, environmentState });

      const shouldContinue = time < this.LOOP_MAX_ITERATIONS;

      this._display.update(simulationHistory, !shouldContinue);

      // feedback can be provided here

      return shouldContinue;
    });
  }

  private _loop(iterationFn: (time: number) => boolean): void {
    let time = 0;
  
    const executable: Executable = () => {
      return iterationFn(time++);
    }
  
    rafScheduler(executable);
    // timerScheduler(executable);
  }
}
