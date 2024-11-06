import { RawCsvRow } from "../types/csv.ts";
import { RawJsonRow } from "../types/json.ts";
import {
  POCKETBASE_TYPE,
  PocketbaseRowSchema,
  PocketbaseType,
  SchemaField
} from "../types/pocketbase.ts";
import { addSchemaField as addCsvSchemaField } from "./csv.ts";
import { addSchemaField as addJsonSchemaField } from "./json.ts";

/**
 * Finds column's type in the schema.
 * @param column Column name.
 * @param schema PocketBase collection schema.
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
    return "text"
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

    case POCKETBASE_TYPE.URL:
      return POCKETBASE_TYPE.URL;

    default:
      console.error(
        `%cPbTypeError: Unsupported type '${schemaField.type}'`,
        "color: red",
      );
      Deno.exit(-2);
      return "text"
  }
}

/**
 * Builds a `SchemaField` object based on data type.
 * @param name Column name.
 * @param type PocketBase type.
 * @returns
 */
export function createSchemaField(
  name: string,
  type: PocketbaseType,
): SchemaField {
  switch (type) {
    case POCKETBASE_TYPE.BOOL:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {},
      };
    case POCKETBASE_TYPE.NUMBER:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      };
    case POCKETBASE_TYPE.PLAIN_TEXT:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: "",
        },
      };
    case POCKETBASE_TYPE.EMAIL:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          exceptDomains: null,
          onlyDomains: null,
        },
      };
    case POCKETBASE_TYPE.JSON:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 2000000
        },
      };
    case POCKETBASE_TYPE.DATETIME:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: "",
          max: "",
        },
      };
    case POCKETBASE_TYPE.URL:
      return {
        name,
        type,
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          exceptDomains: null,
          onlyDomains: null,
        },
      };
  }
}

/**
 * Creates a row object schema from PocketBase collection schema.
 * @param schema PocketBase collection schema.
 * @returns
 */
export function generateRowSchema(schema: SchemaField[]): PocketbaseRowSchema {
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
 * @param data Raw input data.
 * @returns
 */
// deno-lint-ignore no-explicit-any
export function createSchema(
  data: { [key: string]: any },
  stringifyId: boolean,
  inputFormat: "csv" | "json",
) {
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
      schema.push(
        inputFormat === "csv"
          ? addCsvSchemaField(data as RawCsvRow[], prop)
          : addJsonSchemaField(data as RawJsonRow[], prop),
      );
    }
  }

  return schema;
}
