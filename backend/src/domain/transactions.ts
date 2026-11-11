// TransactionRunner runs a unit of work atomically: every write made inside `run`, including
// the events it publishes, is committed together, or none is if the work throws. This keeps a
// state change and its recorded event (R-ORD-05) from ever coming apart.
//
// It is a port like the repositories: the domain and application layers depend on this
// abstraction, and the infrastructure layer provides the database implementation.
export abstract class TransactionRunner {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
