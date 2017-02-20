'use strict';

class TickCounter {
  constructor(max) {
    this.ticks = 0;
    this.max = max;

    this.countTicks();
  }

  countTicks() {
    setImmediate(() => {
      this.ticks += 1;
      if (this.max > this.ticks) {
        this.countTicks();
      }
    });
  }
}

module.exports = TickCounter;
