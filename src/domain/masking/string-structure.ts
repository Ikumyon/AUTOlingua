import type { ModifierKind, ModifierRole } from '../modifier/modifier';

export interface StructureElement {
  readonly kind: ModifierKind;
  readonly originalValue: string;
  readonly category: string;
  readonly role: ModifierRole;
  readonly relativeOffset: number;
}

export interface StringStructure {
  readonly originalText: string;
  readonly baseText: string;
  readonly elements: readonly StructureElement[];
  readonly textHash: string;
  readonly patternHash: string;
  readonly groupKey: string;
}

export const stableTextHash = (text: string): string => {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
};
