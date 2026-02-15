<script lang="ts">
  import { X } from '@lucide/svelte'
  import { simulatorState } from '../lib/state.svelte'
  import {
    submitView,
    closeView,
    sendBlockAction,
  } from '../lib/dispatcher.svelte'
  import BlockKitRenderer from './blockkit/BlockKitRenderer.svelte'
  import type {
    SlackOption,
    SlackBlock,
    SlackInputBlock,
    SlackCheckboxesElement,
    SlackRadioButtonsElement,
    UploadedFile,
  } from '../lib/types'

  // Form values state - tracks input values for submission
  let formValues = $state<
    Record<
      string,
      Record<
        string,
        {
          value?: string
          selected_option?: SlackOption
          selected_options?: SlackOption[]
        }
      >
    >
  >({})

  // File values state - tracks uploaded files for file_input elements
  let fileFormValues = $state<Record<string, Record<string, UploadedFile[]>>>(
    {}
  )

  /**
   * Extract initial values from modal blocks to pre-populate formValues
   */
  function extractInitialValues(blocks: SlackBlock[]): Record<
    string,
    Record<
      string,
      {
        value?: string
        selected_option?: SlackOption
        selected_options?: SlackOption[]
      }
    >
  > {
    const values: Record<
      string,
      Record<
        string,
        {
          value?: string
          selected_option?: SlackOption
          selected_options?: SlackOption[]
        }
      >
    > = {}

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block?.type === 'input') {
        const inputBlock = block as SlackInputBlock
        const blockId = inputBlock.block_id ?? `block-${i}`
        const element = inputBlock.element

        if (!values[blockId]) {
          values[blockId] = {}
        }

        if (element.type === 'plain_text_input' && 'initial_value' in element) {
          values[blockId][element.action_id] = {
            value: element.initial_value ?? '',
          }
        } else if (
          element.type === 'static_select' &&
          'initial_option' in element
        ) {
          values[blockId][element.action_id] = {
            value: element.initial_option?.value,
            selected_option: element.initial_option,
          }
        } else if (element.type === 'checkboxes') {
          const checkboxElement = element as SlackCheckboxesElement
          values[blockId][element.action_id] = {
            selected_options: checkboxElement.initial_options ?? [],
          }
        } else if (
          element.type === 'number_input' ||
          element.type === 'email_text_input' ||
          element.type === 'url_text_input'
        ) {
          values[blockId][element.action_id] = {
            value: ('initial_value' in element ? (element as { initial_value?: string }).initial_value : undefined) ?? '',
          }
        } else if (element.type === 'radio_buttons') {
          const radioElement = element as SlackRadioButtonsElement
          values[blockId][element.action_id] = {
            selected_option: radioElement.initial_option,
            value: radioElement.initial_option?.value,
          }
        }
      }
    }

    return values
  }

  // Initialize form values when modal changes (including initial values from blocks)
  $effect(() => {
    if (simulatorState.activeModal) {
      formValues = extractInitialValues(simulatorState.activeModal.view.blocks)
      fileFormValues = {} // Reset file values when modal changes
    }
  })

  function handleInputChange(blockId: string, actionId: string, value: string) {
    if (!formValues[blockId]) {
      formValues[blockId] = {}
    }
    formValues[blockId][actionId] = { value }
  }

  function handleFileChange(
    blockId: string,
    actionId: string,
    files: UploadedFile[]
  ) {
    if (!fileFormValues[blockId]) {
      fileFormValues[blockId] = {}
    }
    fileFormValues[blockId][actionId] = files
  }

  function handleCheckboxChange(
    blockId: string,
    actionId: string,
    selectedOptions: SlackOption[]
  ) {
    if (!formValues[blockId]) {
      formValues[blockId] = {}
    }
    formValues[blockId][actionId] = { selected_options: selectedOptions }
  }

  function handleRadioChange(
    blockId: string,
    actionId: string,
    option: SlackOption
  ) {
    if (!formValues[blockId]) {
      formValues[blockId] = {}
    }
    formValues[blockId][actionId] = { selected_option: option, value: option.value }
  }

  async function handleAction(actionId: string, value: string) {
    if (!simulatorState.activeModal) return
    await sendBlockAction(simulatorState.activeModal.viewId, actionId, value)
  }

  async function handleSubmit() {
    if (!simulatorState.activeModal) return

    // Merge form values with file values
    // File inputs are submitted as { files: UploadedFile[] }
    const mergedValues: Record<string, Record<string, unknown>> = {
      ...formValues,
    }
    for (const [blockId, actionValues] of Object.entries(fileFormValues)) {
      if (!mergedValues[blockId]) {
        mergedValues[blockId] = {}
      }
      for (const [actionId, files] of Object.entries(actionValues)) {
        mergedValues[blockId][actionId] = { files }
      }
    }

    await submitView(simulatorState.activeModal.viewId, mergedValues)
  }

  async function handleClose() {
    if (!simulatorState.activeModal) return

    await closeView(simulatorState.activeModal.viewId)
  }

  function handleBackdropClick(e: MouseEvent) {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose()
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if simulatorState.activeModal}
  {@const modal = simulatorState.activeModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div
      class="bg-slack-bg border border-white/20 rounded-xl max-w-lg w-full max-h-[65vh] overflow-hidden shadow-2xl flex flex-col"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0"
      >
        <h2 id="modal-title" class="text-lg font-semibold text-slack-text">
          {modal.view.title?.text ?? 'Modal'}
        </h2>
        <button
          onclick={handleClose}
          class="p-1.5 rounded-lg text-slack-text-muted hover:text-slack-text hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-5">
        <BlockKitRenderer
          blocks={modal.view.blocks}
          values={formValues}
          fileValues={fileFormValues}
          onAction={handleAction}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          onCheckboxChange={handleCheckboxChange}
          onRadioChange={handleRadioChange}
        />
      </div>

      <!-- Footer -->
      {#if modal.view.submit || modal.view.close}
        <div
          class="flex justify-end gap-3 px-5 py-4 border-t border-white/10 shrink-0"
        >
          {#if modal.view.close}
            <button
              onclick={handleClose}
              class="px-4 py-2 rounded-lg bg-transparent border border-white/20 text-slack-text hover:bg-white/10 transition-colors"
            >
              {modal.view.close.text}
            </button>
          {/if}
          {#if modal.view.submit}
            <button
              onclick={handleSubmit}
              class="px-4 py-2 rounded-lg bg-slack-accent text-white hover:bg-slack-accent-hover transition-colors font-medium"
            >
              {modal.view.submit.text}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
