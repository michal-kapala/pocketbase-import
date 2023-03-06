// @deno-types="https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.d.mts"
import { SchemaField } from "https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.mjs";
import { ParsedRow, RawRow } from "../types/csv.ts";
import {
  POCKETBASE_SYSFIELD,
  POCKETBASE_TYPE,
  PocketbaseRowSchema,
  PocketbaseType,
} from "../types/pocketbase.ts";
import { parseBool } from "./csv.ts";
import { isBool, isDate, isEmail, isJson, isNumber } from "./regex.ts";

/**
 * Matches column data against regular expressions to deduct the PocketBase type and returns a column definition.
 * @param data - Raw parser output
 * @param prop - Column name
 * @returns `SchemaField`
 */
export function addSchemaField(data: RawRow[], prop: string): SchemaField {
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

  // Plain text is the default type
  return createSchemaField(targetProp, "text");
}

/**
 * Finds column's type in the schema.
 * @param column - Column name
 * @param schema - PocketBase collection schema
 * @returns
 */
export function getSchemaType(
  column: string,
  schema: SchemaField[],
): PocketbaseType {
  const schemaField = schema.find((field) => field.name === column);

  // if somehow the data got structured wrong
  if (schemaField === undefined) {
    console.error(
      `%cSchemaError: Supplied column '${column}' not found in collection schema`,
      "color: red",
    );
    Deno.exit(-1);
  }

  switch (schemaField.type) {
    case POCKETBASE_TYPE.BOOL:
      return POCKETBASE_TYPE.BOOL;

    case POCKETBASE_TYPE.NUMBER:
      return POCKETBASE_TYPE.NUMBER;

    case POCKETBASE_TYPE.PLAIN_TEXT:
      return POCKETBASE_TYPE.PLAIN_TEXT;

    case POCKETBASE_TYPE.EMAIL:
      return POCKETBASE_TYPE.EMAIL;

    case POCKETBASE_TYPE.JSON:
      return POCKETBASE_TYPE.JSON;

    case POCKETBASE_TYPE.DATETIME:
      return POCKETBASE_TYPE.DATETIME;

    default:
      console.error(
        `%cPbTypeError: Unsupported type '${schemaField.type}'`,
        "color: red",
      );
      Deno.exit(-2);
  }
}

/**
 * Builds a `SchemaField` object based on data type.
 * @param name - Column name
 * @param type - PocketBase type
 * @returns
 */
function createSchemaField(name: string, type: PocketbaseType): SchemaField {
  switch (type) {
    case POCKETBASE_TYPE.BOOL:
      return new SchemaField({
        name,
        type,
        system: false,
        required: false,
        unique: false,
        options: {},
      });
    case POCKETBASE_TYPE.NUMBER:
      return new SchemaField({
        name,
        type,
        system: false,
        required: false,
        unique: false,
        options: {
          min: null,
          max: null,
        },
      });
    case POCKETBASE_TYPE.PLAIN_TEXT:
      return new SchemaField({
        name,
        type,
        system: false,
        required: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: "",
        },
      });
    case POCKETBASE_TYPE.EMAIL:
      return new SchemaField({
        name,
        type,
        system: false,
        required: false,
        unique: false,
        options: {
          min: null,
          max: null,
        },
      });
    case POCKETBASE_TYPE.JSON:
      return new SchemaField({
        name,
        type,
        system: false,
        required: false,
        unique: false,
        options: {},
      });
    case POCKETBASE_TYPE.DATETIME:
      return new SchemaField({
        name,
        type,
        system: false,
        required: false,
        unique: false,
        options: {
          min: null,
          max: null,
        },
      });
  }
}

/**
 * Creates a row object schema from PocketBase collection schema.
 * @param schema - PocketBase collection schema
 * @returns
 */
export function generateRowSchema(schema: SchemaField[]) {
  let instance: PocketbaseRowSchema = {};
  let fieldType: PocketbaseType;

  schema.forEach((field) => {
    fieldType = getSchemaType(field.name, schema);
    instance = { ...instance, [field.name]: fieldType };
  });

  return instance;
}

/**
 * Parses raw objects into PocketBase collection schema fields.
 * @param data - Raw parser output
 * @returns
 */
export function createSchema(
  data: RawRow[],
  stringifyId: boolean,
): SchemaField[] {
  const schema: SchemaField[] = [];

  // Seeks patterns in up to 1k records to avoid poor performance on large datasets
  if (data.length > 1000) {
    data = data.slice(0, 1000);
  }

  // Analyzes each column, deducts a type and creates a schema field
  for (const prop in data[0]) {
    // respect --id option
    if (stringifyId && prop.toLowerCase() === "id") {
      schema.push(createSchemaField(`_${prop}`, "text"));
    } else {
      schema.push(addSchemaField(data, prop));
    }
  }

  return schema;
}

/**
 * Parses typed rows using Pocketbase collection schema.
 * @param data - Raw CSV parser output
 * @param schema - PocketBase collection schema
 * @returns
 */
export function parseData(data: RawRow[], schema: SchemaField[]): ParsedRow[] {
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
function parseRow(rawRow: RawRow, schema: PocketbaseRowSchema): ParsedRow {
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
 * Parses a string to a value compliant with correspending PocketBase type.
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
    default:
      console.error(
        `%cPbTypeError: value parser for type '${type}' is not yet implemented.`,
        "color: red",
      );
      Deno.exit(-3);
  }
}
