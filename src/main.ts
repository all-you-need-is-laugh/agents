import { Agent } from "./Agent";
import { Display } from "./Display";
import { Environment } from "./Environment";
import { loop } from "./utils/loop";

const contentElement = document.querySelector<HTMLDivElement>('#app');

if (!contentElement) {
  throw new Error('Content element not found');
}

const display = new Display(contentElement);
const environment = new Environment();
const agents  = [new Agent('Alice'), new Agent('Bob'), new Agent('Carl')];

for (const agent of agents) {
  environment.addAgent(agent.name);
}

loop((time: number) => {
  for (const agent of agents) {
    const state = environment.getStateFor(agent.name);
    const action = agent.getAction(state);
    environment.addActionIntent(agent.name, action);
  }
  
  environment.update(time);

  const environmentState = environment.getDisplayState();
  
  display.update({ time, environmentState });

  // feedback can be provided here

  return time < 1000; // Return true to continue the loop, false to stop
});
