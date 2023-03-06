import { readCSVObjects } from "https://deno.land/x/csv@v0.8.0/reader.ts";
import { ParserOptions, RawRow } from "../types/csv.ts";

/**
 * Parse a file to string-based object array.
 * @param filename - Name of the .csv file (with extension)
 * @param csvOptions - Options for the parser
 * @returns
 */
export async function parseCsv(
  filename: string | null,
  csvOptions: ParserOptions,
): Promise<RawRow[] | null> {
  const results: RawRow[] = [];

  try {
    const f = await Deno.open(`./input/${filename}`);

    for await (const obj of readCSVObjects(f, csvOptions)) {
      results.push(obj);
    }

    f.close();
  } catch (e) {
    console.error(`%c${e}`, "color: red");
    return null;
  }

  // No columns
  if (results.length === 0) {
    return null;
  }

  return results;
}

/**
 * Parses a boolean with truthy values being `'true'` and `'1'`.
 * @param value Raw string value
 * @returns
 */
export function parseBool(value: string): boolean {
  return ["true", "1"].includes(value);
}
