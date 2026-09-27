import { Action, Agent, EnvironmentAgentState } from "./Environment";
import { NeuralNetwork } from "./NeuralNetwork";

export class NeuralNetworkAgent implements Agent {
  public readonly id: string;
  private _neuralNetwork: NeuralNetwork;

  private _neuralNetworkInputSize = 4;
  private _neuralNetworkOutputSize = 3;

  constructor(name: string, neuralNetworkInternalLayerSizes: number[]) {
    this.id = `${name} (nn: ${neuralNetworkInternalLayerSizes.join('-') || '0'})`;

    this._neuralNetwork = NeuralNetwork.fromRandom(
      this._neuralNetworkInputSize,
      this._neuralNetworkOutputSize,
      neuralNetworkInternalLayerSizes
    );
  }

  getAction(time: number, state: EnvironmentAgentState): Action {
    const input = this._encodeInputForNeuralNetwork(time, state);
    const output = this._neuralNetwork.execute(input);
    return this._decodeOutputFromNeuralNetwork(time, state, output);
  }

  private _encodeInputForNeuralNetwork(time: number, state: EnvironmentAgentState): number[] {
    return [time, state.exchangeRate, state.goldAmount, state.usdAmount];
  }

  private _decodeOutputFromNeuralNetwork(time: number, state: EnvironmentAgentState, output: number[]): Action {
    const normalizedProbabilities = this._normalizeProbabilities([output[0], output[1]]);
    const [buyProbability] = normalizedProbabilities;
    const shouldBuy = Math.random() < buyProbability;
    
    if (shouldBuy) {
      return {
        buy: Math.max(0.01, state.usdAmount * output[2] / state.exchangeRate)
      }
    }

    return {
        buy: - Math.max(0.01, state.goldAmount * output[2])
      }
  }

  private _normalizeProbabilities(output: number[]): number[] {
    const sum = output.reduce((result, current) => result + current ** 2, 0);
    return output.map(value => value ** 2 / sum);
  }
}
