<script lang="ts">
  interface Props {
    label: string
  }

  let { label }: Props = $props()
</script>

<div class="flex items-center px-5 py-2">
  <div class="flex-1 h-px bg-slack-border"></div>
  <span
    class="px-4 py-0.5 text-[13px] font-bold text-slack-text border border-slack-border rounded-full whitespace-nowrap"
  >
    {label}
  </span>
  <div class="flex-1 h-px bg-slack-border"></div>
</div>
