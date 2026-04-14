import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm'; // ✅ ADD DataSource

import { Election } from '../elections/entities/election.entity';
import { Candidate } from '../candidates/entities/candidate.entity';

@Injectable()
export class PublicService {
  constructor(
    private readonly dataSource: DataSource, // 🔥 FIX: ADD THIS

    @InjectRepository(Election)
    private readonly electionsRepo: Repository<Election>,

    @InjectRepository(Candidate)
    private readonly candidatesRepo: Repository<Candidate>,
  ) {}

  // ===============================
  // Public can ONLY view active polls
  // ===============================
  async listActiveElections() {
    return this.electionsRepo
      .createQueryBuilder('e')
      .select([
        'e.electionId',
        'e.title',
        'e.description',
        'e.startDate',
        'e.endDate',
      ])
      .where('e.startDate <= SYSDATE')
      .andWhere('e.endDate >= SYSDATE')
      .andWhere('e.status = :status', { status: 'ACTIVE' })
      .orderBy('e.startDate', 'ASC')
      .getMany();
  }

  // ===============================
  // Public can view nominees for a poll
  // ===============================
  async listElectionCandidates(electionId: number) {
  const rows = await this.dataSource.query(
    `
    SELECT
      c.candidate_id,
      c.election_id,
      c.name,
      c.vote_price,
      c.photo_url
    FROM candidates c
    WHERE c.election_id = :1
    ORDER BY c.candidate_id ASC
    `,
    [electionId],
  );

  return rows.map((c: any) => ({
    candidateId: Number(c.CANDIDATE_ID ?? c.candidate_id),
    electionId: Number(c.ELECTION_ID ?? c.election_id),
    name: c.NAME ?? c.name,
    votePrice: c.VOTE_PRICE ?? c.vote_price,

    // 🔥 HANDLE BOTH CASES (THIS IS THE FIX)
    photoUrl:
      c.PHOTO_URL ??
      c.photo_url ??
      null,
  }));
}
}