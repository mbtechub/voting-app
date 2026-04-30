import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { Multer } from 'multer';
function toOracleDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
}

@Injectable()
export class ElectionManagementService {
  constructor(private readonly dataSource: DataSource) {}

  /* ============================================================
     ELECTIONS
  ============================================================ */

  async listElections(params?: { status?: string; q?: string }) {
    const status = (params?.status || '').trim();
    const q = (params?.q || '').trim();

    const binds: any[] = [];
    const where: string[] = [];

    if (status) {
      binds.push(status);
      where.push(`e.status = :${binds.length}`);
    }

    if (q) {
      binds.push(`%${q.toLowerCase()}%`);
      where.push(`LOWER(e.title) LIKE :${binds.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return this.dataSource.query(
      `
      SELECT
        e.election_id        AS "electionId",
        e.title              AS "title",
        e.description        AS "description",
        e.start_date         AS "startDate",
        e.end_date           AS "endDate",
        e.status             AS "status",
        e.default_vote_price AS "defaultVotePrice",
        e.created_at         AS "createdAt"
      FROM elections e
      ${whereSql}
      ORDER BY e.election_id DESC
      `,
      binds,
    );
  }

  async getElectionById(electionId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT
        e.election_id        AS "electionId",
        e.title              AS "title",
        e.description        AS "description",
        e.start_date         AS "startDate",
        e.end_date           AS "endDate",
        e.status             AS "status",
        e.default_vote_price AS "defaultVotePrice",
        e.created_at         AS "createdAt"
      FROM elections e
      WHERE e.election_id = :1
      `,
      [electionId],
    );

    if (!rows?.length) throw new NotFoundException('Election not found');
    return rows[0];
  }

  async createElection(dto: CreateElectionDto) {
    const start = toOracleDate(dto.startDate);
    const end = toOracleDate(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const status = (dto.status || 'DRAFT').trim().toUpperCase();

    const next = await this.dataSource.query(
      `SELECT elections_seq.NEXTVAL AS "electionId" FROM dual`,
    );

    const electionId = Number(next?.[0]?.electionId);

    await this.dataSource.query(
      `
      INSERT INTO elections (
        election_id, title, description, start_date, end_date, status, default_vote_price, created_at
      ) VALUES (
        :1, :2, :3, :4, :5, :6, :7, SYSDATE
      )
      `,
      [
        electionId,
        dto.title,
        dto.description ?? null,
        start,
        end,
        status,
        dto.defaultVotePrice ?? null,
      ],
    );

    return this.getElectionById(electionId);
  }

  async updateElection(electionId: number, dto: UpdateElectionDto) {
    const existing = await this.getElectionById(electionId);

    const start = dto.startDate
      ? toOracleDate(dto.startDate)
      : new Date(existing.startDate);

    const end = dto.endDate
      ? toOracleDate(dto.endDate)
      : new Date(existing.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    await this.dataSource.query(
      `
      UPDATE elections
      SET
        title = :1,
        description = :2,
        start_date = :3,
        end_date = :4,
        status = :5,
        default_vote_price = :6
      WHERE election_id = :7
      `,
      [
        dto.title ?? existing.title,
        dto.description ?? existing.description ?? null,
        start,
        end,
        dto.status ?? existing.status,
        dto.defaultVotePrice ?? existing.defaultVotePrice ?? null,
        electionId,
      ],
    );

    return this.getElectionById(electionId);
  }
async disableElection(electionId: number) {
  return this.setElectionStatus(electionId, 'DISABLED');
}
  async setElectionStatus(electionId: number, status: any) {
    await this.dataSource.query(
      `UPDATE elections SET status = :1 WHERE election_id = :2`,
      [status, electionId],
    );

    return this.getElectionById(electionId);
  }

  /* ============================================================
     CANDIDATES
  ============================================================ */

  async listCandidatesForElection(electionId: number) {
    await this.getElectionById(electionId);

    return this.dataSource.query(
      `
      SELECT
        c.candidate_id AS "candidateId",
        c.election_id  AS "electionId",
        c.name         AS "name",
        c.description  AS "description",
        c.photo_url    AS "photoUrl",
        c.vote_price   AS "votePrice",
        c.created_at   AS "createdAt"
      FROM candidates c
      WHERE c.election_id = :1
      ORDER BY c.candidate_id DESC
      `,
      [electionId],
    );
  }

  async createCandidate(
    electionId: number,
    data: CreateCandidateDto & { file?: Express.Multer.File },
  ) {
    await this.getElectionById(electionId);

    await this.dataSource.query(
      `
      INSERT INTO candidates (
        candidate_id, election_id, name, description, photo_url, vote_price, created_at
      ) VALUES (
        candidates_seq.NEXTVAL, :1, :2, :3, :4, :5, SYSDATE
      )
      `,
      [
        electionId,
        data.name,
        data.description || null,
        data.photoUrl || null,
        data.votePrice ?? null,
      ],
    );

    const rows = await this.dataSource.query(
      `SELECT candidate_id AS "candidateId" FROM candidates ORDER BY candidate_id DESC FETCH FIRST 1 ROWS ONLY`,
    );

    return this.getCandidateById(rows[0].candidateId);
  }

  async getCandidateById(candidateId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT
        c.candidate_id AS "candidateId",
        c.election_id  AS "electionId",
        c.name         AS "name",
        c.description  AS "description",
        c.photo_url    AS "photoUrl",
        c.vote_price   AS "votePrice",
        c.created_at   AS "createdAt"
      FROM candidates c
      WHERE c.candidate_id = :1
      `,
      [candidateId],
    );

    if (!rows?.length) throw new NotFoundException('Candidate not found');
    return rows[0];
  }

  async updateCandidate(
    candidateId: number,
    data: UpdateCandidateDto & { file?: Express.Multer.File },
  ) {
    const existing = await this.getCandidateById(candidateId);

    await this.dataSource.query(
      `
      UPDATE candidates
      SET
        name = :1,
        description = :2,
        photo_url = :3,
        vote_price = :4
      WHERE candidate_id = :5
      `,
      [
        data.name ?? existing.name,
        data.description !== undefined ? data.description || null : existing.description,
        data.photoUrl !== undefined ? data.photoUrl || null : existing.photoUrl,
        data.votePrice !== undefined ? data.votePrice : existing.votePrice,
        candidateId,
      ],
    );

    return this.getCandidateById(candidateId);
  }

  // ✅ RESTORED (your missing method)
  async deleteCandidate(candidateId: number) {
    const candidate = await this.getCandidateById(candidateId);

    const resultsHit = await this.dataSource.query(
      `
      SELECT 1
      FROM election_results
      WHERE candidate_id = :1
        AND NVL(vote_count, 0) > 0
      FETCH FIRST 1 ROWS ONLY
      `,
      [candidateId],
    );

    const logsHit = await this.dataSource.query(
      `
      SELECT 1
      FROM vote_logs
      WHERE candidate_id = :1
        AND apply_status = 'APPLIED'
      FETCH FIRST 1 ROWS ONLY
      `,
      [candidateId],
    );

    if ((resultsHit?.length ?? 0) > 0 || (logsHit?.length ?? 0) > 0) {
      throw new BadRequestException(
        'Cannot delete candidate: votes already exist for this candidate',
      );
    }

    await this.dataSource.query(
      `DELETE FROM candidates WHERE candidate_id = :1`,
      [candidateId],
    );

    return { ok: true, candidateId, electionId: candidate.electionId };
  }
}