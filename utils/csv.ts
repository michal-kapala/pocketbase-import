import {
  CommonCSVReaderOptions,
  readCSVObjects,
} from "https://deno.land/x/csv@v0.8.0/reader.ts";
import {
  CsvOptions,
  ParsedRow,
  ParserOptions,
  RawCsvRow,
} from "../types/csv.ts";
// @deno-types="https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.d.mts"
import { SchemaField } from "https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.mjs";
import {
  POCKETBASE_SYSFIELD,
  POCKETBASE_TYPE,
  PocketbaseRowSchema,
  PocketbaseType,
} from "../types/pocketbase.ts";
import { createSchemaField, generateRowSchema } from "./pocketbase.ts";
import { isBool, isDate, isEmail, isJson, isNumber, isUrl } from "./regex.ts";

/**
 * Reads raw data from a CSV file.
 * @param filename
 * @param options
 * @returns
 */
export async function readCsv(filename: string, options: CsvOptions) {
  // parser options
  const csvOptions = {
    columnSeparator: options.delimiter,
    lineSeparator: options.lf ? "\n" : "\r\n",
    quote: options.quote,
  } satisfies Partial<CommonCSVReaderOptions>;

  // parses CSV
  const data = await parseCsv(filename, csvOptions);

  if (data === null) {
    console.error(
      `%c[Import] No data to import from ${filename}`,
      "color: red",
    );
    Deno.exit(-2);
  }

  return data;
}

/**
 * Parse a file to string-based object array.
 * @param filename - Name of the .csv file (with extension)
 * @param csvOptions - Options for the parser
 * @returns
 */
async function parseCsv(
  filename: string | null,
  csvOptions: ParserOptions,
): Promise<RawCsvRow[] | null> {
  const data: RawCsvRow[] = [];

  try {
    const f = await Deno.open(`./input/${filename}`);

    for await (const obj of readCSVObjects(f, csvOptions)) {
      data.push(obj);
    }

    f.close();
  } catch (e) {
    console.error(`%c${e}`, "color: red");
    Deno.exit(-3);
  }

  // No columns
  if (data.length === 0) {
    return null;
  }

  return data;
}

/**
 * Parses a boolean with truthy values being `'true'` and `'1'`.
 * @param value Raw string value
 * @returns
 */
export function parseBool(value: string): boolean {
  return ["true", "1"].includes(value);
}

/**
 * Matches column data against regular expressions to deduct the PocketBase type and returns a column definition.
 * @param data - Raw parser output
 * @param prop - Column name
 * @returns `SchemaField`
 */
export function addSchemaField(data: RawCsvRow[], prop: string): SchemaField {
  // The new column is prefixed with underscore if it conflicts with a system field
  const targetProp = POCKETBASE_SYSFIELD.includes(prop.toLowerCase())
    ? `_${prop}`
    : prop;

  // Precedence is important, more restricted types are matched on first
  if (isBool(data, prop)) {
    return createSchemaField(targetProp, "bool");
  }

  if (isNumber(data, prop)) {
    return createSchemaField(targetProp, "number");
  }

  if (isEmail(data, prop)) {
    return createSchemaField(targetProp, "email");
  }

  if (isJson(data, prop)) {
    return createSchemaField(targetProp, "json");
  }

  if (isDate(data, prop)) {
    return createSchemaField(targetProp, "date");
  }

  if (isUrl(data, prop)) {
    return createSchemaField(targetProp, "url");
  }

  // Plain text is the default type
  return createSchemaField(targetProp, "text");
}

/**
 * Parses typed rows using Pocketbase collection schema.
 * @param data - Raw CSV parser output
 * @param schema - PocketBase collection schema
 * @returns
 */
export function parseData(
  data: RawCsvRow[],
  schema: SchemaField[],
): ParsedRow[] {
  const rows: ParsedRow[] = [];

  // create a row schema for the collection
  const rowSchema = generateRowSchema(schema);
  console.log("RowSchema", rowSchema);

  data.forEach((rawRow) => {
    rows.push(parseRow(rawRow, rowSchema));
  });

  return rows;
}

/**
 * Creates a typed row object from raw data using row schema.
 * @param rawRow - Raw row data
 * @param schema - Row type template
 * @returns
 */
function parseRow(rawRow: RawCsvRow, schema: PocketbaseRowSchema): ParsedRow {
  let parsedRow: ParsedRow = {};
  const keys = Object.keys(rawRow);

  keys.forEach((prop) => {
    // Handle conflicts with system names - add underscore
    const orgProp = prop;

    if (POCKETBASE_SYSFIELD.includes(prop.toLowerCase())) {
      prop = `_${prop}`;
    }

    const type = schema[prop];
    const value = parseValue(rawRow[orgProp], type);
    parsedRow = { ...parsedRow, [prop]: value };
  });

  return parsedRow;
}

/**
 * Parses a string to a correspending PocketBase type.
 * @param value
 * @param type
 * @returns
 */
// deno-lint-ignore no-explicit-any
function parseValue(value: string, type: PocketbaseType): any {
  switch (type) {
    case POCKETBASE_TYPE.BOOL:
      if (value == "") {
        return null;
      }
      return parseBool(value);
    case POCKETBASE_TYPE.NUMBER:
      if (value == "") {
        return null;
      }
      return parseFloat(value);
    case POCKETBASE_TYPE.JSON:
      if (value == "") {
        return null;
      }
      // this is safe as the values were try-parsed earlier for schema definition
      return JSON.parse(value);
    case POCKETBASE_TYPE.PLAIN_TEXT:
      return value !== "" ? value : null;
    case POCKETBASE_TYPE.EMAIL:
      return value !== "" ? value : null;
    case POCKETBASE_TYPE.DATETIME:
      return value !== "" ? value : null;
    case POCKETBASE_TYPE.URL:
      return value !== "" ? value : null;
    default:
      console.error(
        `%cPbTypeError: value parser for type '${type}' is not yet implemented.`,
        "color: red",
      );
      Deno.exit(-4);
  }
}
