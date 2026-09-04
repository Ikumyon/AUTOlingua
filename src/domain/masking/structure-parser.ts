import { failure, success, type Result } from '../../shared';
import { modifierRole, validateModifierRules, type ModifierRule } from '../modifier/modifier';
import { stableTextHash, type StringStructure, type StructureElement } from './string-structure';

interface CandidateMatch {
  readonly start: number;
  readonly end: number;
  readonly value: string;
  readonly rule: ModifierRule;
  readonly ruleIndex: number;
}

export interface StructureParseError {
  readonly code: 'invalid_modifier_rules';
  readonly ruleIds: readonly string[];
}

const normalizeText = (text: string): string => text.trim().replace(/\s+/g, ' ').toLowerCase();

const collectMatches = (text: string, rules: readonly ModifierRule[]): CandidateMatch[] => {
  const candidates: CandidateMatch[] = [];
  rules.forEach((rule, ruleIndex) => {
    if (!rule.enabled) return;
    const expression = new RegExp(rule.pattern, 'g');
    for (const match of text.matchAll(expression)) {
      const start = match.index;
      if (start === undefined || match[0].length === 0) continue;
      candidates.push({ start, end: start + match[0].length, value: match[0], rule, ruleIndex });
    }
  });

  candidates.sort((left, right) =>
    left.start !== right.start
      ? left.start - right.start
      : left.ruleIndex !== right.ruleIndex
        ? left.ruleIndex - right.ruleIndex
        : right.end - left.end,
  );

  const selected: CandidateMatch[] = [];
  let occupiedUntil = 0;
  for (const candidate of candidates) {
    if (candidate.start < occupiedUntil) continue;
    selected.push(candidate);
    occupiedUntil = candidate.end;
  }
  return selected;
};

export const parseStructure = (
  originalText: string,
  rules: readonly ModifierRule[],
): Result<StringStructure, StructureParseError> => {
  const invalidRules = validateModifierRules(rules);
  if (invalidRules.length > 0) {
    return failure({
      code: 'invalid_modifier_rules',
      ruleIds: invalidRules.map((error) => error.ruleId as string),
    });
  }

  const matches = collectMatches(originalText, rules);
  const elements: StructureElement[] = [];
  const baseParts: string[] = [];
  const hashParts: string[] = [];
  const variableOffsets: number[] = [];
  let sourceCursor = 0;
  let baseLength = 0;

  for (const match of matches) {
    const textBefore = originalText.slice(sourceCursor, match.start);
    baseParts.push(textBefore);
    hashParts.push(textBefore);
    baseLength += textBefore.length;

    const role = modifierRole(match.rule, match.value);
    elements.push({
      kind: match.rule.kind,
      originalValue: match.value,
      category: match.rule.category,
      role,
      relativeOffset: baseLength,
    });

    if (match.rule.kind === 'variable') {
      hashParts.push('⟦VAR⟧');
      variableOffsets.push(baseLength);
    }
    sourceCursor = match.end;
  }

  const remainder = originalText.slice(sourceCursor);
  baseParts.push(remainder);
  hashParts.push(remainder);
  const baseText = baseParts.join('');
  const textHash = stableTextHash(normalizeText(hashParts.join('')));
  const patternHash = stableTextHash(variableOffsets.join(','));

  return success({
    originalText,
    baseText,
    elements,
    textHash,
    patternHash,
    groupKey: `${textHash}-${patternHash}`,
  });
};
