import type { LedgerEntry, LedgerService } from '#domain/prc/index.js';
import type { Command } from '#application/commands/command.js';

export class ListLedgerCommand implements Command<LedgerEntry[]> {
  readonly name = 'ListLedgerCommand';
  readonly readOnly = true;

  constructor(private readonly ledgerService: LedgerService) {}

  execute(): Promise<LedgerEntry[]> {
    return this.ledgerService.list();
  }
}
