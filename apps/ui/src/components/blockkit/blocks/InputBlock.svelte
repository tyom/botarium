<script lang="ts">
  import type {
    SlackInputBlock,
    SlackPlainTextInputElement,
    SlackStaticSelectElement,
    SlackFileInputElement,
    SlackCheckboxesElement,
    SlackOption,
    UploadedFile,
  } from '../../../lib/types'
  import { renderText, type FormValues, type FileValues } from '../context'
  import PlainTextInput from '../elements/PlainTextInput.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import FileInput from '../elements/FileInput.svelte'
  import Checkboxes from '../elements/Checkboxes.svelte'

  interface Props {
    block: SlackInputBlock
    blockId: string
    values: FormValues
    fileValues: FileValues
    onInputChange?: (blockId: string, actionId: string, value: string) => void
    onFileChange?: (
      blockId: string,
      actionId: string,
      files: UploadedFile[]
    ) => void
    onCheckboxChange?: (
      blockId: string,
      actionId: string,
      selectedOptions: SlackOption[]
    ) => void
  }

  let {
    block,
    blockId,
    values,
    fileValues,
    onInputChange,
    onFileChange,
    onCheckboxChange,
  }: Props = $props()

  function getInputValue(actionId: string): string {
    return values[blockId]?.[actionId]?.value ?? ''
  }

  function getSelectedOption(actionId: string): SlackOption | undefined {
    return values[blockId]?.[actionId]?.selected_option
  }

  function getSelectedOptions(actionId: string): SlackOption[] | undefined {
    return values[blockId]?.[actionId]?.selected_options
  }

  function getFiles(actionId: string): UploadedFile[] {
    return fileValues[blockId]?.[actionId] ?? []
  }
</script>

<div>
  {#if block.element.type !== 'file_input'}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="block text-sm text-slack-text-muted mb-1.5">
      {renderText(block.label)}
      {#if !block.optional}
        <span class="text-red-400">*</span>
      {/if}
    </label>
  {/if}

  {#if block.element.type === 'plain_text_input'}
    {@const el = block.element as SlackPlainTextInputElement}
    <PlainTextInput
      element={el}
      value={getInputValue(el.action_id)}
      onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
    />
  {:else if block.element.type === 'static_select'}
    {@const el = block.element as SlackStaticSelectElement}
    <StaticSelect
      element={el}
      value={getSelectedOption(el.action_id)}
      onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
    />
  {:else if block.element.type === 'file_input'}
    {@const el = block.element as SlackFileInputElement}
    <FileInput
      element={el}
      label={renderText(block.label)}
      optional={block.optional}
      files={getFiles(el.action_id)}
      onFilesChange={(files) => onFileChange?.(blockId, el.action_id, files)}
    />
  {:else if block.element.type === 'checkboxes'}
    {@const el = block.element as SlackCheckboxesElement}
    <Checkboxes
      element={el}
      selectedOptions={getSelectedOptions(el.action_id)}
      onChange={(options) => onCheckboxChange?.(blockId, el.action_id, options)}
    />
  {/if}

  {#if block.hint}
    <p class="text-xs text-slack-text-muted mt-1">
      {renderText(block.hint)}
    </p>
  {/if}
</div>
