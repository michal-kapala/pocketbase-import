import { CommonCSVReaderOptions } from "https://deno.land/x/csv@v0.8.0/reader.ts";

/**
 * Options object of `csv.readCSVObjects`.
 */
export type ParserOptions = Partial<CommonCSVReaderOptions>;

/**
 * Raw row object with string properties returned by `csv.readCSVObjects`.
 */
export type RawRow = {
  [key: string]: string;
};

/**
 * Row object with values parsed accordingly to collection schema.
 */
export type ParsedRow = {
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
};
