import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SequenceService {
  constructor(private readonly dataSource: DataSource) {}

  async getNextValue(sequenceName: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT ${sequenceName}.NEXTVAL as id FROM dual`
    );
    return result[0].ID || result[0].id;
  }
}
