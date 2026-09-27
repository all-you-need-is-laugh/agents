export interface DisplayContext<TEnvironmentDisplayState> {
  environmentState: TEnvironmentDisplayState;
  time: number;
};

export interface Display<TEnvironmentDisplayState> {
  update(simulationHistory: DisplayContext<TEnvironmentDisplayState>[], forceDrawing?: boolean): void;
}
