<script lang="ts">
  interface Props {
    imageUrl: string
    altText: string
    /** Size variant: sm (16px), md (40px), lg (full width) */
    size?: 'sm' | 'md' | 'accessory' | 'lg'
  }

  let { imageUrl, altText, size = 'lg' }: Props = $props()

  const sizeClasses = {
    sm: 'size-4 rounded',
    md: 'size-10 rounded object-cover',
    accessory: 'rounded object-cover size-[90px]',
    lg: 'max-w-full rounded-lg',
  }
</script>

<img src={imageUrl} alt={altText} class={sizeClasses[size]} />
