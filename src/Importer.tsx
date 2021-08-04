import React, { useState, useEffect, useCallback } from "react";
import "./codap.css";
import "./styles.css";
import {
  initializePlugin,
  createContextWithDataset,
  createTable,
  dismissPlugin,
} from "codap-phone";
import { useInput, useDataContexts } from "./lib/hooks";
import {
  uniqueName,
  getSheetFromId,
  getDataFromSheet,
  formatRange,
  getSpreadsheetIdFromLink,
  getColumnNamesFromSheet,
  makeDatasetFromSheetsData,
} from "./lib/util";
import { SheetLinkDialog } from "./components/SheetLinkDialog";
import { ErrorDisplay } from "./components/Error";
import { InvalidRangeError, GeneralAPIError } from "./lib/errors";
import Select from "react-select";
import { customStyles } from "./lib/selectStyles";

// Used for non-authorized access
const apiKey = "AIzaSyApHk347S1T57kwsI5kiitUriEyr89NHxo";

const discoveryDocs = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

const PLUGIN_TITLE = "Google Sheets Importer";
const PLUGIN_WIDTH = 400;
const PLUGIN_HEIGHT = 500;

export default function Importer() {
  const [error, setError] = useState<string>("");
  const [spreadsheetLink, spreadsheetLinkChange, setSpreadsheetLink] = useInput<
    string,
    HTMLInputElement
  >("", () => setError(""));
  const [chosenSpreadsheet, setChosenSpreadsheet] =
    useState<Required<gapi.client.sheets.Spreadsheet> | null>(null);
  const [chosenSheet, chosenSheetChange, setChosenSheet] = useInput<
    string,
    HTMLSelectElement
  >("", () => setError(""));
  const [useHeader, setUseHeader] = useState<boolean>(true);
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);
  const [customRange, customRangeChange, setCustomRange] = useInput<
    string,
    HTMLInputElement
  >("", () => setError(""));
  const [useAllColumns, setUseAllColumns] = useState<boolean>(true);
  const [columns, setColumns] = useState<string[]>([]);
  const [chosenColumns, setChosenColumns] = useState<string[]>([]);

  const dataContextNames = useDataContexts().map((c) => c.name);

  function resetState() {
    setError("");
    setSpreadsheetLink("");
    setChosenSpreadsheet(null);
    setChosenSheet("");
    setUseHeader(true);
    setUseCustomRange(false);
    setCustomRange("");
    setUseAllColumns(true);
    setColumns([]);
    setChosenColumns([]);
  }

  // Fetch column names to fill the column name dropdown
  useEffect(() => {
    (async () => {
      if (
        chosenSpreadsheet === null ||
        chosenSheet === "" ||
        (useCustomRange && customRange === "")
      ) {
        setUseAllColumns(true);
        setColumns([]);
        return;
      }

      try {
        const columns = await getColumnNamesFromSheet(
          chosenSpreadsheet.spreadsheetId,
          chosenSheet,
          useCustomRange ? customRange : undefined
        );
        setColumns(columns);
        if (columns.length === 0) {
          setUseAllColumns(true);
        }
      } catch (e) {
        setUseAllColumns(true);
        setColumns([]);
      }
    })();
  }, [chosenSpreadsheet, chosenSheet, useCustomRange, customRange]);

  const onClientLoad = useCallback(async () => {
    gapi.client.init({
      discoveryDocs,
      apiKey,
    });
  }, []);

  // Load Google APIs upon mounting
  useEffect(() => {
    (async () => {
      try {
        await initializePlugin(PLUGIN_TITLE, PLUGIN_WIDTH, PLUGIN_HEIGHT);
      } catch (e) {
        setError("This plugin must be used within CODAP.");
        return;
      }
      gapi.load("client", onClientLoad);
    })();
  }, [onClientLoad]);

  async function querySheetFromLink() {
    let sheet;

    try {
      sheet = await getSheetFromId(getSpreadsheetIdFromLink(spreadsheetLink));
    } catch (e) {
      setError(
        "Please enter a valid Google Sheets link and make sure that the sheet is public."
      );
      return;
    }

    setChosenSpreadsheet(sheet);

    // Set first sheet as chosen
    if (sheet.sheets.length > 0) {
      setChosenSheet(sheet.sheets[0].properties?.title as string);
    }
  }

  async function importSheet(e: React.FormEvent) {
    e.preventDefault();

    if (chosenSpreadsheet === null) {
      setError("Please choose a sheet to import.");
      return;
    }

    if (useCustomRange && customRange === "") {
      setError('Please enter a range or choose "All values".');
      return;
    }

    const range = formatRange(
      chosenSheet,
      useCustomRange ? customRange : undefined
    );

    let data;

    try {
      data = await getDataFromSheet(chosenSpreadsheet.spreadsheetId, range);
    } catch (e) {
      if (e instanceof InvalidRangeError) {
        setError("Please enter a valid range. E.g. A1:C6.");
      } else if (e instanceof GeneralAPIError) {
        setError("An unknown Google Sheets error occured. Please try again.");
      }
      return;
    }

    if (data.length === 0) {
      setError(
        "Please enter a different range: the given range contains no values."
      );
      return;
    }

    const tableTitle = uniqueName(
      chosenSpreadsheet.properties.title !== undefined
        ? `${chosenSpreadsheet.properties.title}/${chosenSheet}`
        : "Untitled Sheet",
      dataContextNames
    );

    try {
      const { name: contextName } = await createContextWithDataset(
        makeDatasetFromSheetsData(
          data,
          useHeader,
          useAllColumns ? undefined : chosenColumns
        ),
        tableTitle,
        undefined,
        {
          source: chosenSpreadsheet.spreadsheetUrl,
          importDate: new Date().toString(),
        }
      );
      await createTable(contextName, contextName);
    } catch (e) {
      setError(
        "Something went wrong when creating a table. Try again with different data or after refreshing the page."
      );
      return;
    }

    // Done importing, dismiss the plugin
    dismissPlugin();
  }

  function cancelImport() {
    resetState();
  }

  function toggleHeader() {
    setUseHeader(!useHeader);
  }

  function useCustomColumns() {
    if (columns.length === 0) {
      return;
    }
    clearErrorAnd(() => setUseAllColumns(false))();
  }

  function clearErrorAnd(f: () => void) {
    return () => {
      setError("");
      f();
    };
  }

  return (
    <>
      {error !== "" && <ErrorDisplay message={error} />}
      {chosenSpreadsheet === null ? (
        <SheetLinkDialog
          spreadsheetLink={spreadsheetLink}
          onChange={spreadsheetLinkChange}
          onNext={querySheetFromLink}
        />
      ) : (
        <form onSubmit={importSheet}>
          <div className="input-group">
            <h3>Select a Sheet</h3>
            <select value={chosenSheet} onChange={chosenSheetChange}>
              {chosenSpreadsheet.sheets.map((sheet) => (
                <option
                  key={sheet.properties?.index}
                  value={sheet.properties?.title}
                >
                  {sheet.properties?.title}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <h3>Column Names</h3>
            <input
              type="checkbox"
              id="useHeader"
              onChange={toggleHeader}
              checked={useHeader}
            />
            <label htmlFor="useHeader">Use first row as column names</label>
          </div>

          <div className="input-group">
            <h3>Range to Import</h3>
            <input
              type="radio"
              id="all"
              checked={!useCustomRange}
              onClick={clearErrorAnd(() => setUseCustomRange(false))}
            />
            <label htmlFor="all">All values</label>
            <br />
            <input
              type="radio"
              checked={useCustomRange}
              onClick={clearErrorAnd(() => setUseCustomRange(true))}
            />
            <input
              type="text"
              placeholder="Custom range, e.g. A1:C6"
              value={customRange}
              onFocus={clearErrorAnd(() => setUseCustomRange(true))}
              onChange={customRangeChange}
              required={useCustomRange}
            />
          </div>

          {useHeader && (
            <div className="input-group">
              <h3>Columns</h3>
              <input
                type="radio"
                id="allColumns"
                checked={useAllColumns}
                onClick={clearErrorAnd(() => setUseAllColumns(true))}
              />
              <label htmlFor="allColumns">All columns</label>
              <br />
              <div id="column-selector-row">
                <input
                  type="radio"
                  checked={!useAllColumns}
                  disabled={columns.length === 0}
                  onChange={useCustomColumns}
                />
                <Select
                  styles={customStyles}
                  isMulti
                  isDisabled={columns.length === 0}
                  options={columns.map((n) => ({ value: n, label: n }))}
                  onChange={(selected) => {
                    setChosenColumns(selected.map((s) => s.value));
                  }}
                  onFocus={useCustomColumns}
                />
              </div>
            </div>
          )}

          <div id="submit-buttons" className="input-group">
            <button type="submit">Import</button>
            <button onClick={cancelImport}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
