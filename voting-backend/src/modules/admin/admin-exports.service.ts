import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type Row = {
  electionId: number;
  electionTitle: string;
  candidateId: number;
  candidateName: string;
  candidateDescription: string | null;
  voteCount: number;
};

type WinnerRow = {
  electionId: number;
  electionTitle: string;
  winnerCandidateId: number;
  winnerCandidateName: string;
  voteCount: number;
};

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

@Injectable()
export class AdminExportsService {
  constructor(private readonly dataSource: DataSource) {}

  private async fetchElectionRows(electionId: number): Promise<Row[]> {
    return this.dataSource.query(
      `
      SELECT
        e.election_id AS "electionId",
        e.title AS "electionTitle",
        c.candidate_id AS "candidateId",
        c.name AS "candidateName",
        c.description AS "candidateDescription",
        NVL(r.vote_count, 0) AS "voteCount"
      FROM candidates c
      JOIN ELECTIONS e ON e.election_id = c.election_id
      LEFT JOIN election_results r
        ON r.election_id = c.election_id
       AND r.candidate_id = c.candidate_id
      WHERE c.election_id = :1
      ORDER BY NVL(r.vote_count, 0) DESC, c.candidate_id ASC
      `,
      [electionId],
    );
  }

  private async fetchAllElectionIds(): Promise<number[]> {
    const rows = await this.dataSource.query(`
      SELECT election_id AS "electionId"
      FROM ELECTIONS
      ORDER BY election_id ASC
    `);
    return (rows || []).map((r: any) => Number(r.electionId)).filter(Boolean);
  }

  private async fetchWinnersRows(): Promise<WinnerRow[]> {
    return this.dataSource.query(`
      SELECT
        x."electionId",
        x."electionTitle",
        x."winnerCandidateId",
        x."winnerCandidateName",
        x."voteCount"
      FROM (
        SELECT
          e.election_id AS "electionId",
          e.title       AS "electionTitle",
          c.candidate_id AS "winnerCandidateId",
          c.name         AS "winnerCandidateName",
          NVL(r.vote_count, 0) AS "voteCount",
          ROW_NUMBER() OVER (
            PARTITION BY e.election_id
            ORDER BY NVL(r.vote_count, 0) DESC, c.candidate_id ASC
          ) AS rn
        FROM elections e
        JOIN candidates c
          ON c.election_id = e.election_id
        LEFT JOIN election_results r
          ON r.election_id = c.election_id
         AND r.candidate_id = c.candidate_id
      ) x
      WHERE x.rn = 1
      ORDER BY x."electionId" ASC
    `);
  }

  private safeCell(v: any) {
    const s = (v ?? '').toString();
    if (!s) return s;
    return /^[=+\-@]/.test(s) ? `'${s}` : s;
  }

  private escapeCsv(v: any) {
    const s = this.safeCell(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  private buildCsv(rows: Row[]) {
    const header = [
      'Election ID',
      'Election Title',
      'Candidate ID',
      'Candidate Name',
      'Description',
      'Votes',
    ];

    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.electionId,
          r.electionTitle,
          r.candidateId,
          r.candidateName,
          r.candidateDescription ?? '',
          r.voteCount,
        ]
          .map((x) => this.escapeCsv(x))
          .join(','),
      ),
    ];

    return Buffer.from(lines.join('\r\n'), 'utf8');
  }

  private buildWinnersCsv(rows: WinnerRow[]) {
    const header = [
      'Election ID',
      'Election Title',
      'Winner Candidate ID',
      'Winner Candidate Name',
      'Votes',
    ];

    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.electionId,
          r.electionTitle,
          r.winnerCandidateId,
          r.winnerCandidateName,
          r.voteCount,
        ]
          .map((x) => this.escapeCsv(x))
          .join(','),
      ),
    ];

    return Buffer.from(lines.join('\r\n'), 'utf8');
  }

  private async buildXlsx(rows: Row[]) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Voting App';
    wb.created = new Date();

    const ws = wb.addWorksheet('Results');

    ws.columns = [
      { header: 'Election ID', key: 'electionId', width: 12 },
      { header: 'Election Title', key: 'electionTitle', width: 30 },
      { header: 'Candidate ID', key: 'candidateId', width: 14 },
      { header: 'Candidate Name', key: 'candidateName', width: 28 },
      { header: 'Description', key: 'candidateDescription', width: 40 },
      { header: 'Votes', key: 'voteCount', width: 10 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    for (const r of rows) {
      ws.addRow({
        electionId: r.electionId,
        electionTitle: r.electionTitle,
        candidateId: r.candidateId,
        candidateName: r.candidateName,
        candidateDescription: r.candidateDescription ?? '',
        voteCount: r.voteCount,
      });
    }

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    return Buffer.from(buf);
  }

  private async buildWinnersXlsx(rows: WinnerRow[]) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Voting App';
    wb.created = new Date();

    const ws = wb.addWorksheet('Winners');

    ws.columns = [
      { header: 'Election ID', key: 'electionId', width: 12 },
      { header: 'Election Title', key: 'electionTitle', width: 30 },
      { header: 'Winner Candidate ID', key: 'winnerCandidateId', width: 18 },
      { header: 'Winner Candidate Name', key: 'winnerCandidateName', width: 28 },
      { header: 'Votes', key: 'voteCount', width: 10 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    for (const r of rows) {
      ws.addRow({
        electionId: r.electionId,
        electionTitle: r.electionTitle,
        winnerCandidateId: r.winnerCandidateId,
        winnerCandidateName: r.winnerCandidateName,
        voteCount: r.voteCount,
      });
    }

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    return Buffer.from(buf);
  }

  private docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer | string) =>
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
      );
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  private async buildPdf(rows: Row[], title: string) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: { Title: `${title} - Results` },
    });

    doc.fontSize(18).text('Election Results', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#333').text(title);
    doc.moveDown(0.8);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colVotes = 70;
    const colCandidate = Math.max(200, Math.floor(pageWidth - colVotes));
    const x0 = doc.page.margins.left;

    const drawRow = (
      y: number,
      candidate: string,
      votes: string,
      isHeader = false,
    ) => {
      doc
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(11)
        .fillColor('#000');

      doc.text(candidate, x0, y, { width: colCandidate, ellipsis: true });
      doc.text(votes, x0 + colCandidate, y, {
        width: colVotes,
        align: 'right',
      });
    };

    let y = doc.y;

    drawRow(y, 'Candidate', 'Votes', true);
    y += 18;

    doc
      .moveTo(x0, y - 6)
      .lineTo(x0 + pageWidth, y - 6)
      .strokeColor('#ddd')
      .stroke();

    for (const r of rows) {
      const candidate = r.candidateName || 'Unknown';
      const votes = String(r.voteCount ?? 0);

      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;

        drawRow(y, 'Candidate', 'Votes', true);
        y += 18;

        doc
          .moveTo(x0, y - 6)
          .lineTo(x0 + pageWidth, y - 6)
          .strokeColor('#ddd')
          .stroke();
      }

      drawRow(y, candidate, votes, false);
      y += 16;
    }

    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Generated: ${new Date().toISOString()}`);

    return this.docToBuffer(doc);
  }

  private async buildWinnersPdf(rows: WinnerRow[]) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: { Title: `Election Winners` },
    });

    doc.fontSize(18).text('Election Winners', { align: 'left' });
    doc.moveDown(0.8);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const x0 = doc.page.margins.left;
    const colVotes = 60;
    const colWinner = 190;
    const colElection = Math.max(180, pageWidth - colWinner - colVotes);

    const drawRow = (
      y: number,
      election: string,
      winner: string,
      votes: string,
      isHeader = false,
    ) => {
      doc
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .fillColor('#000');

      doc.text(election, x0, y, { width: colElection, ellipsis: true });
      doc.text(winner, x0 + colElection, y, { width: colWinner, ellipsis: true });
      doc.text(votes, x0 + colElection + colWinner, y, {
        width: colVotes,
        align: 'right',
      });
    };

    let y = doc.y;

    drawRow(y, 'Election', 'Winner', 'Votes', true);
    y += 16;

    doc
      .moveTo(x0, y - 6)
      .lineTo(x0 + pageWidth, y - 6)
      .strokeColor('#ddd')
      .stroke();

    for (const r of rows) {
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;

        drawRow(y, 'Election', 'Winner', 'Votes', true);
        y += 16;

        doc
          .moveTo(x0, y - 6)
          .lineTo(x0 + pageWidth, y - 6)
          .strokeColor('#ddd')
          .stroke();
      }

      drawRow(
        y,
        `${r.electionTitle} (ID:${r.electionId})`,
        `${r.winnerCandidateName} (ID:${r.winnerCandidateId})`,
        String(r.voteCount ?? 0),
        false,
      );
      y += 14;
    }

    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Generated: ${new Date().toISOString()}`);

    return this.docToBuffer(doc);
  }

  private buildGenericCsv(rows: Record<string, any>[]) {
    if (!rows.length) {
      return Buffer.from('', 'utf8');
    }

    const headers = Object.keys(rows[0]);

    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => this.escapeCsv(row[header]))
          .join(','),
      ),
    ];

    return Buffer.from(lines.join('\r\n'), 'utf8');
  }

  private async buildGenericXlsx(
    rows: Record<string, any>[],
    sheetName: string,
  ) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Voting App';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName);

    const headers = rows.length ? Object.keys(rows[0]) : [];
    ws.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(18, header.length + 4),
    }));

    if (headers.length) {
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }

    for (const row of rows) {
      ws.addRow(row);
    }

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    return Buffer.from(buf);
  }

  private async buildGenericPdf(
    rows: Record<string, any>[],
    title: string,
  ) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: { Title: title },
    });

    doc.fontSize(18).text(title, { align: 'left' });
    doc.moveDown(0.8);

    if (!rows.length) {
      doc.fontSize(11).fillColor('#555').text('No data available.');
      return this.docToBuffer(doc);
    }

    for (const row of rows) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('---');
      doc.moveDown(0.2);

      for (const [key, value] of Object.entries(row)) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#000')
          .text(`${key}: `, { continued: true });

        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#333')
          .text(value == null ? '' : String(value));
      }

      doc.moveDown(0.6);
    }

    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Generated: ${new Date().toISOString()}`);

    return this.docToBuffer(doc);
  }

  private async exportRows(
    filenameBase: string,
    rows: Record<string, any>[],
    format: ExportFormat,
    sheetName = 'Export',
    pdfTitle = 'Export',
  ) {
    if (format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${filenameBase}.csv`,
        buffer: this.buildGenericCsv(rows),
      };
    }

    if (format === 'xlsx') {
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${filenameBase}.xlsx`,
        buffer: await this.buildGenericXlsx(rows, sheetName),
      };
    }

    return {
      contentType: 'application/pdf',
      filename: `${filenameBase}.pdf`,
      buffer: await this.buildGenericPdf(rows, pdfTitle),
    };
  }

  async exportOneElection(electionId: number, format: ExportFormat) {
    const fmt = (format || '').toLowerCase() as ExportFormat;
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const rows = await this.fetchElectionRows(electionId);
    const title = rows?.[0]?.electionTitle
      ? `${rows[0].electionTitle} (ID: ${electionId})`
      : `Election ID: ${electionId}`;

    if (fmt === 'csv') {
      const buffer = this.buildCsv(rows);
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `election-${electionId}-results.csv`,
        buffer,
      };
    }

    if (fmt === 'xlsx') {
      const buffer = await this.buildXlsx(rows);
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `election-${electionId}-results.xlsx`,
        buffer,
      };
    }

    const buffer = await this.buildPdf(rows, title);
    return {
      contentType: 'application/pdf',
      filename: `election-${electionId}-results.pdf`,
      buffer,
    };
  }

  async exportAllElections(format: ExportFormat) {
    const fmt = (format || '').toLowerCase() as ExportFormat;
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const ids = await this.fetchAllElectionIds();

    const allRows: Row[] = [];
    for (const id of ids) {
      const rows = await this.fetchElectionRows(id);
      allRows.push(...rows);
    }

    if (fmt === 'csv') {
      const buffer = this.buildCsv(allRows);
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `all-elections-results.csv`,
        buffer,
      };
    }

    if (fmt === 'xlsx') {
      const buffer = await this.buildXlsx(allRows);
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `all-elections-results.xlsx`,
        buffer,
      };
    }

    const buffer = await this.buildPdf(allRows, 'All Elections');
    return {
      contentType: 'application/pdf',
      filename: `all-elections-results.pdf`,
      buffer,
    };
  }

  async exportWinnersAll(format: ExportFormat) {
    const fmt = (format || '').toLowerCase() as ExportFormat;
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const rows = await this.fetchWinnersRows();

    if (fmt === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `winners-all-elections.csv`,
        buffer: this.buildWinnersCsv(rows),
      };
    }

    if (fmt === 'xlsx') {
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `winners-all-elections.xlsx`,
        buffer: await this.buildWinnersXlsx(rows),
      };
    }

    return {
      contentType: 'application/pdf',
      filename: `winners-all-elections.pdf`,
      buffer: await this.buildWinnersPdf(rows),
    };
  }

  async exportAuditLogs(format: ExportFormat) {
    const fmt = (format || '').toLowerCase() as ExportFormat;
    if (fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'pdf') {
      throw new BadRequestException('format must be csv | xlsx | pdf');
    }

    const rows = await this.dataSource.query(`
      SELECT
        AUDIT_ID      AS "auditId",
        PERFORMED_BY  AS "admin",
        ACTION        AS "action",
        ENTITY        AS "module",
        ENTITY_ID     AS "target",
        DETAILS       AS "details",
        CREATED_AT    AS "createdAt"
      FROM AUDIT_LOGS
      ORDER BY CREATED_AT DESC
    `);

    return this.exportRows(
      'audit_logs',
      rows,
      fmt,
      'Audit Logs',
      'Audit Logs',
    );
  }
}