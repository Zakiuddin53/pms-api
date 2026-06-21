import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { PolicyService } from '../services/policy.service';
import { CreatePolicyDto, AssignPolicyDto } from '../dto/policy.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '@/common/types/auth.types';
import { Paginate, PaginatedSwaggerDocs, PaginateQuery } from 'nestjs-paginate';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Policy } from '../entities/policy.entity';
import { POLICY_PAGINATION_CONFIG } from '../config/policy.pagination';

@ApiTags('Policies')
@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new policy template' })
  create(@Body() dto: CreatePolicyDto, @Req() req: { user: JwtPayload }) {
    return this.policyService.create(dto, parseInt(req.user.sub));
  }

  @Get()
  @ApiOperation({ summary: 'Get All Policies' })
  @PaginatedSwaggerDocs(Policy, POLICY_PAGINATION_CONFIG)
  findAll(@Paginate() query: PaginateQuery, @Req() req: { user: JwtPayload }) {
    return this.policyService.paginate(query, parseInt(req.user.sub));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single policy' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: JwtPayload },
  ) {
    return this.policyService.findOne(id, parseInt(req.user.sub));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a policy' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePolicyDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.policyService.update(id, dto, parseInt(req.user.sub));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a policy' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: JwtPayload },
  ) {
    return this.policyService.delete(id, parseInt(req.user.sub));
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a policy to properties' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPolicyDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.policyService.assignToProperties(
      id,
      dto.propertyIds,
      parseInt(req.user.sub),
    );
  }
}
