import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ELECTIONS' })
export class Election {
  @PrimaryColumn({ name: 'ELECTION_ID', type: 'number' })
  electionId: number;

  @Column({ name: 'TITLE', type: 'varchar2', length: 200 })
  title: string;

  @Column({
    name: 'DESCRIPTION',
    type: 'varchar2',
    length: 1000,
    nullable: true,
  })
  description: string | null;

  @Column({ name: 'START_DATE', type: 'date' })
  startDate: Date;

  @Column({ name: 'END_DATE', type: 'date' })
  endDate: Date;

  @Column({ name: 'STATUS', type: 'varchar2', length: 20, nullable: true })
  status: string | null; // e.g. ACTIVE, ENDED

  @Column({
    name: 'DEFAULT_VOTE_PRICE',
    type: 'number',
    nullable: true,
  })
  defaultVotePrice: number | null;

  @Column({ name: 'CREATED_AT', type: 'date', nullable: true })
  createdAt: Date | null;
}
