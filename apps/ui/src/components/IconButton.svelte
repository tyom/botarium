<script lang="ts">
  import type { Component } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    icon: Component<{ size?: number }>
    size?: number
    label: string
  }

  let {
    icon: Icon,
    size = 18,
    label,
    class: className,
    ...rest
  }: Props = $props()
</script>

<button
  {...rest}
  type={rest.type ?? 'button'}
  class="bg-transparent border-none p-1 rounded text-(--text-muted) cursor-pointer flex items-center justify-center transition-colors hover:bg-(--sidebar-hover) hover:text-(--text-primary) {className}"
  aria-label={label}
>
  <Icon {size} />
</button>
