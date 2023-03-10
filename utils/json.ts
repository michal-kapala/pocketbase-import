// @deno-types="https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.d.mts"
import { SchemaField } from "https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.mjs";
import { RawJsonRow } from "../types/json.ts";
import { POCKETBASE_SYSFIELD } from "../types/pocketbase.ts";
import { createSchemaField } from "./pocketbase.ts";
import { isDate, isEmail } from "./regex.ts";

/**
 * Reads an array of rows from a JSON file.
 * @param filename The extension-inclusive name of input file.
 * @returns
 */
export async function readJson(filename: string) {
  const json = await parseJson(filename);

  if (json === null) {
    console.error(`%cFileError: Could not read ${filename}`, "color: red");
    Deno.exit(-3);
  }

  if (!Array.isArray(json)) {
    console.error(`%cFileError: ${filename} is not an array`, "color: red");
    Deno.exit(-4);
  }

  if (json.length === 0) {
    console.error(`%cFileError: No data in ${filename}`, "color: red");
    Deno.exit(-5);
  }

  const arrayKeys = json.keys();

  const rows: RawJsonRow[] = [];

  for (const key of arrayKeys) {
    rows.push(json[key] as RawJsonRow);
  }

  return rows;
}

/**
 * Parses a JSON file.
 * @param filename Name of the .json file (with extension)
 * @returns
 */
async function parseJson(filename: string) {
  try {
    return JSON.parse(await Deno.readTextFile(`./input/${filename}`));
  } catch (e) {
    console.error(`%c${e}`, "color: red");
    Deno.exit(-2);
  }
}

/**
 * Matches column data against regular expressions to deduct the PocketBase type and returns a column definition.
 * @param data Raw input data.
 * @param prop Column name.
 * @returns `SchemaField`
 */
export function addSchemaField(data: RawJsonRow[], prop: string): SchemaField {
  // The new column is prefixed with underscore if it conflicts with a system field
  const targetProp = POCKETBASE_SYSFIELD.includes(prop.toLowerCase())
    ? `_${prop}`
    : prop;

  let value = data[0][prop];

  // if necessary find a value
  if (value === null) {
    for (let i = 0; i < data.length; i++) {
      if (data[i][prop] != null) {
        value = data[i][prop];
      }
      break;
    }
  }

  // all values are null
  if (value == null) {
    return createSchemaField(targetProp, "text");
  }

  switch (typeof value) {
    case "boolean":
      return createSchemaField(targetProp, "bool");
    case "number":
    case "bigint":
      return createSchemaField(targetProp, "number");
    case "string":
      if (isEmail(data, targetProp)) {
        return createSchemaField(targetProp, "email");
      }
      if (isDate(data, targetProp)) {
        return createSchemaField(targetProp, "date");
      }
      return createSchemaField(targetProp, "text");
    case "object":
      return createSchemaField(targetProp, "json");
    default:
      return createSchemaField(targetProp, "text");
  }
}

/**
 * Renames properties conflicting with system column names.
 * @param data Data rows.
 * @returns
 */
export function resolveConflicts(data: RawJsonRow[]): RawJsonRow[] {
  const rows: RawJsonRow[] = [];

  for (const r of data) {
    const row = r;
    const keys = Object.keys(r);
    for (const key of keys) {
      if (POCKETBASE_SYSFIELD.includes(key.toLowerCase())) {
        const value = r[key];
        delete row[key];
        const newKey = `_${key}`;
        row[newKey] = value;
      }
    }
    rows.push(row);
  }

  return rows;
}
