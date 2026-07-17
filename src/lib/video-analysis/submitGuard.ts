// A tiny, framework-free single-flight guard for actions that must never
// run twice concurrently (upload+create, retry). Deliberately not a React
// state value: state updates are asynchronous/batched, so two fast clicks
// in the same event-loop tick can both read the old value before either
// setState call commits. A plain mutable flag has no such window — the
// second call sees the first call's write immediately.
export class SingleFlightGuard {
  private active = false;

  // Returns true and marks the guard active if no action is in flight;
  // returns false (does nothing) if one already is.
  tryStart(): boolean {
    if (this.active) return false;
    this.active = true;
    return true;
  }

  // Marks the guard free again. Safe to call even if never started.
  finish(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }
}
