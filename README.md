# Overview

PocketBase data import tools for CSV and JSON files made using
[PocketBase JS SDK](https://github.com/pocketbase/js-sdk).

Automatically creates typed PocketBase collection and populates it with data.

Columns conflicting with PocketBase's autogenerated system fields (`id`,
`created`, `updated`; case-insensitive check, target column name's case is not
affected) are prefixed with `_`. Collection conflict will cause the import to
fail without any changes to the database.

No rules, options or constraints are set for the new collection (see the import
log for a full structure). You can modify them after the import from
PocketBase's dashboard.

## Types

`pocketbase-import` detects types using regular expressions. Currently supported
PocketBase types are:

- `Bool`
- `Number`
- `Plain text`
- `Email`
- `DateTime`
- `JSON`
- `Url`

# Configuration

Install the latest [Deno runtime](https://deno.com/) to run the scripts.

In the root directory create `.env` file with the following environment
variables:

- `ADMIN_EMAIL` (required) - superadmin email
- `ADMIN_PASSWORD` (required) - superadmin password
- `POCKETBASE_URL` (optional) - PocketBase app URL, defaults to local instance

Place your import files inside of `input` directory.

Make sure the target PocketBase instance is running and pointed to by
`POCKETBASE_URL`.

# Options

You can change the default import options to your needs:

| Name      | Files    | Required | Description                                                                                | Example use         |
| --------- | -------- | -------- | ------------------------------------------------------------------------------------------ | ------------------- |
| input     | CSV/JSON | Yes      | The name of the input file (with extension)                                                | --input=example.csv |
| id        | CSV/JSON | No       | Indicates that `_id` column should be typed as plain text, the type is detected by default | --id                |
| lf        | CSV      | No       | LF (`\n`) EOL character will be used instead of default CRLF (`\r\n`)                      | --lf                |
| delimiter | CSV      | No       | Column value separator, defaults to `,`                                                    | --delimiter=";"     |
| quote     | CSV      | No       | Value quote character, defaults to `'`                                                     | --quote="~"         |

# CSV

The import is **not** multiline-safe, so if you have a file with strings
spanning across multiple lines the best option for you is to convert the input
file to JSON with tools like
[DB Browser for SQLite](https://sqlitebrowser.org/).

## Examples

Basic import (root directory):

```
deno run csv.ts --input=example.csv
```

Import without permission prompts and with `_id` column as text:

```
deno run --allow-read --allow-env --allow-net csv.ts --input=example.csv --id
```

Import with custom parser options (you need to adjust `example.csv`):

```
deno run csv.ts --input=example.csv --delimiter=";" --quote="~" --lf
```

# JSON

The required data format is an array of row objects.

## Examples

Basic import (root directory):

```
deno run json.ts --input=example.json
```

Import without permission prompts and with `_id` column as text:

```
deno run --allow-read --allow-env --allow-net json.ts --input=example.json --id
```
