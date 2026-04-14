import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile, // ✅ added
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express'; // ✅ added

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/rbac/roles.guard';
import { Roles } from '../../auth/rbac/roles.decorator';
import { Role } from '../../auth/rbac/roles.enum';

import { Audit } from '../admin/audit.decorator';
import { AuditInterceptor } from '../admin/audit.interceptor';

import { ElectionManagementService } from './election-management.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { SetElectionStatusDto } from './dto/set-election-status.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ElectionManagementController {
  constructor(private readonly svc: ElectionManagementService) {}

  @Get('elections')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  listElections(@Query('status') status?: string, @Query('q') q?: string) {
    return this.svc.listElections({ status, q });
  }

  @Get('elections/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getElection(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getElectionById(id);
  }

  @Post('elections')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Audit('CREATE_POLL', 'POLL')
  createElection(@Body() dto: CreateElectionDto) {
    return this.svc.createElection(dto);
  }

  @Patch('elections/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Audit('UPDATE_POLL', 'POLL')
  updateElection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateElectionDto,
  ) {
    return this.svc.updateElection(id, dto);
  }

  @Patch('elections/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Audit('UPDATE_POLL_STATUS', 'POLL')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetElectionStatusDto,
  ) {
    return this.svc.setElectionStatus(id, dto.status);
  }

  @Delete('elections/:id')
  @Roles(Role.SUPER_ADMIN)
  @Audit('DISABLE_POLL', 'POLL')
  disableElection(@Param('id', ParseIntPipe) id: number) {
    return this.svc.disableElection(id);
  }

  @Get('elections/:id/candidates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  listCandidates(@Param('id', ParseIntPipe) electionId: number) {
    return this.svc.listCandidatesForElection(electionId);
  }

  // ✅ FIXED: supports FormData + file upload
  @Post('elections/:id/candidates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Audit('ADD_NOMINEE', 'NOMINEE')
  @UseInterceptors(FileInterceptor('image'))
  createCandidate(
    @Param('id', ParseIntPipe) electionId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateCandidateDto,
  ) {
    return this.svc.createCandidate(electionId, {
      ...dto,
      file,
    });
  }

  // ✅ FIXED: supports FormData + file upload
  @Patch('candidates/:candidateId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Audit('UPDATE_NOMINEE', 'NOMINEE')
  @UseInterceptors(FileInterceptor('image'))
  updateCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.svc.updateCandidate(candidateId, {
      ...dto,
      file,
    });
  }

  @Delete('candidates/:candidateId')
  @Roles(Role.SUPER_ADMIN)
  @Audit('DELETE_NOMINEE', 'NOMINEE')
  deleteCandidate(@Param('candidateId', ParseIntPipe) candidateId: number) {
    return this.svc.deleteCandidate(candidateId);
  }
}