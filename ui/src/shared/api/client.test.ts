import { describe, expect, it } from 'vitest';
import { ApiError, apiErrorMessage } from './client';

describe('apiErrorMessage', () => {
  it('handles forbidden errors', () => {
    expect(apiErrorMessage(new ApiError(403, { code: 'forbidden' })))
      .toBe('Your account role is not allowed to perform that command.');
  });

  it('handles unauthenticated errors', () => {
    expect(apiErrorMessage(new ApiError(401, { code: 'unauthenticated' })))
      .toBe('Your session is missing or expired. Please sign in again.');
  });

  it('uses the entity label for not found errors', () => {
    expect(apiErrorMessage(new ApiError(404, {
      code: 'not_found',
      entityType: 'order',
    }))).toBe('Order not found.');
  });

  it('uses a general message for unknown entities', () => {
    expect(apiErrorMessage(new ApiError(404, { code: 'not_found' })))
      .toBe('The requested resource was not found.');
  });

  it('handles duplicate entities', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'duplicate_entity',
      entityType: 'restaurant',
    }))).toBe('Restaurant already exists.');
  });

  it('handles restaurant not open errors', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'restaurant_not_open',
      restaurantStatus: 'temporarily_closed',
    }))).toBe('Restaurant is temporarily closed and is not accepting orders.');
  });

  it('handles restaurant not open errors without a status', () => {
    expect(apiErrorMessage(new ApiError(409, { code: 'restaurant_not_open' })))
      .toBe('Restaurant is not accepting orders.');
  });

  it('handles sold out menu items', () => {
    expect(apiErrorMessage(new ApiError(409, { code: 'menu_item_sold_out' })))
      .toBe('An item in your order is sold out.');
  });

  it('handles menu items not in the menu', () => {
    expect(apiErrorMessage(new ApiError(400, { code: 'menu_item_not_in_menu' })))
      .toBe("An item is not on this restaurant's menu.");
  });

  it('uses the conflict reason when available', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'conflict',
      reason: 'order is already closed',
    }))).toBe('Order is already closed.');
  });

  it('uses a default conflict message when no reason is available', () => {
    expect(apiErrorMessage(new ApiError(409, { code: 'conflict' })))
      .toBe('That command is not valid for the current order state.');
  });

  it('handles invalid order transitions', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'invalid_order_transition',
      from: 'preparing',
      to: 'delivered',
    }))).toBe('Cannot move this order from preparing to delivered.');
  });

  it('handles invalid courier transitions when carrying an order', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'invalid_courier_transition',
      from: 'carrying',
      to: 'offline',
    }))).toBe('You cannot go off duty while carrying an order. Deliver it first.');
  });

  it('handles other invalid courier transitions', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'invalid_courier_transition',
      from: 'idle',
      to: 'carrying',
    }))).toBe('Cannot change your courier status from idle to carrying.');
  });

  it('handles invalid assignment transitions', () => {
    expect(apiErrorMessage(new ApiError(409, {
      code: 'invalid_assignment_transition',
    }))).toBe('This delivery offer can no longer be answered. It may have been withdrawn.');
  });

  it('handles invalid parameters and limits the messages to three', () => {
    expect(apiErrorMessage(new ApiError(400, {
      code: 'invalid_params',
      errors: [
        { messages: ['First error', 'Second error'] },
        { messages: ['Third error', 'Fourth error'] },
      ],
    }))).toBe('Some of the submitted data is invalid: First error; Second error; Third error.');
  });

  it('uses a default message when invalid parameters have no details', () => {
    expect(apiErrorMessage(new ApiError(400, { code: 'invalid_params' })))
      .toBe('Some of the submitted data is invalid.');
  });

  it('handles internal errors', () => {
    expect(apiErrorMessage(new ApiError(500, { code: 'internal' })))
      .toBe('Something went wrong on the server. Please try again.');
  });

  it('uses the original message for unknown API error codes', () => {
    expect(apiErrorMessage(new ApiError(400, {
      code: 'unknown_code',
      reason: 'Something unexpected happened',
    }))).toBe('Something unexpected happened');
  });

  it('handles regular Error objects', () => {
    expect(apiErrorMessage(new Error('Regular error')))
      .toBe('Regular error');
  });

  it('handles unknown error values', () => {
    expect(apiErrorMessage('unexpected'))
      .toBe('An unexpected error occurred.');
  });
});
