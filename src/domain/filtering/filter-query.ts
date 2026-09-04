import { failure, success, type Result } from '../../shared';
import { isTranslationStage } from '../project/translation-stage';
import type {
  FilterExpression,
  LengthOperator,
  TextField,
  TextOperator,
} from './filter-expression';

export interface FilterParseError {
  readonly code:
    | 'unterminated_quote'
    | 'unexpected_token'
    | 'missing_operand'
    | 'mismatched_parenthesis'
    | 'invalid_predicate';
  readonly token: string | null;
  readonly position: number;
}

const tokenize = (query: string): Result<readonly string[], FilterParseError> => {
  const tokens: string[] = [];
  let current = '';
  let quoted = false;
  let escaped = false;

  const flush = (): void => {
    if (current.length > 0) tokens.push(current);
    current = '';
  };

  for (let position = 0; position < query.length; position += 1) {
    const character = query[position]!;
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\' && quoted) {
      current += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      current += character;
      continue;
    }
    if (!quoted && /\s/.test(character)) {
      flush();
      continue;
    }
    if (!quoted && ['(', ')', '|', '!'].includes(character)) {
      flush();
      tokens.push(character);
      continue;
    }
    current += character;
  }

  if (quoted) {
    return failure({ code: 'unterminated_quote', token: current, position: query.length });
  }
  flush();
  return success(tokens);
};

const unquote = (value: string): string =>
  value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    : value;

const normalizeField = (field: string): TextField | null => {
  if (field === 'original') return 'source';
  return ['key', 'source', 'translation', 'tone'].includes(field) ? (field as TextField) : null;
};

const normalizeTextOperator = (operator: string): TextOperator | null => {
  const aliases: Readonly<Record<string, TextOperator>> = {
    contains: 'contains',
    is: 'equals',
    equals: 'equals',
    starts_with: 'starts-with',
    'starts-with': 'starts-with',
    ends_with: 'ends-with',
    'ends-with': 'ends-with',
    matches_regex: 'matches',
    matches: 'matches',
  };
  return aliases[operator] ?? null;
};

const parsePredicate = (
  token: string,
  position: number,
): Result<FilterExpression, FilterParseError> => {
  const segments = token.split(':');
  if (segments.length === 1) {
    return success({ kind: 'text', field: 'any', operator: 'contains', value: unquote(token) });
  }

  const [rawField, second, ...remainder] = segments;
  if (!rawField || second === undefined) {
    return failure({ code: 'invalid_predicate', token, position });
  }
  if (rawField === 'stage' && remainder.length === 0 && isTranslationStage(second)) {
    return success({ kind: 'stage', value: second });
  }
  if (rawField === 'length') {
    const [lengthField, operator, rawValue] = [second, remainder[0], remainder.slice(1).join(':')];
    const field = normalizeField(lengthField);
    const allowedOperators: readonly LengthOperator[] = ['>', '>=', '<', '<=', '='];
    const value = Number(rawValue);
    if (
      !field ||
      field === 'tone' ||
      !operator ||
      !allowedOperators.includes(operator as LengthOperator) ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      return failure({ code: 'invalid_predicate', token, position });
    }
    return success({ kind: 'length', field, operator: operator as LengthOperator, value });
  }

  const field = normalizeField(rawField);
  if (!field) return failure({ code: 'invalid_predicate', token, position });
  if (remainder.length === 0) {
    return success({ kind: 'text', field, operator: 'contains', value: unquote(second) });
  }
  const operator = normalizeTextOperator(second);
  const value = unquote(remainder.join(':'));
  if (operator === 'matches') {
    try {
      new RegExp(value);
    } catch {
      return failure({ code: 'invalid_predicate', token, position });
    }
  }
  return operator && value.length > 0
    ? success({ kind: 'text', field, operator, value })
    : failure({ code: 'invalid_predicate', token, position });
};

export const parseFilterQuery = (
  query: string,
): Result<FilterExpression | null, FilterParseError> => {
  const tokenResult = tokenize(query);
  if (!tokenResult.ok) return tokenResult;
  const tokens = tokenResult.value;
  if (tokens.length === 0) return success(null);
  let position = 0;

  const parsePrimary = (): Result<FilterExpression, FilterParseError> => {
    const token = tokens[position];
    if (token === undefined) {
      return failure({ code: 'missing_operand', token: null, position });
    }
    if (token === '(') {
      position += 1;
      const nested = parseOr();
      if (!nested.ok) return nested;
      if (tokens[position] !== ')') {
        return failure({
          code: 'mismatched_parenthesis',
          token: tokens[position] ?? null,
          position,
        });
      }
      position += 1;
      return nested;
    }
    if ([')', '|'].includes(token)) {
      return failure({ code: 'unexpected_token', token, position });
    }
    position += 1;
    return parsePredicate(token, position - 1);
  };

  const parseUnary = (): Result<FilterExpression, FilterParseError> => {
    if (tokens[position] === '!') {
      position += 1;
      const operand = parseUnary();
      return operand.ok ? success({ kind: 'not', operand: operand.value }) : operand;
    }
    return parsePrimary();
  };

  const parseAnd = (): Result<FilterExpression, FilterParseError> => {
    let left = parseUnary();
    if (!left.ok) return left;
    while (position < tokens.length && !['|', ')'].includes(tokens[position]!)) {
      const right = parseUnary();
      if (!right.ok) return right;
      left = success({ kind: 'and', left: left.value, right: right.value });
    }
    return left;
  };

  function parseOr(): Result<FilterExpression, FilterParseError> {
    let left = parseAnd();
    if (!left.ok) return left;
    while (tokens[position] === '|') {
      position += 1;
      const right = parseAnd();
      if (!right.ok) return right;
      left = success({ kind: 'or', left: left.value, right: right.value });
    }
    return left;
  }

  const expression = parseOr();
  if (!expression.ok) return expression;
  if (position !== tokens.length) {
    return failure({ code: 'unexpected_token', token: tokens[position] ?? null, position });
  }
  return expression;
};
