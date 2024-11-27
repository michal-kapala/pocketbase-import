import PocketBase from 'pocketbase';
import "https://deno.land/std@0.178.0/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import { readJson, resolveConflicts } from "./utils/json.ts";
import { createSchema } from "./utils/pocketbase.ts";
import { Collection } from './types/pocketbase.ts'

/**
 * Structures and populates a new collection from a JSON file.
 */
async function importJson() {
  // config data
  const pbUrl = Deno.env.get("POCKETBASE_URL") ?? "http://localhost:8090";
  const adminName = Deno.env.get("ADMIN_EMAIL") ?? "";
  const adminPass = Deno.env.get("ADMIN_PASSWORD") ?? "";

  // parse CLI args
  const options = parse(Deno.args, {
    string: ["input", "max_batch"],
    boolean: ["id"],
    default: {
      /**
       * Name of the JSON file to import (with extension).
       */
      input: null,
      /**
       * Flag to always set `_id` column type to Plain text (detected by default).
       */
      id: false,
      /**
       * Default max batch request size (configurable in PB dashboard).
       */
      max_batch: "50"
    },
  });

  if (options.input === null) {
    console.error("%cOptionError: JSON file name not supplied", "color: red");
    Deno.exit(-1);
  }

  let BATCH_SIZE = 50;
  try {
    BATCH_SIZE = parseInt(options.max_batch)
  } catch (err) {
    console.error("%cOptionError: invalid 'max_batch' value, should be an integer", "color: red");
    Deno.exit(-1);
  }

  // read the file
  const data = await readJson(options.input);

  // sanitize the file name for collection name
  const collectionName = options.input.replace(".json", "");

  // connect to pocketbase
  const pb = new PocketBase(pbUrl);

  // authenticate as super admin
  const _authResponse = await pb.admins.authWithPassword(adminName, adminPass);

  // collection schema object
  const fields = createSchema(data, options.id, "json");

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
  console.log("Collection", collection);

  // create the new collection
  // import will fail if a collection with the same name exists
  await pb.collections.import([collection], false);

  console.log(
    `%c[Import] Collection '${collectionName}' created!`,
    "color: green",
  );

  // prefix conflicting column names
  const rows = resolveConflicts(data);

  console.log(`[Import] Importing ${rows.length} rows...`);

  const chunks = Math.floor(rows.length / BATCH_SIZE);
  const batches = chunks * BATCH_SIZE < rows.length ? chunks + 1 : chunks;
  let createdCount = 0;
  let chunk = 0;
  while (chunk < batches) {
    // create new request
    console.log(`[Import] Batch request #${chunk+1}`);
    const batch = pb.createBatch();
    let chunkSize = chunk === batches - 1 ? rows.length % BATCH_SIZE : BATCH_SIZE;
    if (chunkSize === 0)
      chunkSize = BATCH_SIZE;
    for (let rowCount = 0; rowCount < chunkSize; rowCount++)
      batch.collection(collectionName).create(rows[chunk * BATCH_SIZE + rowCount])
    // send the chunk
    try {
      const result = await batch.send();
      // TODO: this should become a debug-level log
      //console.log("Array<BatchRequestResult>", result);
      let chunkCreatedCount = 0;
      for (const reqRes of result) {
        if (reqRes.status === 200)
          chunkCreatedCount++;
      }
      const color = chunkCreatedCount === chunkSize ? "green" : "orange";
      console.log(
        `%c[Import] Batch request #${chunk+1} - imported rows: ${chunkCreatedCount}/${chunkSize}`,
        `color: ${color}`,
      );
      createdCount += chunkCreatedCount;
    } catch(err) {
      console.error(err);
    }
    chunk++;
  }

  const color = createdCount === data.length ? "green" : "orange";
  console.log(
    `%c[Import] Imported rows: ${createdCount}/${data.length}`,
    `color: ${color}`,
  );
}

importJson();
