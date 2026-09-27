export type Executable = () => boolean;
export type Scheduler = (execFn: Executable) => void;

export const rafScheduler: Scheduler = (execFn: Executable) => {
  if (execFn()) {
    requestAnimationFrame(() => rafScheduler(execFn));
  }
};

export const timerScheduler: Scheduler = (execFn: Executable) => {
  if (execFn()) {
    setTimeout(() => timerScheduler(execFn), 1000);
  }
};
