import PocketBase from 'pocketbase';
import "https://deno.land/std@0.178.0/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import { parseData, readCsv } from "./utils/csv.ts";
import { createSchema } from "./utils/pocketbase.ts";
import { Collection } from "./types/pocketbase.ts";

/**
 * Structures and populates a new collection from a CSV file.
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
    Deno.exit(-1);
  }

  // read the file
  const data = await readCsv(options.input, options);
  
  if (data === null) {
    Deno.exit(-1);
    return
  }
  // sanitize the file name for collection name
  const collectionName = options.input.replace(".csv", "");

  // connect to pocketbase
  const pb = new PocketBase(pbUrl);

  // authenticate as super admin
  const _authResponse = await pb.admins.authWithPassword(adminName, adminPass);

  // collection schema object
  const fields = createSchema(data, options.id, "csv");

  const creationDate = new Date().toISOString();

  // the new collection
  const collection: Collection = {
    name: collectionName,
    type: "base",
    system: false,
    fields,
    indexes: [],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };

  // show the submitted collection
  console.log(collection);

  // create the new collection
  // import will fail if a collection with the same name exists
  await pb.collections.import([collection]);

  console.log(
    `%c[Import] Collection '${collectionName}' created!`,
    "color: green",
  );

  // rows to be sent via PocketBase API
  const rows = parseData(data, fields);

  console.log(`[Import] Importing ${rows.length} rows...`);

  const batch = pb.createBatch();
  for (let rowCount = 0; rowCount < rows.length; rowCount++)
    batch.collection(collectionName).create(rows[rowCount])
  
  try {
    const result = await batch.send();
    let createdCount = 0;
    for (const reqRes of result) {
      if (reqRes.status === 200)
        createdCount++;
    }
    const color = createdCount === data.length ? "green" : "orange";
    console.log(
      `%c[Import] Imported rows: ${createdCount}/${data.length}`,
      `color: ${color}`,
    );
  } catch(err) {
    console.error(err);
  }
}

importCsv();
