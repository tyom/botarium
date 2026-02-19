<script lang="ts">
  import type { SlackViewTextObject } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    placeholder?: SlackViewTextObject
    /** Smaller styling for actions block vs input block */
    compact?: boolean
    onChange?: (value: string) => void
  }

  let { placeholder, compact = false, onChange }: Props = $props()
</script>

<div
  class="appearance-none bg-slack-input border border-white/20 rounded-lg text-slack-text-muted cursor-default select-none flex items-center
    bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%23ababad%22%3E%3Cpath%20d%3D%22M4.5%206l3.5%203.5L11.5%206%22%20stroke%3D%22%23ababad%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')]
    bg-size-[16px] bg-position-[right_8px_center] bg-no-repeat h-8 w-[190px] pl-3 pr-8
    {compact && 'text-sm'}"
>
  {#if placeholder}
    <span class="truncate">{renderText(placeholder)}</span>
  {/if}
</div>
