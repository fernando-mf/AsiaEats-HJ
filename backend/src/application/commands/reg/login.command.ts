import type { JwtService } from '@nestjs/jwt';
import type { Account, AccountsService, LoginRequest } from '#domain/reg/index.js';
import type { Command } from '../command.js';

export type LoginResult = { accessToken: string; account: Account };

export class LoginCommand implements Command<LoginResult> {
  readonly name = 'LoginCommand';

  constructor(
    private readonly accountsService: AccountsService,
    private readonly jwt: JwtService,
    private readonly request: LoginRequest,
  ) {}

  async execute(): Promise<LoginResult> {
    const account = await this.accountsService.login(this.request);
    const accessToken = await this.jwt.signAsync({ sub: account.id, role: account.role });
    return { accessToken, account };
  }
}
