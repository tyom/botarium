<script lang="ts">
  import type {
    SlackSectionBlock,
    SlackButtonElement,
    SlackStaticSelectElement,
    SlackOverflowElement,
    SlackRadioButtonsElement,
    SlackCheckboxesElement,
    SlackDatePickerElement,
    SlackTimePickerElement,
    SlackWorkspaceSelectElement,
  } from '../../../lib/types'
  import { renderMrkdwn } from '../context'
  import Button from '../elements/Button.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import WorkspaceSelect from '../elements/WorkspaceSelect.svelte'
  import ImageElement from '../elements/ImageElement.svelte'
  import OverflowMenu from '../elements/OverflowMenu.svelte'
  import RadioButtonGroup from '../elements/RadioButtonGroup.svelte'
  import Checkboxes from '../elements/Checkboxes.svelte'
  import DatePicker from '../elements/DatePicker.svelte'
  import TimePicker from '../elements/TimePicker.svelte'

  interface Props {
    block: SlackSectionBlock
    onAction?: (actionId: string, value: string) => void
  }

  let { block, onAction }: Props = $props()

  const isStackedAccessory = $derived(
    block.accessory?.type === 'radio_buttons' ||
      block.accessory?.type === 'checkboxes'
  )
</script>

{#snippet textContent()}
  {#if block.text}
    <div class="mrkdwn text-slack-text">
      {@html renderMrkdwn(block.text)}
    </div>
  {/if}
  {#if block.fields}
    <div class="grid grid-cols-2 gap-2 mt-2">
      {#each block.fields as field, i (i)}
        <div class="mrkdwn text-slack-text text-sm">
          {@html renderMrkdwn(field)}
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet inlineAccessory()}
  {#if block.accessory}
    {#if block.accessory.type === 'button'}
      <div class="shrink-0 p-section_block__accessory">
        <Button
          element={block.accessory as SlackButtonElement}
          onClick={onAction}
        />
      </div>
    {:else if block.accessory.type === 'static_select'}
      {@const sel = block.accessory as SlackStaticSelectElement}
      <div class="shrink-0">
        <StaticSelect
          element={sel}
          compact
          onChange={(value) => onAction?.(sel.action_id, value)}
        />
      </div>
    {:else if block.accessory.type === 'overflow'}
      {@const ovf = block.accessory as SlackOverflowElement}
      <div class="shrink-0">
        <OverflowMenu
          element={ovf}
          onSelect={(option) => onAction?.(ovf.action_id, option.value)}
        />
      </div>
    {:else if block.accessory.type === 'datepicker'}
      {@const dp = block.accessory as SlackDatePickerElement}
      <div class="shrink-0">
        <DatePicker
          element={dp}
          compact
          onChange={(val) => onAction?.(dp.action_id, val)}
        />
      </div>
    {:else if block.accessory.type === 'timepicker'}
      {@const tp = block.accessory as SlackTimePickerElement}
      <div class="shrink-0">
        <TimePicker
          element={tp}
          compact
          onChange={(val) => onAction?.(tp.action_id, val)}
        />
      </div>
    {:else if block.accessory.type === 'users_select' || block.accessory.type === 'conversations_select' || block.accessory.type === 'channels_select' || block.accessory.type === 'external_select' || block.accessory.type === 'multi_users_select' || block.accessory.type === 'multi_conversations_select' || block.accessory.type === 'multi_channels_select' || block.accessory.type === 'multi_external_select'}
      {@const ws = block.accessory as SlackWorkspaceSelectElement}
      <div class="shrink-0">
        <WorkspaceSelect placeholder={ws.placeholder} compact />
      </div>
    {:else if block.accessory.type === 'image'}
      <ImageElement
        imageUrl={block.accessory.image_url}
        altText={block.accessory.alt_text}
        size="accessory"
      />
    {/if}
  {/if}
{/snippet}

{#if isStackedAccessory}
  <div class="p-section_block p-section_block--stacked max-w-[620px]">
    <div class="p-section_block__text_content">
      {@render textContent()}
    </div>
    {#if block.accessory?.type === 'radio_buttons'}
      {@const radio = block.accessory as SlackRadioButtonsElement}
      <div class="mt-2">
        <RadioButtonGroup
          element={radio}
          onChange={(option) => onAction?.(radio.action_id, option.value)}
        />
      </div>
    {:else if block.accessory?.type === 'checkboxes'}
      {@const cb = block.accessory as SlackCheckboxesElement}
      <div class="mt-2">
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
      </div>
    {/if}
  </div>
{:else}
  <div
    class="p-section_block flex items-start justify-between gap-4 max-w-[620px]"
  >
    <div class="p-section_block__text_content">
      {@render textContent()}
    </div>
    {@render inlineAccessory()}
  </div>
{/if}

<style>
  .p-section_block {
    line-height: 1.46668;
    margin: 8px 0 4px;
  }
  .p-section_block--stacked {
    margin-bottom: 16px;
  }
  .p-section_block__text_content {
    flex: 1;
  }
  .p-section_block__accessory {
    margin: 0 0 4px 8px;
  }
</style>
