import {withStandardSchema, type ValidationResult} from '@rvf/core';
import type {ZodType} from 'zod';

type ZodSchemaType<Type> = Type extends ZodType<infer X> ? X : never;

export async function validateFormData<S extends ZodType>(
  schema: S,
  formData: FormData,
): Promise<ValidationResult<ZodSchemaType<S>>> {
  const validator = withStandardSchema(schema);

  return validator.validate(formData);
}
