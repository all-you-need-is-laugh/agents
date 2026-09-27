import { GueExperiment } from "./experiments/gold-usd-exchange/GueExperiment";

const rootElement = document.querySelector<HTMLDivElement>('#app');

if (!rootElement) {
  throw new Error('Root element not found');
}

const experiment = new GueExperiment(rootElement);

experiment.run();
