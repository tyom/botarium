<script lang="ts">
  import type {
    SlackInputBlock,
    SlackPlainTextInputElement,
    SlackStaticSelectElement,
    SlackFileInputElement,
    SlackCheckboxesElement,
    SlackNumberInputElement,
    SlackEmailInputElement,
    SlackUrlInputElement,
    SlackRadioButtonsElement,
    SlackDatePickerElement,
    SlackTimePickerElement,
    SlackDateTimePickerElement,
    SlackWorkspaceSelectElement,
    SlackOption,
    UploadedFile,
  } from '../../../lib/types'
  import { Info } from '@lucide/svelte'
  import { renderText, type FormValues, type FileValues } from '../context'
  import PlainTextInput from '../elements/PlainTextInput.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import WorkspaceSelect from '../elements/WorkspaceSelect.svelte'
  import FileInput from '../elements/FileInput.svelte'
  import Checkboxes from '../elements/Checkboxes.svelte'
  import NumberInput from '../elements/NumberInput.svelte'
  import EmailInput from '../elements/EmailInput.svelte'
  import UrlInput from '../elements/UrlInput.svelte'
  import RadioButtonGroup from '../elements/RadioButtonGroup.svelte'
  import DatePicker from '../elements/DatePicker.svelte'
  import TimePicker from '../elements/TimePicker.svelte'
  import DateTimePicker from '../elements/DateTimePicker.svelte'

  interface Props {
    block: SlackInputBlock
    blockId: string
    values: FormValues
    fileValues: FileValues
    error?: string
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
    onRadioChange?: (
      blockId: string,
      actionId: string,
      option: SlackOption
    ) => void
  }

  let {
    block,
    blockId,
    values,
    fileValues,
    error,
    onInputChange,
    onFileChange,
    onCheckboxChange,
    onRadioChange,
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

  const inputId = $derived(`input-${blockId}-${block.element.action_id}`)
</script>

<div class="max-w-[620px]">
  {#if block.element.type !== 'file_input'}
    <label
      for={inputId}
      class="inline-block text-sm font-bold text-slack-text cursor-pointer mb-1.5"
    >
      {renderText(block.label)}
    </label>
  {/if}

  <div class:input-error={!!error}>
    {#if block.element.type === 'plain_text_input'}
      {@const el = block.element as SlackPlainTextInputElement}
      <PlainTextInput
        id={inputId}
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
      />
    {:else if block.element.type === 'static_select'}
      {@const el = block.element as SlackStaticSelectElement}
      <StaticSelect
        id={inputId}
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
        onChange={(options) =>
          onCheckboxChange?.(blockId, el.action_id, options)}
      />
    {:else if block.element.type === 'number_input'}
      {@const el = block.element as SlackNumberInputElement}
      <NumberInput
        id={inputId}
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
      />
    {:else if block.element.type === 'email_text_input'}
      {@const el = block.element as SlackEmailInputElement}
      <EmailInput
        id={inputId}
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
      />
    {:else if block.element.type === 'url_text_input'}
      {@const el = block.element as SlackUrlInputElement}
      <UrlInput
        id={inputId}
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
      />
    {:else if block.element.type === 'radio_buttons'}
      {@const el = block.element as SlackRadioButtonsElement}
      <RadioButtonGroup
        element={el}
        selectedOption={getSelectedOption(el.action_id)}
        onChange={(option) => onRadioChange?.(blockId, el.action_id, option)}
      />
    {:else if block.element.type === 'datepicker'}
      {@const el = block.element as SlackDatePickerElement}
      <DatePicker
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(val) => onInputChange?.(blockId, el.action_id, val)}
      />
    {:else if block.element.type === 'timepicker'}
      {@const el = block.element as SlackTimePickerElement}
      <TimePicker
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(val) => onInputChange?.(blockId, el.action_id, val)}
      />
    {:else if block.element.type === 'datetimepicker'}
      {@const el = block.element as SlackDateTimePickerElement}
      <DateTimePicker
        element={el}
        value={getInputValue(el.action_id)}
        onChange={(val) => onInputChange?.(blockId, el.action_id, val)}
      />
    {:else if block.element.type === 'users_select' || block.element.type === 'conversations_select' || block.element.type === 'channels_select' || block.element.type === 'external_select' || block.element.type === 'multi_users_select' || block.element.type === 'multi_conversations_select' || block.element.type === 'multi_channels_select' || block.element.type === 'multi_external_select'}
      {@const ws = block.element as SlackWorkspaceSelectElement}
      <WorkspaceSelect placeholder={ws.placeholder} />
    {/if}
  </div>

  {#if error}
    <p class="flex items-center gap-1 text-sm text-red-400 mt-1">
      <Info size={16} class="shrink-0" />
      {error}
    </p>
  {:else if block.hint}
    <p class="text-xs text-slack-text-muted mt-1">
      {renderText(block.hint)}
    </p>
  {/if}
</div>

<style>
  .input-error :global(input),
  .input-error :global(textarea),
  .input-error :global(select) {
    border-color: #f87171;
  }
</style>
