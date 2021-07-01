import { Dataset } from "codap-phone";

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
    throw e.result.error;
  }

  if (data.values === undefined) {
    return [];
  }

  return fillRows(data.values);
}

export function makeDataset(
  attributeNames: string[],
  dataRows: unknown[][]
): Dataset {
  const attributes = attributeNames.map((name) => ({ name }));
  const records = dataRows.map((row) =>
    attributeNames.reduce(
      (acc: Record<string, unknown>, name: string, i: number) => {
        acc[name] = row[i];
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
