import {
  editTranslation,
  maskStructureGroup,
  parseStructure,
  replaceProjectEntries,
  reverseMask,
  restoreMaskedText,
  type ModifierRule,
} from '../../domain';
import { failure, success, type Identifier, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { ProjectStore } from '../ports/project-store';

export class EditEntry {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(
    entryId: Identifier<'translation-entry'>,
    translatedText: string,
  ): Result<void, ApplicationFailure> {
    const result = this.projectStore.update((project) => {
      const entry = project.entries.find((candidate) => candidate.id === entryId);
      if (!entry) return failure('entry_not_found' as const);
      return replaceProjectEntries(project, [editTranslation(entry, translatedText)]);
    });
    if (result.ok) return success(undefined);
    return result.error === 'project_not_loaded'
      ? failure({ code: 'project_not_loaded' })
      : failure({ code: 'entry_not_found', entryId });
  }
}

export interface ApplyGroupEditInput {
  readonly entryId: Identifier<'translation-entry'>;
  readonly translatedText: string;
  readonly modifiers: readonly ModifierRule[];
  readonly allowMissingStructures?: boolean;
}

export interface ApplyGroupEditOutput {
  readonly updatedEntryIds: readonly Identifier<'translation-entry'>[];
}

export class ApplyGroupEdit {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(input: ApplyGroupEditInput): Result<ApplyGroupEditOutput, ApplicationFailure> {
    const project = this.projectStore.get();
    if (!project) return failure({ code: 'project_not_loaded' });
    const selectedIndex = project.entries.findIndex((entry) => entry.id === input.entryId);
    const selected = project.entries[selectedIndex];
    if (!selected) return failure({ code: 'entry_not_found', entryId: input.entryId });
    if (!selected.structureGroup) {
      const edited = new EditEntry(this.projectStore).execute(input.entryId, input.translatedText);
      return edited.ok ? success({ updatedEntryIds: [input.entryId] }) : edited;
    }

    const targets = project.entries.filter(
      (entry) => entry.structureGroup === selected.structureGroup,
    );
    const indexInTargets = targets.findIndex((entry) => entry.id === selected.id);
    const structures = [];
    for (const target of targets) {
      const parsed = parseStructure(target.sourceText, input.modifiers);
      if (!parsed.ok) return failure({ code: 'structure', cause: parsed.error });
      structures.push(parsed.value);
    }
    const masked = maskStructureGroup(structures);
    if (!masked.ok) return failure({ code: 'masking', cause: masked.error });
    const selectedSentence = masked.value.sentences[indexInTargets];
    if (!selectedSentence) return failure({ code: 'entry_not_found', entryId: input.entryId });
    const reversed = reverseMask(input.translatedText, selectedSentence);
    if (reversed.missingReplacements.length > 0 && !input.allowMissingStructures) {
      return failure({
        code: 'missing_structures',
        originals: reversed.missingReplacements.map((replacement) => replacement.originalValue),
      });
    }

    const replacements = targets.map((entry, index) =>
      editTranslation(
        entry,
        restoreMaskedText(reversed.maskedText, masked.value.sentences[index]!),
      ),
    );
    const result = this.projectStore.update((current) =>
      replaceProjectEntries(current, replacements),
    );
    if (!result.ok) {
      return result.error === 'project_not_loaded'
        ? failure({ code: 'project_not_loaded' })
        : failure({ code: 'entry_not_found', entryId: input.entryId });
    }
    return success({ updatedEntryIds: replacements.map((entry) => entry.id) });
  }
}
