import type {
  FilterExpression,
  FilterOptions,
  FilterableEntry,
  LengthOperator,
  TextOperator,
} from './filter-expression';

const textMatches = (
  text: string,
  value: string,
  operator: TextOperator,
  caseSensitive: boolean,
): boolean => {
  if (operator === 'matches') {
    try {
      return new RegExp(value, caseSensitive ? '' : 'i').test(text);
    } catch {
      return false;
    }
  }
  const candidate = caseSensitive ? text : text.toLocaleLowerCase();
  const expected = caseSensitive ? value : value.toLocaleLowerCase();
  switch (operator) {
    case 'contains':
      return candidate.includes(expected);
    case 'equals':
      return candidate === expected;
    case 'starts-with':
      return candidate.startsWith(expected);
    case 'ends-with':
      return candidate.endsWith(expected);
  }
};

const lengthMatches = (length: number, expected: number, operator: LengthOperator): boolean => {
  switch (operator) {
    case '>':
      return length > expected;
    case '>=':
      return length >= expected;
    case '<':
      return length < expected;
    case '<=':
      return length <= expected;
    case '=':
      return length === expected;
  }
};

const fieldValue = (
  entry: FilterableEntry,
  field: 'key' | 'source' | 'translation' | 'tone',
): string => (field === 'tone' ? (entry.tone ?? '') : entry[field]);

export const evaluateFilter = (
  expression: FilterExpression,
  entry: FilterableEntry,
  options: FilterOptions = {},
): boolean => {
  const caseSensitive = options.caseSensitive ?? false;
  switch (expression.kind) {
    case 'and':
      return (
        evaluateFilter(expression.left, entry, options) &&
        evaluateFilter(expression.right, entry, options)
      );
    case 'or':
      return (
        evaluateFilter(expression.left, entry, options) ||
        evaluateFilter(expression.right, entry, options)
      );
    case 'not':
      return !evaluateFilter(expression.operand, entry, options);
    case 'stage':
      return entry.stage === expression.value;
    case 'length':
      return lengthMatches(
        fieldValue(entry, expression.field).length,
        expression.value,
        expression.operator,
      );
    case 'text':
      if (expression.field === 'any') {
        return (['key', 'source', 'translation'] as const).some((field) =>
          textMatches(
            fieldValue(entry, field),
            expression.value,
            expression.operator,
            caseSensitive,
          ),
        );
      }
      return textMatches(
        fieldValue(entry, expression.field),
        expression.value,
        expression.operator,
        caseSensitive,
      );
  }
};
