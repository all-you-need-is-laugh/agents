import { NeuralNetwork } from "../../../base/NeuralNetwork";
import { GueAction, GueEnvironmentAgentState } from "../GueEnvironment";
import { GueAgent } from "./GueAgent";

export class GueNeuralNetworkAgent implements GueAgent {
  public readonly id: string;
  private _neuralNetwork: NeuralNetwork;

  private _neuralNetworkInputSize = 5;
  private _neuralNetworkOutputSize = 3;

  constructor(name: string, neuralNetworkInternalLayerSizes: number[]) {
    this.id = `${name} (nn: ${neuralNetworkInternalLayerSizes.join('-') || '0'})`;

    this._neuralNetwork = NeuralNetwork.fromRandom(
      this._neuralNetworkInputSize,
      this._neuralNetworkOutputSize,
      neuralNetworkInternalLayerSizes
    );
  }

  getAction(time: number, state: GueEnvironmentAgentState): GueAction {
    const input = this._encodeInputForNeuralNetwork(time, state);
    const output = this._neuralNetwork.execute(input);
    return this._decodeOutputFromNeuralNetwork(time, state, output);
  }

  private _encodeInputForNeuralNetwork(time: number, state: GueEnvironmentAgentState): number[] {
    return [time, state.buyRate, state.sellRate, state.goldAmount, state.usdAmount];
  }

  private _decodeOutputFromNeuralNetwork(time: number, state: GueEnvironmentAgentState, output: number[]): GueAction {
    const normalizedProbabilities = this._normalizeProbabilities([output[0], output[1]]);
    const [buyProbability] = normalizedProbabilities;
    const shouldBuy = Math.random() < buyProbability;
    
    if (shouldBuy) {
      return {
        buyGoldAmount: Math.min(Math.max(0.01, state.usdAmount * output[2] / state.buyRate), 100)
      }
    }

    return {
        buyGoldAmount: - Math.min(Math.max(0.01, state.goldAmount * output[2]), 100)
      }
  }

  private _normalizeProbabilities(output: number[]): number[] {
    const sum = output.reduce((result, current) => result + current ** 2, 0);
    return output.map(value => value ** 2 / sum);
  }
}
