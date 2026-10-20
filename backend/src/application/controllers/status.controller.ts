import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';

@Public()
@Controller('status')
export class StatusController {
  @Get()
  getStatus() {
    return {
      status: 'ok',
      datetime: new Date().toISOString(),
    };
  }
}
