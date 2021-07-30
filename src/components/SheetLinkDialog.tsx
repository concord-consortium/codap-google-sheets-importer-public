import React from "react";

export function SheetLinkDialog({
  spreadsheetLink,
  onChange,
  onNext,
}: {
  spreadsheetLink: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="input-group">
        <p>Make your sheet public, then paste the link below</p>
      </div>
      <div className="input-group">
        <h3>Public Spreadsheet Link</h3>
        <div style={{ display: "flex" }}>
          <input
            style={{ width: "300px" }}
            type="text"
            value={spreadsheetLink}
            onChange={onChange}
          />
          <button style={{ marginLeft: "5px" }} onClick={onNext}>
            Next
          </button>
        </div>
      </div>
    </>
  );
}
