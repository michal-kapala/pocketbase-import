import { RawCsvRow } from "../types/csv.ts";
import { RawJsonRow } from "../types/json.ts";
import {
  POCKETBASE_TYPE,
  PocketbaseRowSchema,
  PocketbaseType,
  SchemaField,
  BoolField,
  NumberField,
  TextField,
  EmailField,
  JsonField,
  DateField,
  UrlField
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
    return "text";
  }

  if (schemaField.type == null) {
    console.error(
      `%cSchemaError: Column type missing for '${column}'`,
      "color: red",
    );
    Deno.exit(-1);
    return "text";
  }

  return schemaField.type;
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
        hidden: false,
        name,
        presentable: false,
        required: false,
        system: false,
        type,
      } as BoolField;
    case POCKETBASE_TYPE.NUMBER:
      return {
        hidden: false,
        max: undefined,
        min: undefined,
        name,
        onlyInt: false,
        presentable: false,
        required: false,
        system: false,
        type,
      } as NumberField;
    case POCKETBASE_TYPE.PLAIN_TEXT:
      return {
        autogeneratePattern: "",
        hidden: false,
        max: 0,
        min: 0,
        name,
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type,
      } as TextField;
    case POCKETBASE_TYPE.EMAIL:
      return {
        exceptDomains: undefined,
        hidden: false,
        name,
        onlyDomains: undefined,
        presentable: false,
        required: false,
        system: false,
        type,
      } as EmailField;
    case POCKETBASE_TYPE.JSON:
      return {
        hidden: false,
        maxSize: 0,
        name,
        presentable: false,
        required: false,
        system: false,
        type,
      } as JsonField;
    case POCKETBASE_TYPE.DATETIME:
      return {
        hidden: false,
        max: "",
        min: "",
        name,
        presentable: false,
        required: false,
        system: false,
        type,
      } as DateField;
    case POCKETBASE_TYPE.URL:
      return {
        hidden: false,
        exceptDomains: undefined,
        name,
        onlyDomains: undefined,
        presentable: false,
        required: false,
        system: false,
        type,
      } as UrlField;
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
