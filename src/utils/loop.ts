type Executable = () => boolean;
type Scheduler = (execFn: Executable) => void;

const rafScheduler: Scheduler = (execFn: Executable) => {
  if (execFn()) {
    requestAnimationFrame(() => rafScheduler(execFn));
  }
};

const timerScheduler: Scheduler = (execFn: Executable) => {
  if (execFn()) {
    setTimeout(() => timerScheduler(execFn), 1000);
  }
};

export function loop(iterationFn: (time: number) => boolean): void {
  let time = 0;

  const executable: Executable = () => {
    return iterationFn(time++);
  }

  rafScheduler(executable);
  // timerScheduler(executable);
}
