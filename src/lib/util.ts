import { Dataset } from "codap-phone";
import {
  InvalidRangeError,
  SpreadSheetNotFoundError,
  GeneralAPIError,
} from "./errors";

/**
 * Make rows in 2D array all have the same length by filling rows that are
 * not long enough with empty string.
 *
 * @param table - The input 2D array
 * @returns The filled 2D array
 */
function fillRows(table: unknown[][]): unknown[][] {
  const longestLength = table.reduce(
    (currentMax, row) => (row.length > currentMax ? row.length : currentMax),
    0
  );

  // Fill rows not long enough with empty strings
  return table.map((row) =>
    row.length < longestLength
      ? row.fill("", row.length, longestLength - 1)
      : row
  );
}

export async function getSheetFromId(
  spreadsheetId: string
): Promise<Required<gapi.client.sheets.Spreadsheet>> {
  let sheet;

  try {
    sheet = (
      await gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      })
    ).result;
  } catch (e) {
    if (e.result.error.code === 404) {
      throw new SpreadSheetNotFoundError();
    } else {
      throw e.result.error;
    }
  }

  // Cast here since the gapi type is needlessly optional
  return sheet as Required<gapi.client.sheets.Spreadsheet>;
}

const UNABLE_TO_PARSE_RANGE = "Unable to parse range";
export async function getDataFromSheet(
  sheetId: string,
  range: string
): Promise<unknown[][]> {
  let data;
  try {
    data = (
      await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      })
    ).result;
  } catch (e) {
    const error = e.result.error;
    console.log(error);
    if (error.message.startsWith(UNABLE_TO_PARSE_RANGE)) {
      throw new InvalidRangeError();
    } else if (error.code === 404) {
      throw new SpreadSheetNotFoundError();
    } else {
      throw new GeneralAPIError();
    }
  }

  if (data.values === undefined) {
    return [];
  }

  return fillRows(data.values);
}

export async function getColumnNamesFromSheet(
  id: string,
  sheetName: string,
  customRange?: string
): Promise<string[]> {
  let firstRow;
  if (customRange === undefined) {
    firstRow = "1:1";
  } else {
    firstRow = firstRowOfCustomRange(customRange);
  }

  const range = formatRange(sheetName, firstRow);
  const data = await getDataFromSheet(id, range);

  if (data.length === 0) {
    return [];
  } else {
    return data[0].map(String);
  }
}

export function makeDataset(
  attributeNames: [number, string][],
  dataRows: unknown[][]
): Dataset {
  const attributes = attributeNames.map(([, name]) => ({ name }));
  const records = dataRows.map((row) =>
    attributeNames.reduce(
      (acc: Record<string, unknown>, [index, name]: [number, string]) => {
        acc[name] = row[index];
        return acc;
      },
      {}
    )
  );
  return {
    collections: [
      {
        name: "Cases",
        labels: {},
        attrs: attributes,
      },
    ],
    records,
  };
}

export function formatRange(sheetName: string, customRange?: string) {
  return customRange !== undefined ? `${sheetName}!${customRange}` : sheetName;
}

export function parseRange(range: string): [string, string] {
  const splitByColon = range.split(":");
  if (splitByColon.length !== 2) {
    throw new Error(`Malformed range ${range}`);
  }

  // Safe cast because we checked that the result has two elements
  return splitByColon as [string, string];
}

export function firstRowOfCustomRange(range: string): string {
  const [start, end] = parseRange(range);
  const startRow = start.replace(/[A-Z]/g, "");
  const endColumn = end.replace(/[0-9]/g, "");
  const newEnd = endColumn + startRow;
  return `${start}:${newEnd}`;
}

export function getSpreadsheetIdFromLink(link: string): string {
  const start = link.indexOf("/d/");
  if (start === -1) {
    throw new Error("Malformed link");
  }
  const idStart = start + 3;
  const end = link.indexOf("/", idStart);
  if (end === -1) {
    return link.substring(idStart, link.length);
  } else {
    return link.substring(idStart, end);
  }
}
