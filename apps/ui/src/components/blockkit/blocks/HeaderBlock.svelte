<script lang="ts">
  import type { SlackHeaderBlock } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    block: SlackHeaderBlock
  }

  let { block }: Props = $props()
</script>

<h2 class="text-xl font-semibold text-slack-text">
  {renderText(block.text)}
</h2>
