import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

const OPENAPI_PATH = path.resolve(__dirname, "../../app/backend/openapi.yaml");
const spec = yaml.load(fs.readFileSync(OPENAPI_PATH, "utf8")) as any;

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const schemas = spec.components.schemas as Record<string, unknown>;
for (const [name, schema] of Object.entries(schemas)) {
  const id = `#/components/schemas/${name}`;
  ajv.addSchema({ ...(schema as object), $id: id }, id);
}

const cache = new Map<string, ValidateFunction>();

function validatorFor(schemaName: string): ValidateFunction {
  if (!cache.has(schemaName)) {
    const id = `#/components/schemas/${schemaName}`;
    const validate = ajv.getSchema(id);
    if (!validate) throw new Error(`No schema named "${schemaName}" in openapi.yaml`);
    cache.set(schemaName, validate);
  }
  return cache.get(schemaName)!;
}

/**
 * The heart of "contract" testing: assert a live response body against the
 * same OpenAPI schema that documents the API, rather than hand-picking a
 * few fields to check. A field renamed or dropped on either side of the
 * contract fails here even if no test author remembered to assert on it.
 */
export function assertMatchesSchema(schemaName: string, data: unknown): void {
  const validate = validatorFor(schemaName);
  const valid = validate(data);
  if (!valid) {
    throw new Error(
      `Response does not match OpenAPI schema "${schemaName}":\n` +
        `${JSON.stringify(validate.errors, null, 2)}\n\n` +
        `Received:\n${JSON.stringify(data, null, 2)}`
    );
  }
}
