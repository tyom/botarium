<script lang="ts">
  import { Sparkles } from '@lucide/svelte'
  import type { ConnectedBotInfo } from '../lib/types'

  interface Props {
    bot: ConnectedBotInfo
  }

  let { bot }: Props = $props()
</script>

<div class="px-5 pt-6 pb-4">
  <div class="flex flex-col items-start gap-3">
    <span
      class="size-[68px] rounded-xl bg-(--bot-avatar-bg) text-white flex items-center justify-center"
    >
      <Sparkles size={36} />
    </span>
    <div>
      <div class="flex items-center gap-2">
        <span class="text-[22px] font-bold text-slack-text leading-tight">
          {bot.name}
        </span>
        <span
          class="inline-flex items-center gap-1 rounded text-[11px] font-bold leading-none px-1.5 py-0.5 bg-slack-text-muted/15 text-slack-text-muted uppercase tracking-wide"
        >
          app
        </span>
        {#if bot.status === 'connected'}
          <span class="size-2 rounded-full bg-green-600 shrink-0"></span>
        {/if}
      </div>
      {#if bot.description}
        <p class="mt-1 text-[15px] text-slack-text-secondary leading-snug">
          {bot.description}
        </p>
      {/if}
    </div>
  </div>
  <p class="mt-4 text-[13px] text-slack-text-muted leading-normal">
    This is the very beginning of your direct message history with <strong
      class="font-bold text-slack-text">@{bot.name}</strong
    >.
  </p>
</div>
