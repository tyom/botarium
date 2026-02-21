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
    SlackWorkspaceSelectElement,
  } from '../../../lib/types'
  import Button from '../elements/Button.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import WorkspaceSelect from '../elements/WorkspaceSelect.svelte'
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

<div class="p-actions_block">
  <div class="p-actions_block_elements">
    {#each block.elements as element, i (i)}
      <div class="p-actions_block__action">
        {#if element.type === 'button'}
          <Button element={element as SlackButtonElement} onClick={onAction} />
        {:else if element.type === 'static_select'}
          {@const sel = element as SlackStaticSelectElement}
          <StaticSelect
            element={sel}
            compact
            onChange={(value) => onAction?.(sel.action_id, value)}
          />
        {:else if element.type === 'users_select' || element.type === 'conversations_select' || element.type === 'channels_select' || element.type === 'external_select' || element.type === 'multi_users_select' || element.type === 'multi_conversations_select' || element.type === 'multi_channels_select' || element.type === 'multi_external_select'}
          {@const ws = element as SlackWorkspaceSelectElement}
          <WorkspaceSelect placeholder={ws.placeholder} compact />
        {:else if element.type === 'overflow'}
          {@const ovf = element as SlackOverflowElement}
          <OverflowMenu
            element={ovf}
            onSelect={(option) => onAction?.(ovf.action_id, option.value)}
          />
        {:else if element.type === 'radio_buttons'}
          {@const radio = element as SlackRadioButtonsElement}
          <RadioButtonGroup
            element={radio}
            onChange={(option) => onAction?.(radio.action_id, option.value)}
          />
        {:else if element.type === 'checkboxes'}
          {@const cb = element as SlackCheckboxesElement}
          <Checkboxes
            element={cb}
            selectedOptions={undefined}
            onChange={(options) =>
              onAction?.(
                cb.action_id,
                JSON.stringify(
                  options.map((o) => ({ text: o.text, value: o.value }))
                )
              )}
          />
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
      </div>
    {/each}
  </div>
</div>

<style>
  .p-actions_block_elements {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    max-width: 620px;
  }

  .p-actions_block__action {
    margin: 8px 8px 0 0;
  }
</style>
