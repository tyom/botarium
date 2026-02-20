<script lang="ts">
  interface Props {
    imageUrl: string
    altText: string
    /** Size variant: sm (16px), md (40px), lg (full width) */
    size?: 'sm' | 'md' | 'accessory' | 'lg'
    onImagePreview?: (imageUrl: string, imageAlt: string) => void
  }

  let { imageUrl, altText, size = 'lg', onImagePreview }: Props = $props()

  const sizeClasses = {
    sm: 'size-4 rounded',
    md: 'size-10 rounded object-cover',
    accessory: 'rounded object-cover size-[90px]',
    lg: 'max-w-full rounded-lg',
  }

  const isClickable = $derived(
    onImagePreview && (size === 'lg' || size === 'accessory')
  )
</script>

{#if isClickable}
  <button
    type="button"
    class="cursor-zoom-in block bg-transparent border-none p-0"
    onclick={() => onImagePreview!(imageUrl, altText)}
  >
    <img src={imageUrl} alt={altText} class={sizeClasses[size]} />
  </button>
{:else}
  <img src={imageUrl} alt={altText} class={sizeClasses[size]} />
{/if}
