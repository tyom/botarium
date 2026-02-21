<script lang="ts">
  import type {
    SlackBlock,
    SlackSectionBlock,
    SlackInputBlock,
    SlackActionsBlock,
    SlackContextBlock,
    SlackContextActionsBlock,
    SlackImageBlock,
    SlackHeaderBlock,
    SlackRichTextBlock,
    SlackTableBlock,
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
  import TableBlock from './blocks/TableBlock.svelte'
  import ContextActionsBlock from './blocks/ContextActionsBlock.svelte'

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
    onImagePreview?: (imageUrl: string, imageAlt: string) => void
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
    onImagePreview,
  }: Props = $props()

  function getBlockId(block: SlackBlock, index: number): string {
    return block.block_id ?? `block-${index}`
  }
</script>

<div class="p-block_kit_renderer">
  {#each blocks as block, index (getBlockId(block, index))}
    <div class="p-block_kit_renderer__block_wrapper">
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
        <ImageBlock block={block as SlackImageBlock} {onImagePreview} />
      {:else if block.type === 'header'}
        <HeaderBlock block={block as SlackHeaderBlock} />
      {:else if block.type === 'rich_text'}
        <RichTextBlock block={block as SlackRichTextBlock} />
      {:else if block.type === 'table'}
        <TableBlock block={block as SlackTableBlock} />
      {:else if block.type === 'context_actions'}
        <ContextActionsBlock
          block={block as SlackContextActionsBlock}
          {onAction}
        />
      {:else}
        <!-- Unknown block type -->
        {@const unknownBlock = block as { type: string }}
        <div class="text-xs text-slack-text-muted italic">
          Unknown block type: {unknownBlock.type}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .p-block_kit_renderer {
    display: flex;
    flex-direction: column;
  }
</style>
