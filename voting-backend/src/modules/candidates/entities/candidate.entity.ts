// src/modules/candidates/entities/candidate.entity.ts
// PURPOSE: Represents the CANDIDATES table

import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'CANDIDATES' })
export class Candidate {
  @PrimaryColumn({ name: 'CANDIDATE_ID', type: 'number' })
  candidateId!: number;

  @Column({ name: 'ELECTION_ID', type: 'number' })
  electionId!: number;

  @Column({ name: 'NAME', type: 'varchar2', length: 150 })
  name!: string;

  @Column({ name: 'VOTE_PRICE', type: 'number', nullable: true })
  votePrice!: number | null;

  @Column({ name: 'PHOTO_URL', type: 'varchar2', length: 500, nullable: true })
  photoUrl!: string | null;
}