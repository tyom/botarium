<script lang="ts">
  import type {
    SlackTableBlock,
    SlackRichTextBlock,
    SlackTableColumnSettings,
  } from '../../../lib/types'
  import RichTextBlock from './RichTextBlock.svelte'

  interface Props {
    block: SlackTableBlock
  }

  let { block }: Props = $props()

  function getAlignment(colIndex: number): string {
    const settings: SlackTableColumnSettings | undefined =
      block.column_settings?.[colIndex]
    return settings?.align ?? 'left'
  }
</script>

<div class="table-wrapper">
  <table>
    {#if block.rows.length > 0}
      <thead>
        <tr class="header-row">
          {#each block.rows[0] as cell, colIndex}
            <th style="text-align: {getAlignment(colIndex)}">
              {#if cell.type === 'rich_text'}
                <RichTextBlock block={cell as SlackRichTextBlock} />
              {:else if cell.type === 'raw_text'}
                <span class="text-slack-text">{cell.text}</span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
    {/if}
    {#if block.rows.length > 1}
      <tbody>
        {#each block.rows.slice(1) as row}
          <tr class="data-row">
            {#each row as cell, colIndex}
              <td style="text-align: {getAlignment(colIndex)}">
                {#if cell.type === 'rich_text'}
                  <RichTextBlock block={cell as SlackRichTextBlock} />
                {:else if cell.type === 'raw_text'}
                  <span class="text-slack-text">{cell.text}</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    {/if}
  </table>
</div>

<style>
  .table-wrapper {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.13);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    color: var(--text-primary);
  }

  th,
  td {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  th {
    background: rgba(255, 255, 255, 0.06);
    font-weight: 600;
  }

  td {
    background: rgba(255, 255, 255, 0.02);
  }

  tr.data-row:hover td {
    background: rgba(255, 255, 255, 0.05);
  }

  /* Reset rich-text wrapper margins inside table cells */
  th :global(.rich-text),
  td :global(.rich-text) {
    margin: 0;
    padding: 0;
  }

  /* Reset rich-text section divs to inline flow inside cells */
  th :global(.rich-text .rt-section),
  td :global(.rich-text .rt-section) {
    display: inline;
  }
</style>
