export interface DisplayContext<TEnvironmentDisplayState> {
  environmentState: TEnvironmentDisplayState;
  time: number;
};

export interface Display<TEnvironmentDisplayState> {
  // property syntax (not method) so implementations cannot narrow the parameter type
  update: (simulationHistory: DisplayContext<TEnvironmentDisplayState>[], forceDrawing?: boolean) => void;
}
