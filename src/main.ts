import { Display } from "./Display";
import { Agent, Environment } from "./Environment";
import { GreedyAgent } from "./GreedyAgent";
import { RandomAgent } from "./RandomAgent";
import { loop } from "./utils/loop";

const contentElement = document.querySelector<HTMLDivElement>('#app');

if (!contentElement) {
  throw new Error('Content element not found');
}

const display = new Display(contentElement);
const environment = new Environment();
const agents: Agent[] = [
  new RandomAgent('Alice'),
  new RandomAgent('Bob'),
  new RandomAgent('Carl'),
  new GreedyAgent('Dave'),
  new GreedyAgent('Erl', 0.49, 0.51),
];

for (const agent of agents) {
  environment.addAgent(agent.id);
}

loop((time: number) => {
  for (const agent of agents) {
    const state = environment.getStateFor(agent.id);
    const action = agent.getAction(state);
    environment.addActionIntent(agent.id, action);
  }

  environment.update(time);

  const environmentState = environment.getDisplayState();

  display.update({ time, environmentState });

  // feedback can be provided here

  return time < 1000; // Return true to continue the loop, false to stop
});
