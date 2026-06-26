/**
 * Developer DB Explorer — Schema Introspection
 *
 * Walks a Mongoose model's schema paths to produce flat field descriptors the
 * structured edit form renders (typed inputs, enum dropdowns, read-only keys).
 *
 * @module app/api/lib/helpers/dev/schemaIntrospection
 *
 * Features:
 * - Maps each schema path to a DevFieldKind plus enum values when present
 * - Marks `_id` and timestamp fields as non-editable
 * - Surfaces the model's Date paths so the explorer can offer them as date filters
 */

import type { Model, SchemaType } from 'mongoose';
import type { DevFieldDescriptor, DevFieldKind } from '@shared/types/dev';

const READONLY_PATHS = new Set(['_id', '__v', 'createdAt', 'updatedAt']);

/** Mongoose SchemaType.instance string → explorer field kind. */
function toKind(instance: string | undefined): DevFieldKind {
  switch (instance) {
    case 'String':
      return 'string';
    case 'Number':
    case 'Decimal128':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'date';
    case 'ObjectID':
    case 'ObjectId':
      return 'objectId';
    case 'Array':
      return 'array';
    case 'Embedded':
    case 'Map':
      return 'embedded';
    default:
      return 'mixed';
  }
}

/** Reads enum values off a schema path, regardless of how they were declared. */
function readEnum(schemaType: SchemaType): string[] | undefined {
  const withEnum = schemaType as SchemaType & {
    enumValues?: string[];
    options?: { enum?: unknown };
  };
  if (Array.isArray(withEnum.enumValues) && withEnum.enumValues.length > 0) {
    return withEnum.enumValues.map(String);
  }
  const optionEnum = withEnum.options?.enum;
  if (Array.isArray(optionEnum) && optionEnum.length > 0) {
    return optionEnum.map(String);
  }
  return undefined;
}

/**
 * Produces the flat list of editable/read-only field descriptors for a model,
 * ordered by schema declaration order.
 */
export function describeSchema(model: Model<unknown>): DevFieldDescriptor[] {
  const fields: DevFieldDescriptor[] = [];

  for (const [path, schemaType] of Object.entries(model.schema.paths)) {
    if (path === '__v') continue;

    const kind = toKind(schemaType.instance);
    const required = Boolean(
      (schemaType as SchemaType & { isRequired?: boolean }).isRequired
    );
    // Nested objects/arrays/mixed are not safely editable via flat inputs.
    const editable =
      !READONLY_PATHS.has(path) &&
      kind !== 'array' &&
      kind !== 'embedded' &&
      kind !== 'mixed';

    fields.push({
      path,
      kind,
      required,
      editable,
      enumValues: readEnum(schemaType),
    });
  }

  return fields;
}

/** Returns the model's Date-typed paths — the selectable date-filter fields. */
export function listDateFields(model: Model<unknown>): string[] {
  const dateFields: string[] = [];
  for (const [path, schemaType] of Object.entries(model.schema.paths)) {
    if (toKind(schemaType.instance) === 'date') dateFields.push(path);
  }
  return dateFields;
}
