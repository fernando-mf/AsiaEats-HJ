import type { AccountRole } from '#domain/reg/index.js';

export type ExecutionActor = Readonly<{
  id: string;
  role: AccountRole;
}>;
