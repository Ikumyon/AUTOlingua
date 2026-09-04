import { failure, success, type Result } from './result';

declare const identifierBrand: unique symbol;

export type Identifier<Tag extends string = string> = string & { readonly [identifierBrand]: Tag };

export const identifierFrom = <Tag extends string = string>(
  value: string,
): Result<Identifier<Tag>, 'empty_identifier'> => {
  const normalized = value.trim();
  return normalized.length > 0
    ? success(normalized as Identifier<Tag>)
    : failure('empty_identifier');
};
