import { plainToInstance } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class RatingRequest {
  @IsInt()
  @Min(1)
  @Max(5)
  restaurantRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  courierRating: number;

  static initialize(raw: RatingRequest): RatingRequest {
    return plainToInstance(RatingRequest, raw);
  }
}

export class Rating {
  id: string;
  orderId: string;
  restaurantId: string;
  courierId: string;
  restaurantRating: number;
  courierRating: number;
  createdAt: Date;
}
