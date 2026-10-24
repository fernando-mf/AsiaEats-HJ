import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '#application/auth/public.decorator.js';
import { StatusResponse } from '#application/controllers/responses.dto.js';

@ApiTags('status')
@Public()
@Controller('status')
export class StatusController {
  @Get()
  @ApiOperation({ summary: 'Get API status' })
  @ApiOkResponse({ type: StatusResponse })
  getStatus(): StatusResponse {
    return {
      status: 'ok',
      datetime: new Date().toISOString(),
    };
  }
}
