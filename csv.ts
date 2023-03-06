// @deno-types="https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.d.mts"
import PocketBase, {
  Collection,
  SchemaField,
} from "https://unpkg.com/pocketbase@0.12.0/dist/pocketbase.es.mjs";
import "https://deno.land/std@0.178.0/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import { parseCsv } from "./utils/csv.ts";
import { createSchema, parseData } from "./utils/pocketbase.ts";

/**
 * Structures and populates a new collection from a CSV file.
 * @returns
 */
async function importCsv() {
  // config data
  const pbUrl = Deno.env.get("POCKETBASE_URL") ?? "http://localhost:8090";
  const adminName = Deno.env.get("ADMIN_EMAIL") ?? "";
  const adminPass = Deno.env.get("ADMIN_PASSWORD") ?? "";

  // parse CLI args
  const options = parse(Deno.args, {
    string: ["input", "delimiter", "quote"],
    boolean: ["id", "lf"],
    default: {
      /**
       * Name of the CSV file to import.
       */
      input: null,
      /**
       * Value separator (defaults to `,`).
       */
      delimiter: ",",
      /**
       * Quote character (defaults to `'`).
       */
      quote: "'",
      /**
       * Flag to always set `_id` column type to Plain text (detected by default).
       */
      id: false,
      /**
       * Whether LF end-of-line should be used (defaults to CRLF).
       */
      lf: false,
    },
  });

  if (options.input === null) {
    console.error("%cOptionError: CSV file name not supplied", "color: red");
    return;
  }

  // parser options
  const csvOptions = {
    columnSeparator: options.delimiter,
    lineSeparator: options.lf ? "\n" : "\r\n",
    quote: options.quote,
  };

  // parses CSV
  const data = await parseCsv(options.input, csvOptions);

  // empty file
  if (data === null) {
    console.error(
      `%c[Import] No data to import from ${options.input}`,
      "color: red",
    );
    return;
  }

  // sanitize the file name for collection name
  const collectName = options.input.replace(".csv", "");

  // connect to pocketbase
  const pb = new PocketBase(pbUrl);

  // authenticate as super admin
  const _authResponse = await pb.admins.authWithPassword(adminName, adminPass);

  // collection schema object
  const schema: SchemaField[] = createSchema(data, options.id);

  const creationDate = new Date().toISOString();

  // the new collection
  const collection = new Collection({
    name: collectName,
    type: "base",
    system: false,
    schema,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    options: {},
    created: creationDate,
    updated: creationDate,
  });

  // show the submitted collection
  console.log(collection);

  // create the new collection
  // import will fail if a collection with the same name exists
  await pb.collections.import([collection]);

  console.log(
    `%c[Import] Collection '${collectName}' created!`,
    "color: green",
  );

  // rows to be sent via PocketBase API
  const rows = parseData(data, schema);

  // number of successfully inserted rows
  let insertCount = 0;

  for (insertCount; insertCount < rows.length; insertCount++) {
    try {
      await pb.collection(collectName).create(rows[insertCount], {
        "$autoCancel": false,
      });
    } catch (e) {
      // breaks on first error
      console.error(e);
      break;
    }
  }

  const color = insertCount === rows.length ? "green" : "orange";
  console.log(
    `%c[Import] Imported rows: ${insertCount}/${rows.length}`,
    `color: ${color}`,
  );
}

importCsv();
