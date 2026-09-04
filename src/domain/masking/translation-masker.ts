import { failure, success, type Result } from '../../shared';
import type { ModifierKind, ModifierRole } from '../modifier/modifier';
import type { StringStructure, StructureElement } from './string-structure';

export interface Replacement {
  readonly token: string;
  readonly originalValue: string;
  readonly kind: ModifierKind;
  readonly category: string;
  readonly role: ModifierRole;
  readonly relativeOffset: number;
  readonly slotKey: string;
}

export interface TokenizedSentence {
  readonly originalText: string;
  readonly replacements: readonly Replacement[];
}

export interface MaskedGroup {
  readonly maskedText: string;
  readonly tokens: readonly string[];
  readonly representativeReplacements: readonly Replacement[];
  readonly sentences: readonly TokenizedSentence[];
}

export interface TokenValidation {
  readonly valid: boolean;
  readonly missingTokens: readonly string[];
  readonly duplicatedTokens: readonly string[];
}

export interface ReverseMaskResult {
  readonly maskedText: string;
  readonly missingReplacements: readonly Replacement[];
}

export type MaskingError = 'empty_structure_group' | 'incompatible_base_text';

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const roleOrder: Readonly<Record<ModifierRole, number>> = {
  open: 0,
  marker: 1,
  value: 2,
  close: 3,
};

const slotKey = (element: StructureElement): string =>
  `${element.relativeOffset}:${element.role}:${element.kind}:${element.category}`;

const allocateTokens = (count: number, sourceTexts: readonly string[]): string[] => {
  const tokens: string[] = [];
  let sequence = 1;
  while (tokens.length < count) {
    const candidate = `⟦T${sequence.toString().padStart(4, '0')}⟧`;
    sequence += 1;
    if (sourceTexts.some((text) => text.includes(candidate))) continue;
    tokens.push(candidate);
  }
  return tokens;
};

export const maskStructureGroup = (
  structures: readonly StringStructure[],
): Result<MaskedGroup, MaskingError> => {
  const representative = structures[0];
  if (!representative) return failure('empty_structure_group');
  if (structures.some((structure) => structure.groupKey !== representative.groupKey)) {
    return failure('incompatible_base_text');
  }

  const slots = new Map<string, StructureElement>();
  for (const structure of structures) {
    for (const element of structure.elements) {
      if (!slots.has(slotKey(element))) slots.set(slotKey(element), element);
    }
  }

  const orderedSlots = [...slots.entries()].sort(([, left], [, right]) =>
    left.relativeOffset !== right.relativeOffset
      ? left.relativeOffset - right.relativeOffset
      : roleOrder[left.role] - roleOrder[right.role],
  );
  const tokens = allocateTokens(
    orderedSlots.length,
    structures.map((structure) => structure.originalText),
  );
  const representativeReplacements = orderedSlots.map(([key, element], index): Replacement => ({
    token: tokens[index]!,
    originalValue: element.originalValue,
    kind: element.kind,
    category: element.category,
    role: element.role,
    relativeOffset: element.relativeOffset,
    slotKey: key,
  }));

  let maskedText = '';
  let cursor = 0;
  for (const replacement of representativeReplacements) {
    maskedText += representative.baseText.slice(cursor, replacement.relativeOffset);
    maskedText += replacement.token;
    cursor = replacement.relativeOffset;
  }
  maskedText += representative.baseText.slice(cursor);

  const sentences = structures.map((structure): TokenizedSentence => {
    const rowSlots = new Map(structure.elements.map((element) => [slotKey(element), element]));
    return {
      originalText: structure.originalText,
      replacements: representativeReplacements.map((replacement) => ({
        ...replacement,
        originalValue: rowSlots.get(replacement.slotKey)?.originalValue ?? '',
      })),
    };
  });

  return success({
    maskedText,
    tokens,
    representativeReplacements,
    sentences,
  });
};

export const restoreMaskedText = (maskedText: string, sentence: TokenizedSentence): string => {
  let restored = maskedText;
  for (const replacement of sentence.replacements) {
    restored = restored.replace(
      new RegExp(escapeRegularExpression(replacement.token), 'gi'),
      () => replacement.originalValue,
    );
  }
  return restored;
};

export const validateMaskedText = (
  maskedText: string,
  requiredTokens: readonly string[],
): TokenValidation => {
  const missingTokens: string[] = [];
  const duplicatedTokens: string[] = [];
  for (const token of requiredTokens) {
    const matches = maskedText.match(new RegExp(escapeRegularExpression(token), 'gi')) ?? [];
    if (matches.length === 0) missingTokens.push(token);
    if (matches.length > 1) duplicatedTokens.push(token);
  }
  return {
    valid: missingTokens.length === 0 && duplicatedTokens.length === 0,
    missingTokens,
    duplicatedTokens,
  };
};

export const reverseMask = (
  restoredText: string,
  sentence: TokenizedSentence,
): ReverseMaskResult => {
  let maskedText = restoredText;
  const missingReplacements: Replacement[] = [];
  for (const replacement of sentence.replacements) {
    if (replacement.originalValue.length === 0) continue;
    const expression = new RegExp(escapeRegularExpression(replacement.originalValue), 'i');
    if (!expression.test(maskedText)) {
      missingReplacements.push(replacement);
      continue;
    }
    maskedText = maskedText.replace(expression, replacement.token);
  }
  return { maskedText, missingReplacements };
};
