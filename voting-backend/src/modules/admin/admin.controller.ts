import {
  Controller,
  Put,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  Body,
  Param,
  Patch,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { AdminService } from './admin.service';
import { AdminRevenueService } from './admin-revenue.service';
import { AdminExportsService } from './admin-exports.service';
import { Audit } from './audit.decorator';
import { AuditInterceptor } from './audit.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/rbac/roles.decorator';
import { Role } from '../../auth/rbac/roles.enum';
import { RolesGuard } from '../../auth/rbac/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Multer } from 'multer';
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminRevenueService: AdminRevenueService,
    private readonly adminExportsService: AdminExportsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  health() {
    return { ok: true };
  }

  @Get('dashboard/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Get('results/live')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getLiveResults(@Query('electionId', ParseIntPipe) electionId: number) {
    const results = await this.adminService.getLiveResults(electionId);
    return { electionId, results };
  }

  @Get('results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getResults(@Query('electionId', ParseIntPipe) electionId: number) {
    const results = await this.adminService.getLiveResults(electionId);
    return { electionId, results };
  }

  @Get('results/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('EXPORT_RESULTS_SINGLE', 'RESULT')
  async exportResults(
    @Query('electionId', ParseIntPipe) electionId: number,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const fmt = (format || 'csv').toLowerCase();
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const { contentType, filename, buffer } =
      await this.adminExportsService.exportOneElection(
        electionId,
        fmt as 'csv' | 'xlsx' | 'pdf',
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(buffer);
  }

  @Get('results/export-winners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('EXPORT_RESULTS_WINNERS', 'RESULT')
  async exportWinners(@Query('format') format: string, @Res() res: Response) {
    const fmt = (format || 'csv').toLowerCase();
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const { contentType, filename, buffer } =
      await this.adminExportsService.exportWinnersAll(
        fmt as 'csv' | 'xlsx' | 'pdf',
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(buffer);
  }

  @Get('results/export-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('EXPORT_RESULTS_ALL', 'RESULT')
  async exportAllResults(
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const fmt = (format || 'csv').toLowerCase();
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const { contentType, filename, buffer } =
      await this.adminExportsService.exportAllElections(
        fmt as 'csv' | 'xlsx' | 'pdf',
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(buffer);
  }

  @Get('audit/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('EXPORT_AUDIT_LOGS', 'AUDIT')
  async exportAuditLogs(
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const fmt = (format || 'csv').toLowerCase();

    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const { contentType, filename, buffer } =
      await this.adminExportsService.exportAuditLogs(
        fmt as 'csv' | 'xlsx' | 'pdf',
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(buffer);
  }

  @Get('revenue/total')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getTotalRevenue(@Query('electionId', ParseIntPipe) electionId: number) {
    const totalRevenue = await this.adminService.getTotalRevenue(electionId);
    return { electionId, totalRevenue };
  }

  @Get('revenue/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getRevenueSummary() {
    return this.adminRevenueService.getRevenueSummary();
  }

  @Get('elections/financials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getElectionFinancials() {
    return this.adminService.getElectionFinancials();
  }

  @Get('dashboard/elections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getElectionBreakdown() {
    return this.adminService.getElectionBreakdown();
  }

  @Get('dashboard/top-candidates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getTopCandidates(
    @Query('electionId') electionId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedElectionId =
      electionId && electionId.trim() ? Number(electionId) : undefined;

    if (parsedElectionId !== undefined && Number.isNaN(parsedElectionId)) {
      throw new BadRequestException('electionId must be a number');
    }

    const parsedLimit = limit && limit.trim() ? Number(limit) : 10;

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    if (parsedLimit > 50) {
      throw new BadRequestException('limit max is 50');
    }

    return this.adminService.getTopCandidates({
      electionId: parsedElectionId,
      limit: parsedLimit,
    });
  }

  @Get('payments/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('SEARCH_PAYMENT', 'PAYMENT')
  async searchPayments(@Query('q') q?: string) {
    const query = (q || '').trim();
    if (!query) throw new BadRequestException('q is required');
    return this.adminService.searchPayments(query);
  }

  @Get('dashboard/revenue-30d')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getRevenue30d() {
    return this.adminService.getRevenueLast30Days();
  }

  @Get('dashboard/top-elections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getTopElections(@Query('limit') limit?: string) {
    const parsedLimit = limit && limit.trim() ? Number(limit) : 5;

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    if (parsedLimit > 50) {
      throw new BadRequestException('limit max is 50');
    }

    return this.adminService.getTopElections({ limit: parsedLimit });
  }

  @Get('dashboard/payments-health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getPaymentsHealth() {
    return this.adminService.getPaymentsHealth();
  }

  @Get('webhooks/recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('VIEW_WEBHOOK_EVENTS', 'WEBHOOK')
  async getRecentWebhooks(
    @Query('limit') limit?: string,
    @Query('reference') reference?: string,
  ) {
    const parsedLimit = limit && limit.trim() ? Number(limit) : 50;

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }
    if (parsedLimit > 200) {
      throw new BadRequestException('limit max is 200');
    }

    const ref = (reference || '').trim();

    return this.adminService.getRecentWebhookEvents({
      limit: parsedLimit,
      reference: ref || undefined,
    });
  }

  @Get('audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('VIEW_AUDIT_LOGS', 'AUDIT')
  async getAuditLogs(
    @Query('limit') limit?: string,
    @Query('admin') admin?: string,
    @Query('action') action?: string,
  ) {
    const parsedLimit = limit && limit.trim() ? Number(limit) : 50;

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }
    if (parsedLimit > 200) {
      throw new BadRequestException('limit max is 200');
    }

    const adminFilter = (admin || '').trim();
    const actionFilter = (action || '').trim();

    return this.adminService.getAuditLogs(
      parsedLimit,
      adminFilter || undefined,
      actionFilter || undefined,
    );
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async listAdminUsers(@Query('limit') limit?: string) {
    const parsedLimit = limit && limit.trim() ? Number(limit) : 100;

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }
    if (parsedLimit > 500) {
      throw new BadRequestException('limit max is 500');
    }

    return this.adminService.listAdminUsers({ limit: parsedLimit });
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('CREATE_ADMIN_USER', 'ADMIN')
  async createAdminUser(
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      roleId: number;
      isActive?: 'Y' | 'N';
    },
  ) {
    return this.adminService.createAdminUser(body);
  }

  @Patch('users/:adminId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('ADMIN_ROLE_CHANGE', 'ADMIN')
  async updateAdminUser(
    @Param('adminId', ParseIntPipe) adminId: number,
    @Body()
    body: {
      roleId?: number;
      isActive?: 'Y' | 'N';
    },
  ) {
    return this.adminService.updateAdminUser(adminId, body);
  }

  @Post('users/:adminId/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Audit('RESET_ADMIN_PASSWORD', 'ADMIN')
  async resetAdminPassword(
    @Param('adminId', ParseIntPipe) adminId: number,
    @Body() body: { newPassword: string },
  ) {
    return this.adminService.resetAdminPassword(adminId, body?.newPassword);
  }

@Put('candidates/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseInterceptors(
  FileInterceptor('image', {
    limits: { fileSize: 1 * 1024 * 1024 },
  }),
)
async updateCandidate(
  @Param('id', ParseIntPipe) candidateId: number,
  @UploadedFile() file: any | undefined, // ✅ WORKING

  @Body(new ValidationPipe({ transform: false, whitelist: false }))
  body: any,
) {
  console.log('UPDATE BODY >>>', body);
  console.log('UPDATE FILE >>>', file?.originalname);



  /* ========================= NAME ========================= */

  const rawName = body?.name;

  const name =
    typeof rawName === 'string'
      ? rawName.trim()
      : rawName?.toString?.().trim?.();

  if (!name || name.length === 0) {
    throw new BadRequestException('Name is required');
  }

  if (name.length > 150) {
    throw new BadRequestException('Name must be <= 150 characters');
  }

  /* ========================= VOTE PRICE ========================= */

  let votePrice: number | null = null;

  if (
    body?.votePrice !== undefined &&
    body?.votePrice !== null &&
    String(body.votePrice).trim() !== ''
  ) {
    const n = Number(body.votePrice);

    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException('Vote price must be >= 0');
    }

    votePrice = n;
  }

  /* ========================= STRINGS ========================= */

  const description =
    body?.description !== undefined && body?.description !== null
      ? String(body.description).trim() || null
      : null;

  const incomingPhotoUrl =
    body?.photoUrl !== undefined && body?.photoUrl !== null
      ? String(body.photoUrl).trim() || null
      : null;

  /* ========================= EXISTING ========================= */

  const existing = await this.adminService.getCandidateById(candidateId);
  if (!existing) {
    throw new BadRequestException('Candidate not found');
  }

  const oldPhotoUrl = existing?.photoUrl || null;

  /* ========================= PHOTO LOGIC ========================= */

  let photoUrl: string | null = oldPhotoUrl;

  // ✅ CASE 1: FILE UPLOAD (highest priority)
  if (file) {
    try {
      const newUrl = await this.cloudinaryService.uploadImage(file);

      // delete old ONLY if exists and different
      if (oldPhotoUrl && newUrl !== oldPhotoUrl) {
        const publicId =
          this.cloudinaryService.extractPublicId(oldPhotoUrl);

        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      }

      photoUrl = newUrl;
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      throw new BadRequestException('Image upload failed');
    }
  }

  // ✅ CASE 2: URL CHANGE
  else if (incomingPhotoUrl && incomingPhotoUrl !== oldPhotoUrl) {
    if (oldPhotoUrl) {
      const publicId =
        this.cloudinaryService.extractPublicId(oldPhotoUrl);

      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    photoUrl = incomingPhotoUrl;
  }

/* ========================= FINAL UPDATE ========================= */

return this.adminService.updateCandidate(candidateId, {
  name,
  description: description ?? undefined,
  votePrice: votePrice ?? undefined,
  photoUrl: photoUrl ?? undefined,
});
}

@Post('elections/:id/candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseInterceptors(
  FileInterceptor('image', {
    limits: { fileSize: 1 * 1024 * 1024 },
  }),
  AuditInterceptor, // ✅ FIX: MUST come AFTER FileInterceptor
)
async createCandidate(
  @Param('id', ParseIntPipe) electionId: number,
  @UploadedFile() file: any | undefined,
  @Body(new ValidationPipe({ transform: false, whitelist: false }))
  body: any,
) {
  console.log('CREATE BODY >>>', body);
  console.log('CREATE FILE >>>', file?.originalname);

  /* ========================= NAME ========================= */

  const rawName = body?.name;

  const name =
    typeof rawName === 'string'
      ? rawName.trim()
      : rawName?.toString?.().trim?.();

  if (!name) {
    throw new BadRequestException('Name is required');
  }

  if (name.length > 150) {
    throw new BadRequestException('Name must be <= 150 characters');
  }

  /* ========================= VOTE PRICE ========================= */

  let votePrice: number | null = null;

  if (
    body?.votePrice !== undefined &&
    body?.votePrice !== null &&
    String(body.votePrice).trim() !== ''
  ) {
    const n = Number(body.votePrice);

    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException('Vote price must be >= 0');
    }

    votePrice = n;
  }

  /* ========================= STRINGS ========================= */

  const description =
    body?.description !== undefined && body?.description !== null
      ? String(body.description).trim() || null
      : null;

  const photoUrl =
    body?.photoUrl !== undefined && body?.photoUrl !== null
      ? String(body.photoUrl).trim() || null
      : null;

  /* ========================= CREATE ========================= */

  return this.adminService.createCandidate({
  electionId,
  name,
  description: description ?? undefined,
  votePrice: votePrice ?? undefined,
  photoUrl: photoUrl ?? undefined,
  file,
});
}


}