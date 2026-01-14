<script lang="ts">
  interface Props {
    message?: string
    delay?: number
  }

  let { message = 'Loading...', delay = 0 }: Props = $props()

  let visible = $state(false)

  $effect(() => {
    if (delay === 0) {
      visible = true
    } else {
      visible = false
      const timeout = setTimeout(() => {
        visible = true
      }, delay)
      return () => clearTimeout(timeout)
    }
  })
</script>

{#if visible}
  <div
    class="flex flex-col items-center justify-center h-screen bg-slack-bg text-slack-text-secondary gap-4"
  >
    <div
      class="size-8 border-[3px] border-slack-border border-t-slack-accent rounded-full animate-spin"
    ></div>
    <p>{message}</p>
  </div>
{/if}
