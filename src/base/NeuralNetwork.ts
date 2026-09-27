export interface NeuralLink {
  bias: number
  weight: number;
}

export interface NeuralCell {
  links: NeuralLink[]
}

export type NeuralLayer = NeuralCell[];

export class NeuralNetwork {
  constructor(
    private _inputSize: number,
    private _outputSize: number,
    private _layers: NeuralLayer[]
  ) {
    this._validateLayers();
  }

  execute(input: number[]): number[] {
    if (input.length !== this._inputSize) {
      throw new Error(`${NeuralNetwork.name} input must have ${this._inputSize} elements, but ${input.length} passed!`);
    }

    let currentInput: number[] = input;
    let currentOutput: number[] = [];

    for (const layer of this._layers) {
      currentOutput = [];

      for (const [cellIndex, cell] of layer.entries()) {
        let accumulator = 0;
        
        for (const [cellLinkIndex, cellLink] of cell.links.entries()) {
          accumulator += cellLink.bias + cellLink.weight * currentInput[cellLinkIndex];
        }
        
        currentOutput[cellIndex] = this._activate(accumulator);
      }
      
      currentInput = currentOutput;
    }

    return currentOutput;
  }

  protected _activate(x: number): number {
    return 1 / (1 + Math.E ** (-x / 8));
  }

  private _validateLayers(): void {
    if (this._layers.length < 1) {
      throw new Error(`${NeuralNetwork.name} must have at least 1 layer, but has only ${this._layers.length}!`);
    }

    let prevLayerSize = this._inputSize;

    for (const [layerIndex, layer] of this._layers.entries()) {
      for (const [cellIndex, cell] of layer.entries()) {
        if (cell.links.length !== prevLayerSize) {
          throw new Error(`${NeuralNetwork.name} cell ${cellIndex} in layer ${layerIndex} must have ${prevLayerSize} links, but has only ${cell.links.length}!`);
        }
      }

      prevLayerSize = layer.length;
    }

    if (prevLayerSize !== this._outputSize) {
      throw new Error(`${NeuralNetwork.name} output must have ${this._outputSize} elements, but ${prevLayerSize} will be generated!`);
    }
  }

  static fromRandom(inputSize: number, outputSize: number, internalLayerSizes: number[]): NeuralNetwork {
    const layers: NeuralLayer[] = [];

    let prevLayerSize = inputSize;
    for (let layerIndex = 0, allLayersCount = internalLayerSizes.length; layerIndex < allLayersCount; layerIndex++) {
      layers.push(
        this._generateRandomNeuralLayer(prevLayerSize, internalLayerSizes[layerIndex])
      );

      prevLayerSize = internalLayerSizes[layerIndex];
    }

    layers.push(
      this._generateRandomNeuralLayer(prevLayerSize, outputSize)
    );

    return new NeuralNetwork(inputSize, outputSize, layers);
  }

  private static _generateRandomNeuralLayer(inputSize: number, outputSize: number): NeuralLayer {
    const cells: NeuralCell[] = Array.from({ length: outputSize }, _ => {
      const cellLinks: NeuralLink[] = Array.from({ length: inputSize }, _ => ({
        bias: (Math.random() * 2 - 1) * 10,
        weight: (Math.random() * 2 - 1) * 10,
      }));

      return { links: cellLinks };
    });

    return cells;
  }
}
