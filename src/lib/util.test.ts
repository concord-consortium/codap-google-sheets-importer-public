import { getSpreadsheetIdFromLink } from "./util";

test("get correct id from link", () => {
  const result = getSpreadsheetIdFromLink(
    "https://docs.google.com/spreadsheets/d/1msOpjOzAYaQElzLluLzORVmaXMwipm3kr6VAcnlURUE/edit?usp=sharing"
  );
  expect(result).toBe("1msOpjOzAYaQElzLluLzORVmaXMwipm3kr6VAcnlURUE");
});

test("get correct id from link without '/edit'", () => {
  const result = getSpreadsheetIdFromLink(
    "https://docs.google.com/spreadsheets/d/1msOpjOzAYaQElzLluLzORVmaXMwipm3kr6VAcnlURUE"
  );
  expect(result).toBe("1msOpjOzAYaQElzLluLzORVmaXMwipm3kr6VAcnlURUE");
});

test("errors when given malformed link", () => {
  expect(() => getSpreadsheetIdFromLink("does not contain id")).toThrow(
    "Malformed link"
  );
});
