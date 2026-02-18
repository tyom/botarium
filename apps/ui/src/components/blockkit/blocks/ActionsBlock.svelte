<script lang="ts">
  import type {
    SlackActionsBlock,
    SlackButtonElement,
    SlackStaticSelectElement,
    SlackOverflowElement,
    SlackRadioButtonsElement,
    SlackCheckboxesElement,
    SlackDatePickerElement,
    SlackTimePickerElement,
    SlackDateTimePickerElement,
  } from '../../../lib/types'
  import Button from '../elements/Button.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import OverflowMenu from '../elements/OverflowMenu.svelte'
  import RadioButtonGroup from '../elements/RadioButtonGroup.svelte'
  import Checkboxes from '../elements/Checkboxes.svelte'
  import DatePicker from '../elements/DatePicker.svelte'
  import TimePicker from '../elements/TimePicker.svelte'
  import DateTimePicker from '../elements/DateTimePicker.svelte'

  interface Props {
    block: SlackActionsBlock
    onAction?: (actionId: string, value: string) => void
  }

  let { block, onAction }: Props = $props()
</script>

<div class="flex flex-wrap gap-2 items-start max-w-[620px]">
  {#each block.elements as element, i (i)}
    {#if element.type === 'button'}
      <Button element={element as SlackButtonElement} onClick={onAction} />
    {:else if element.type === 'static_select'}
      {@const sel = element as SlackStaticSelectElement}
      <StaticSelect
        element={sel}
        compact
        onChange={(value) => onAction?.(sel.action_id, value)}
      />
    {:else if element.type === 'overflow'}
      {@const ovf = element as SlackOverflowElement}
      <OverflowMenu
        element={ovf}
        onSelect={(option) => onAction?.(ovf.action_id, option.value)}
      />
    {:else if element.type === 'radio_buttons'}
      {@const radio = element as SlackRadioButtonsElement}
      <div class="w-full pt-2">
        <RadioButtonGroup
          element={radio}
          onChange={(option) => onAction?.(radio.action_id, option.value)}
        />
      </div>
    {:else if element.type === 'checkboxes'}
      {@const cb = element as SlackCheckboxesElement}
      <div class="w-full pt-2">
        <Checkboxes
          element={cb}
          selectedOptions={undefined}
          onChange={(options) => onAction?.(cb.action_id, JSON.stringify(options.map(o => ({ text: o.text, value: o.value }))))}
        />
      </div>
    {:else if element.type === 'datepicker'}
      {@const dp = element as SlackDatePickerElement}
      <DatePicker
        element={dp}
        compact
        onChange={(val) => onAction?.(dp.action_id, val)}
      />
    {:else if element.type === 'timepicker'}
      {@const tp = element as SlackTimePickerElement}
      <TimePicker
        element={tp}
        compact
        onChange={(val) => onAction?.(tp.action_id, val)}
      />
    {:else if element.type === 'datetimepicker'}
      {@const dtp = element as SlackDateTimePickerElement}
      <DateTimePicker
        element={dtp}
        compact
        onChange={(val) => onAction?.(dtp.action_id, val)}
      />
    {/if}
  {/each}
</div>
