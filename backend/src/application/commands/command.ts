export interface Command<TResult> {
  readonly name: string;
  // readOnly marks a query: it changes no state and publishes no events, so it has nothing to
  // keep together and runs outside a transaction.
  readonly readOnly?: boolean;
  execute(): Promise<TResult>;
}
