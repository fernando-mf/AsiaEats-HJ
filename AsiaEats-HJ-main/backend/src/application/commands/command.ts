export interface Command<TResult> {
  readonly name: string;
  execute(): Promise<TResult>;
}
