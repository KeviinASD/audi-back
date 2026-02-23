// agent/agent.controller.ts

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { SyncAgentDto } from './dto/sync-agent.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { AgentService } from './agent.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Public()
@ApiTags('Agent')
@ApiSecurity('api-key')
@Controller('agent')
@UseGuards(ApiKeyGuard)
export class AgentController {

  constructor(private readonly agentService: AgentService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Agent data synchronization',
    description: 'Endpoint called by the installed agent on each PC. Sends hardware and software data collected from the machine. Requires a valid API key in the `x-api-key` header.',
  })
  @ApiResponse({ status: 201, description: 'Sync processed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key.' })
  @ApiResponse({ status: 404, description: 'Equipment code not registered in the system.' })
  sync(@Body() dto: SyncAgentDto) {
    console.log("first softwart item: ", dto.software?.items[0]);
    return this.agentService.processSync(dto);
  }
}
