<script lang="ts">
  import type {
    SlackBlock,
    SlackSectionBlock,
    SlackInputBlock,
    SlackActionsBlock,
    SlackContextBlock,
    SlackImageBlock,
    SlackHeaderBlock,
    SlackRichTextBlock,
    SlackOption,
    UploadedFile,
  } from '../../lib/types'
  import type { FormValues, FileValues } from './context'

  // Block components
  import SectionBlock from './blocks/SectionBlock.svelte'
  import InputBlock from './blocks/InputBlock.svelte'
  import ActionsBlock from './blocks/ActionsBlock.svelte'
  import DividerBlock from './blocks/DividerBlock.svelte'
  import ContextBlock from './blocks/ContextBlock.svelte'
  import ImageBlock from './blocks/ImageBlock.svelte'
  import HeaderBlock from './blocks/HeaderBlock.svelte'
  import RichTextBlock from './blocks/RichTextBlock.svelte'

  interface Props {
    blocks: SlackBlock[]
    values?: FormValues
    fileValues?: FileValues
    onAction?: (actionId: string, value: string) => void
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
    blocks,
    values = {},
    fileValues = {},
    onAction,
    onInputChange,
    onFileChange,
    onCheckboxChange,
    onRadioChange,
  }: Props = $props()

  function getBlockId(block: SlackBlock, index: number): string {
    return block.block_id ?? `block-${index}`
  }
</script>

<div class="space-y-1">
  {#each blocks as block, index (getBlockId(block, index))}
    {#if block.type === 'section'}
      <SectionBlock block={block as SlackSectionBlock} {onAction} />
    {:else if block.type === 'input'}
      <InputBlock
        block={block as SlackInputBlock}
        blockId={getBlockId(block, index)}
        {values}
        {fileValues}
        {onInputChange}
        {onFileChange}
        {onCheckboxChange}
        {onRadioChange}
      />
    {:else if block.type === 'actions'}
      <ActionsBlock block={block as SlackActionsBlock} {onAction} />
    {:else if block.type === 'divider'}
      <DividerBlock />
    {:else if block.type === 'context'}
      <ContextBlock block={block as SlackContextBlock} />
    {:else if block.type === 'image'}
      <ImageBlock block={block as SlackImageBlock} />
    {:else if block.type === 'header'}
      <HeaderBlock block={block as SlackHeaderBlock} />
    {:else if block.type === 'rich_text'}
      <RichTextBlock block={block as SlackRichTextBlock} />
    {:else}
      <!-- Unknown block type -->
      {@const unknownBlock = block as { type: string }}
      <div class="text-xs text-slack-text-muted italic">
        Unknown block type: {unknownBlock.type}
      </div>
    {/if}
  {/each}
</div>
