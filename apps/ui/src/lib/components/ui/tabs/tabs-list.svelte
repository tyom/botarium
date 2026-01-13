<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'

  let { class: className, ...restProps }: TabsPrimitive.ListProps = $props()
</script>

<TabsPrimitive.List
  class={cn(
    'inline-flex h-9 items-center justify-center rounded-lg bg-zinc-800 p-1 text-zinc-400',
    className
  )}
  {...restProps}
/>
