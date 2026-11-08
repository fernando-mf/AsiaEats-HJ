import { AccountsClient } from './accounts.client.ts';
import { HttpClient } from './api.ts';

export class Client {
  private readonly http = new HttpClient();

  readonly accounts = new AccountsClient(this.http);
}
