import { GreedyAgent } from "./agents/GreedyAgent";
import { RandomAgent } from "./agents/RandomAgent";
import { Display } from "./Display";
import { Agent, Environment } from "./Environment";
import { NeuralNetworkAgent } from "./NeuralNetworkAgent";
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
  new GreedyAgent('Dave', 0.5, 1.5),
  new GreedyAgent('Erl', 0.99, 1),
  new NeuralNetworkAgent('Freddy', [3]),
  new NeuralNetworkAgent('Geena', [4]),
  new NeuralNetworkAgent('Henry', [5]),
];

for (const agent of agents) {
  environment.addAgent(agent.id);
}

loop((time: number) => {
  for (const agent of agents) {
    const state = environment.getStateFor(agent.id);
    const action = agent.getAction(time, state);
    environment.addActionIntent(agent.id, action);
  }

  environment.update(time);

  const environmentState = environment.getDisplayState();

  display.update({ time, environmentState });

  // feedback can be provided here

  return time < 100; // Return true to continue the loop, false to stop
});
