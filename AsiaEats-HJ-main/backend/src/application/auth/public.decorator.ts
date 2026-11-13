import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Public marks a route or controller as not requiring a valid access token.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
