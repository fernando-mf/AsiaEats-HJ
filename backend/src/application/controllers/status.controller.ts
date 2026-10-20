import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '#application/auth/public.decorator.js';
import { StatusResponse } from './responses.dto.js';

@ApiTags('status')
@Public()
@Controller('status')
export class StatusController {
  @Get()
  @ApiOkResponse({ type: StatusResponse })
  getStatus(): StatusResponse {
    return {
      status: 'ok',
      datetime: new Date().toISOString(),
    };
  }
}
