import { RawCsvRow } from "../types/csv.ts";

/**
 * Checks if the column type could be `Bool`.
 * @param data Sample data.
 * @param prop Validated property.
 * @returns
 */
export function isBool(data: RawCsvRow[], prop: string): boolean {
  const zeroOrOne = /^(0|1)$/;
  const trueOrFalse = /^(true|false)$/;

  let values = 0;
  let matched = 0;

  try {
    data.forEach((obj) => {
      // could be nullable
      if (obj[prop] !== "") {
        values++;
        if (
          obj[prop].match(zeroOrOne) !== null ||
          obj[prop].match(trueOrFalse) !== null
        ) {
          matched++;
        }
      }
    });
  } catch (e) {
    console.error(e);
  }

  // an empty column will return false
  return matched === values && matched > 0;
}

/**
 * Checks if the column type could be `Number` (integer or floating point).
 * @param data Sample data.
 * @param prop Validated property.
 * @returns
 */
export function isNumber(data: RawCsvRow[], prop: string): boolean {
  const integer = /^-?[0-9]+$/;
  const float = /^-?[0-9]+\.[0-9]*$/;

  let values = 0;
  let matched = 0;

  data.forEach((obj) => {
    // could be nullable
    if (obj[prop] !== "") {
      values++;
      if (
        obj[prop].match(integer) !== null ||
        obj[prop].match(float) !== null
      ) {
        matched++;
      }
    }
  });

  // an empty column will return false
  return matched === values && matched > 0;
}

/**
 * Checks if the column type could be `Url`.
 * @param data Sample data.
 * @param prop Validated property.
 * @returns 
 */
export function isUrl(data: RawCsvRow[], prop: string): boolean {
  let values = 0;
  let parsed = 0;

  data.forEach((obj) => {
    if (obj[prop] !== "" && obj[prop] !== null) {
      values++;
      try {
        new URL(obj[prop]);
        parsed++;
      } // deno-lint-ignore no-empty
      catch {}
    }
  });

  // an empty column will return false
  return parsed === values && parsed > 0;
}

/**
 * Checks if the column type could be `Email`.
 * @param data Sample data.
 * @param prop Validated property.
 * @returns
 */
export function isEmail(
  data: { [key: string]: string }[],
  prop: string,
): boolean {
  const pattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

  let values = 0;
  let matched = 0;

  data.forEach((obj) => {
    // could be nullable
    // - empty strings for CSV
    // - null values for JSON
    if (obj[prop] !== "" && obj[prop] !== null) {
      values++;
      if (obj[prop].match(pattern) !== null) {
        matched++;
      }
    }
  });

  // an empty column will return false
  return matched === values && matched > 0;
}

/**
 * Parses the column values as JSON.
 * @param data Sample data.
 * @param prop Validated property.
 * @returns
 */
export function isJson(data: RawCsvRow[], prop: string): boolean {
  let values = 0;
  let parsed = 0;

  data.forEach((obj) => {
    // could be nullable
    if (obj[prop] !== "") {
      values++;
      // looks for an exception
      try {
        JSON.parse(obj[prop]);
        parsed++;
      } // deno-lint-ignore no-empty
      catch {}
    }
  });

  // an empty column will return false
  return parsed === values && parsed > 0;
}

/**
 * Parses the column values using `Date.parse()`.
 * @param data Sample data.
 * @param prop Validated property.
 * @returns
 */
export function isDate(
  data: { [key: string]: string }[],
  prop: string,
): boolean {
  let values = 0;
  let parsed = 0;

  data.forEach((obj) => {
    // could be nullable
    // - empty strings for CSV
    // - null values for JSON
    if (obj[prop] !== "" && obj[prop] !== null) {
      values++;
      const timestamp = Date.parse(obj[prop]);
      if (!isNaN(timestamp)) {
        parsed++;
      }
    }
  });

  // an empty column will return false
  return parsed === values && parsed > 0;
}
