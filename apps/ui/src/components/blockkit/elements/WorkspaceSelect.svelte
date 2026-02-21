<script lang="ts">
  import type { SlackViewTextObject } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    placeholder?: SlackViewTextObject
    /** Smaller styling for actions block vs input block */
    compact?: boolean
    onChange?: (value: string) => void
  }

  let { placeholder, compact = false, onChange: _onChange }: Props = $props()
</script>

<div
  class="c-select_input__wrapper c-select_input--small"
  class:c-select_input--compact={compact}
>
  {#if placeholder}
    <span class="c-select_input__label">{renderText(placeholder)}</span>
  {/if}
</div>

<style>
  .c-select_input__wrapper {
    appearance: none;
    background-color: var(--color-slack-input, #222529);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: var(--color-slack-text-muted, #ababad);
    cursor: default;
    user-select: none;
    display: flex;
    align-items: center;
    background-image: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%23ababad%22%3E%3Cpath%20d%3D%22M4.5%206l3.5%203.5L11.5%206%22%20stroke%3D%22%23ababad%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E');
    background-size: 16px;
    background-position: right 8px center;
    background-repeat: no-repeat;
    height: 32px;
    width: 190px;
    padding-left: 12px;
    padding-right: 32px;
  }

  .c-select_input--compact {
    font-size: 14px;
  }

  .c-select_input__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
