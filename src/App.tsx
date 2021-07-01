import React, { useState, useEffect, useCallback } from "react";
import "./codap.css";
import "./App.css";
import { initializePlugin, createTableWithDataset } from "codap-phone";
import { useInput } from "./hooks";
import { getDataFromSheet, makeDataset } from "./util";
import Select from "react-select";

// Used for non-authorized access
const apiKey = "AIzaSyApHk347S1T57kwsI5kiitUriEyr89NHxo";

const discoveryDocs = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

const PLUGIN_TITLE = "Google Sheets Importer";
const PLUGIN_WIDTH = 400;
const PLUGIN_HEIGHT = 500;

export default function App() {
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
  }

  async function querySheetFromLink() {
    let sheet;

    try {
      sheet = (
        await gapi.client.sheets.spreadsheets.get({
          spreadsheetId: spreadsheetLink,
        })
      ).result;
    } catch (e) {
      setError(e.result.error.message);
      return;
    }

    setChosenSpreadsheet(sheet as Required<gapi.client.sheets.Spreadsheet>);

    // Set first sheet as chosen
    if (sheet.sheets && sheet.sheets.length > 0) {
      setChosenSheet(sheet.sheets[0].properties?.title as string);
    }
  }

  async function importSheet() {
    if (chosenSpreadsheet === null) {
      setError("Please choose a spreadsheet.");
      return;
    }

    if (useCustomRange && customRange === "") {
      setError("Please select a valid range.");
      return;
    }

    const range = useCustomRange
      ? `${chosenSheet}!${customRange}`
      : chosenSheet;

    let data;

    try {
      data = await getDataFromSheet(chosenSpreadsheet.spreadsheetId, range);
    } catch (e) {
      setError(e.message);
      return;
    }

    if (data.length === 0) {
      setError("Specified range is empty.");
      return;
    }

    let attributeNames: string[];
    let dataRows: unknown[][];
    if (useHeader) {
      attributeNames = data[0].map(String);
      dataRows = data.slice(1);
    } else {
      attributeNames = data[0].map((_value, index) => `Column ${index}`);
      dataRows = data;
    }
    await createTableWithDataset(
      makeDataset(attributeNames, dataRows),
      chosenSpreadsheet.properties.title
    );
    resetState();
  }

  function cancelImport() {
    resetState();
  }

  function toggleHeader() {
    setUseHeader(!useHeader);
  }

  function clearErrorAnd(f: () => void) {
    return () => {
      setError("");
      f();
    };
  }

  return (
    <>
      {error !== "" && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}
      {chosenSpreadsheet !== null ? (
        <>
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
              placeholder="A1:C6"
              value={customRange}
              onFocus={clearErrorAnd(() => setUseCustomRange(true))}
              onChange={customRangeChange}
            />
          </div>

          {useHeader && (
            <div className="input-group">
              <h3>Columns</h3>
              <input
                type="radio"
                id="all"
                checked={useAllColumns}
                onClick={clearErrorAnd(() => setUseAllColumns(true))}
              />
              <label htmlFor="all">All columns</label>
              <br />
              <input
                type="radio"
                checked={!useAllColumns}
                onClick={clearErrorAnd(() => setUseAllColumns(false))}
              />
              <Select options={[]} />
            </div>
          )}

          <div id="submit-buttons" className="input-group">
            <button onClick={importSheet}>Import</button>
            <button onClick={cancelImport}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="input-group">
          <h3>Public Spreadsheet Link</h3>
          <div style={{ display: "flex" }}>
            <input
              style={{ width: "300px" }}
              type="text"
              value={spreadsheetLink}
              onChange={spreadsheetLinkChange}
            />
            <button style={{ marginLeft: "5px" }} onClick={querySheetFromLink}>
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
