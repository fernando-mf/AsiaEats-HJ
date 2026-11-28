import type { Actor } from '#domain/reg/index.js';
import type { Rating, RatingRequest, RatingsService } from '#domain/rvw/index.js';
import type { Command } from '#application/commands/command.js';

export class RateOrderCommand implements Command<Rating> {
  readonly name = 'RateOrderCommand';

  constructor(
    private readonly ratingsService: RatingsService,
    private readonly actor: Actor,
    private readonly orderId: string,
    private readonly request: RatingRequest,
  ) {}

  execute(): Promise<Rating> {
    return this.ratingsService.rate(this.actor, this.orderId, this.request);
  }
}
