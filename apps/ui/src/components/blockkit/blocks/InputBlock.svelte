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
    SlackOption,
    UploadedFile,
  } from '../../../lib/types'
  import { renderText, type FormValues, type FileValues } from '../context'
  import PlainTextInput from '../elements/PlainTextInput.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import FileInput from '../elements/FileInput.svelte'
  import Checkboxes from '../elements/Checkboxes.svelte'
  import NumberInput from '../elements/NumberInput.svelte'
  import EmailInput from '../elements/EmailInput.svelte'
  import UrlInput from '../elements/UrlInput.svelte'
  import RadioButtonGroup from '../elements/RadioButtonGroup.svelte'
  import DatePicker from '../elements/DatePicker.svelte'
  import TimePicker from '../elements/TimePicker.svelte'

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
  {:else if block.element.type === 'number_input'}
    {@const el = block.element as SlackNumberInputElement}
    <NumberInput
      element={el}
      value={getInputValue(el.action_id)}
      onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
    />
  {:else if block.element.type === 'email_text_input'}
    {@const el = block.element as SlackEmailInputElement}
    <EmailInput
      element={el}
      value={getInputValue(el.action_id)}
      onChange={(value) => onInputChange?.(blockId, el.action_id, value)}
    />
  {:else if block.element.type === 'url_text_input'}
    {@const el = block.element as SlackUrlInputElement}
    <UrlInput
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
  {/if}

  {#if block.hint}
    <p class="text-xs text-slack-text-muted mt-1">
      {renderText(block.hint)}
    </p>
  {/if}
</div>
