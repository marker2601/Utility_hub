import { extname, parse as parsePath } from "node:path";

import ExcelJS from "exceljs";
import Papa from "papaparse";
import { z } from "zod";

import type { AppRunResult, AppRuntimeContext } from "@/src/server/apps/types";
import { ApiError } from "@/src/server/http/problem";

export const csvProfilerOptionsSchema = z.object({
  removeDuplicateRows: z.boolean().optional().default(false),
});

type CsvProfilerOptions = z.infer<typeof csvProfilerOptionsSchema>;

type PrimitiveType = "number" | "boolean" | "date" | "string";

interface ParsedTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

interface ColumnProfile {
  name: string;
  inferredType: PrimitiveType;
  typeBreakdown: Record<PrimitiveType, number>;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  duplicateValueCount: number;
  min: string | number | null;
  max: string | number | null;
  sampleValues: string[];
  warnings: string[];
}

function normalizeHeader(rawHeader: string, index: number): string {
  const cleaned = rawHeader.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  return cleaned.length > 0 ? cleaned : `column_${index + 1}`;
}

function inferPrimitiveType(rawValue: string): PrimitiveType {
  const value = rawValue.trim();
  if (value === "") {
    return "string";
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return "number";
  }

  if (/^(true|false|yes|no|0|1)$/i.test(value)) {
    return "boolean";
  }

  if (isDateLike(value)) {
    return "date";
  }

  return "string";
}

function isDateLike(value: string): boolean {
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const year = parsed.getUTCFullYear();
  return year >= 1900 && year <= 2100;
}

function normalizeDateSafe(value: string): string {
  if (!isDateLike(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}

function cleanCellValue(value: string): string {
  return value.replace(/\u00a0/g, " ").trim();
}

function chooseDominantType(breakdown: Record<PrimitiveType, number>): PrimitiveType {
  const order: PrimitiveType[] = ["string", "number", "date", "boolean"];
  return order.reduce((best, candidate) => (breakdown[candidate] > breakdown[best] ? candidate : best), "string");
}

function rowKey(row: Record<string, string>, headers: string[]): string {
  return headers.map((header) => cleanCellValue(row[header] ?? "")).join("\u001f");
}

function parseCsvBuffer(buffer: Buffer): ParsedTable {
  const csvText = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string, index: number) => normalizeHeader(header, index),
  });

  if (result.errors.length > 0) {
    throw new ApiError({
      status: 400,
      title: "Invalid CSV",
      detail: result.errors[0]?.message,
      type: "https://utilityhub.dev/problems/invalid-csv",
    });
  }

  const headers = (result.meta.fields ?? []).map((header: string, index: number) => normalizeHeader(header, index));

  const rows = result.data.map((rawRow: Record<string, string>) => {
    const row: Record<string, string> = {};
    headers.forEach((header: string) => {
      const rawValue = rawRow[header];
      row[header] = rawValue == null ? "" : String(rawValue);
    });
    return row;
  });

  return { headers, rows };
}

function excelCellToString(value: ExcelJS.CellValue | undefined | null): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value) {
      return String(value.result ?? "");
    }
  }

  return String(value);
}

async function parseXlsxBuffer(buffer: Buffer): Promise<ParsedTable> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ApiError({
      status: 400,
      title: "Invalid XLSX",
      detail: "No worksheet found.",
      type: "https://utilityhub.dev/problems/invalid-xlsx",
    });
  }

  const headerRow = sheet.getRow(1);
  const rawHeaders: string[] = [];
  for (let columnIndex = 1; columnIndex <= headerRow.cellCount; columnIndex += 1) {
    const value = headerRow.getCell(columnIndex).value;
    rawHeaders.push(normalizeHeader(excelCellToString(value), columnIndex - 1));
  }

  const headers = rawHeaders.filter((header: string) => header.length > 0);
  if (headers.length === 0) {
    throw new ApiError({
      status: 400,
      title: "Invalid XLSX",
      detail: "Header row is empty.",
      type: "https://utilityhub.dev/problems/invalid-xlsx",
    });
  }

  const rows: Array<Record<string, string>> = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const record: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header: string, index: number) => {
      const value = excelCellToString(row.getCell(index + 1).value);
      if (value.trim() !== "") {
        hasValue = true;
      }
      record[header] = value;
    });

    if (hasValue) {
      rows.push(record);
    }
  }

  return { headers, rows };
}

async function parseInputFile(context: AppRuntimeContext<Record<string, unknown>>): Promise<ParsedTable> {
  const filename = context.inputFile.filename.toLowerCase();
  const extension = extname(filename);
  const contentType = context.inputFile.content_type;

  if (extension === ".xlsx" || contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return parseXlsxBuffer(context.inputBuffer);
  }

  return parseCsvBuffer(context.inputBuffer);
}

function buildProfileReport(
  headers: string[],
  rows: Array<Record<string, string>>,
  options: CsvProfilerOptions,
): { report: Record<string, unknown>; cleanedRows: Array<Record<string, string>> } {
  const totalRows = rows.length;
  const duplicateTracker = new Map<string, number>();

  rows.forEach((row) => {
    const key = rowKey(row, headers);
    duplicateTracker.set(key, (duplicateTracker.get(key) ?? 0) + 1);
  });

  let duplicateRowCount = 0;
  duplicateTracker.forEach((count) => {
    if (count > 1) {
      duplicateRowCount += count - 1;
    }
  });

  const columnProfiles: ColumnProfile[] = headers.map((header) => {
    const rawValues = rows.map((row) => row[header] ?? "");
    const cleanedValues = rawValues.map(cleanCellValue);

    const missingCount = cleanedValues.filter((value) => value === "").length;
    const nonMissingValues = cleanedValues.filter((value) => value !== "");

    const typeBreakdown: Record<PrimitiveType, number> = {
      number: 0,
      boolean: 0,
      date: 0,
      string: 0,
    };

    nonMissingValues.forEach((value) => {
      const inferred = inferPrimitiveType(value);
      typeBreakdown[inferred] += 1;
    });

    const inferredType = chooseDominantType(typeBreakdown);
    const uniqueValues = new Set(nonMissingValues);
    const duplicateValueCount = Math.max(nonMissingValues.length - uniqueValues.size, 0);

    let min: string | number | null = null;
    let max: string | number | null = null;

    if (nonMissingValues.length > 0) {
      if (inferredType === "number") {
        const numbers = nonMissingValues.map((value) => Number.parseFloat(value)).filter((value) => Number.isFinite(value));
        min = numbers.length ? Math.min(...numbers) : null;
        max = numbers.length ? Math.max(...numbers) : null;
      } else if (inferredType === "date") {
        const normalized = nonMissingValues.map(normalizeDateSafe).sort();
        min = normalized[0] ?? null;
        max = normalized[normalized.length - 1] ?? null;
      } else {
        const sorted = [...nonMissingValues].sort((a, b) => a.localeCompare(b));
        min = sorted[0] ?? null;
        max = sorted[sorted.length - 1] ?? null;
      }
    }

    const missingPercent = totalRows === 0 ? 0 : Number(((missingCount / totalRows) * 100).toFixed(2));
    const warnings: string[] = [];

    if (missingPercent >= 30) {
      warnings.push("High missing value rate (>= 30%).");
    }

    if (typeBreakdown.string > 0 && (typeBreakdown.number > 0 || typeBreakdown.date > 0 || typeBreakdown.boolean > 0)) {
      warnings.push("Mixed data types detected.");
    }

    if (uniqueValues.size > 0 && uniqueValues.size / Math.max(nonMissingValues.length, 1) > 0.95 && nonMissingValues.length > 100) {
      warnings.push("Very high cardinality column.");
    }

    return {
      name: header,
      inferredType,
      typeBreakdown,
      missingCount,
      missingPercent,
      uniqueCount: uniqueValues.size,
      duplicateValueCount,
      min,
      max,
      sampleValues: Array.from(uniqueValues).slice(0, 5),
      warnings,
    };
  });

  const dateColumns = new Set(
    columnProfiles
      .filter((profile) => {
        const nonMissing = totalRows - profile.missingCount;
        if (nonMissing <= 0) {
          return false;
        }
        return profile.inferredType === "date" && profile.typeBreakdown.date / nonMissing >= 0.8;
      })
      .map((profile) => profile.name),
  );

  let cleanedRows = rows.map((row) => {
    const cleaned: Record<string, string> = {};

    headers.forEach((header) => {
      const trimmed = cleanCellValue(row[header] ?? "");
      cleaned[header] = dateColumns.has(header) ? normalizeDateSafe(trimmed) : trimmed;
    });

    return cleaned;
  });

  if (options.removeDuplicateRows) {
    const seen = new Set<string>();
    cleanedRows = cleanedRows.filter((row) => {
      const key = rowKey(row, headers);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  const datasetWarnings: string[] = [];

  if (duplicateRowCount > 0) {
    datasetWarnings.push(`${duplicateRowCount} duplicate row(s) detected.`);
  }

  if (totalRows === 0) {
    datasetWarnings.push("Input has no data rows.");
  }

  const report = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    summary: {
      rowCount: totalRows,
      cleanedRowCount: cleanedRows.length,
      columnCount: headers.length,
      duplicateRowCount,
      duplicateRowPercent: totalRows === 0 ? 0 : Number(((duplicateRowCount / totalRows) * 100).toFixed(2)),
      removeDuplicateRowsApplied: options.removeDuplicateRows,
    },
    columns: columnProfiles,
    warnings: datasetWarnings,
  };

  return {
    report,
    cleanedRows,
  };
}

export async function runCsvProfiler(context: AppRuntimeContext<Record<string, unknown>>): Promise<AppRunResult> {
  const parsedTable = await parseInputFile(context);
  const parsedOptions = csvProfilerOptionsSchema.parse(context.options ?? {});

  const { report, cleanedRows } = buildProfileReport(parsedTable.headers, parsedTable.rows, parsedOptions);

  const cleanedCsv = Papa.unparse(cleanedRows, {
    columns: parsedTable.headers,
    header: true,
    skipEmptyLines: false,
  });

  const sourceBaseName = parsePath(context.inputFile.filename).name;

  return {
    report,
    cleanedCsv,
    outputFilename: `${sourceBaseName}-cleaned.csv`,
    outputContentType: "text/csv",
  };
}
