<script lang="ts">
  import type {
    SlackContextActionsBlock,
    SlackFeedbackButtonsElement,
    SlackIconButtonElement,
  } from '../../../lib/types'
  import { ThumbsUp, ThumbsDown, Trash2 } from '@lucide/svelte'

  interface Props {
    block: SlackContextActionsBlock
    onAction?: (actionId: string, value: string) => void
  }

  let { block, onAction }: Props = $props()

  const iconMap: Record<string, typeof Trash2> = {
    trash: Trash2,
  }
</script>

<div class="flex items-center gap-1 my-1">
  {#each block.elements as element, i (i)}
    {#if element.type === 'feedback_buttons'}
      {@const fb = element as SlackFeedbackButtonsElement}
      <button
        type="button"
        class="context-action-btn"
        title={fb.positive_button.text.text}
        onclick={() => onAction?.(fb.action_id, fb.positive_button.value)}
      >
        <ThumbsUp size={16} />
      </button>
      <button
        type="button"
        class="context-action-btn"
        title={fb.negative_button.text.text}
        onclick={() => onAction?.(fb.action_id, fb.negative_button.value)}
      >
        <ThumbsDown size={16} />
      </button>
    {:else if element.type === 'icon_button'}
      {@const ib = element as SlackIconButtonElement}
      {@const IconComponent = iconMap[ib.icon]}
      <button
        type="button"
        class="context-action-btn"
        title={ib.text.text}
        onclick={() => onAction?.(ib.action_id, ib.text.text)}
      >
        {#if IconComponent}
          <IconComponent size={16} />
        {:else}
          <span class="text-xs">{ib.icon}</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--color-slack-text-muted, #616061);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .context-action-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: var(--color-slack-text, #1d1c1d);
  }
</style>
