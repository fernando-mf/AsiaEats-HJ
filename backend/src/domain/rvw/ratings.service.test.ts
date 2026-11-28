import { describe, expect, it, vi } from 'vitest';
import { InvalidParamsError } from '#domain/errors.js';
import { Rating, RatingRequest } from './ratings.models.js';
import { type RatingRepository, RatingsService } from './ratings.service.js';

const order = { id: 'order-1', restaurantId: 'restaurant-1', courierId: 'courier-1' };

function newService() {
  const repository = {
    create: vi.fn(async (rating: Rating) => ({ ...rating, id: 'rating-1' })),
    findByOrder: vi.fn(),
  } as unknown as RatingRepository;
  return { repository, service: new RatingsService(repository) };
}

const request = (restaurantRating: unknown, courierRating: unknown) =>
  RatingRequest.initialize({ restaurantRating, courierRating } as RatingRequest);

describe('RatingsService.record', () => {
  it('stores the scores with the order, restaurant and courier', async () => {
    const { repository, service } = newService();

    const rating = await service.record(order, request(5, 3));

    expect(rating).toMatchObject({
      id: 'rating-1',
      orderId: 'order-1',
      restaurantId: 'restaurant-1',
      courierId: 'courier-1',
      restaurantRating: 5,
      courierRating: 3,
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it.each([1, 5])('accepts the bound %i', async score => {
    const { service } = newService();

    await expect(service.record(order, request(score, score))).resolves.toMatchObject({ restaurantRating: score });
  });

  it.each([0, 6, -1, 3.5, '4', null, undefined, NaN])('refuses the score %s and stores nothing', async score => {
    const { repository, service } = newService();

    await expect(service.record(order, request(score, 4))).rejects.toBeInstanceOf(InvalidParamsError);
    await expect(service.record(order, request(4, score))).rejects.toBeInstanceOf(InvalidParamsError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('names the invalid field', async () => {
    const { service } = newService();

    await expect(service.record(order, request(9, 4))).rejects.toMatchObject({
      errors: [{ field: 'restaurantRating' }],
    });
  });
});
