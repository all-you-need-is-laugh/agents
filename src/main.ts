import { GreedyAgent } from "./agents/GreedyAgent";
import { NeuralNetworkAgent } from "./agents/NeuralNetworkAgent";
import { RandomAgent } from "./agents/RandomAgent";
import { Display, DisplayContext } from "./Display";
import { Agent, Environment } from "./Environment";
import { loop } from "./utils/loop";

const contentElement = document.querySelector<HTMLDivElement>('#app');
const chartElement = document.querySelector<HTMLDivElement>('#charts');

if (!contentElement) {
  throw new Error('Content element not found');
}

if (!chartElement) {
  throw new Error('Chart element not found');
}

const display = new Display(contentElement, chartElement);
const environment = new Environment();
const agents: Agent[] = [
  new RandomAgent('Alice'),
  new RandomAgent('Bob'),
  new RandomAgent('Carl'),
  new GreedyAgent('Dave', 0.4, 0.8),
  new GreedyAgent('Erl', 0.59, 0.6),
  new NeuralNetworkAgent('Freddy', [3]),
  new NeuralNetworkAgent('Geena', [4]),
  new NeuralNetworkAgent('Henry', [5]),
];

for (const agent of agents) {
  environment.addAgent(agent.id);
}

const simulationHistory: DisplayContext[] = [];

loop((time: number) => {
  for (const agent of agents) {
    const state = environment.getStateFor(agent.id);
    const action = agent.getAction(time, state);
    environment.addActionIntent(agent.id, action);
  }

  environment.update(time);

  const environmentState = environment.getDisplayState();

  simulationHistory.push({ time, environmentState });
  display.update(simulationHistory);

  // feedback can be provided here

  return time < 1000; // Return true to continue the loop, false to stop
});
