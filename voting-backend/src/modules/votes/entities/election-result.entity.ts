import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ELECTION_RESULTS' })
export class ElectionResult {
  @PrimaryColumn({ name: 'ELECTION_ID', type: 'number' })
  electionId: number;

  @PrimaryColumn({ name: 'CANDIDATE_ID', type: 'number' })
  candidateId: number;

  @Column({ name: 'VOTE_COUNT', type: 'number' })
  voteCount: number;
}
