<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';

  let { open = $bindable(false) } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="h-4/6 max-w-[900px] overflow-auto">
    <div class="flex gap-10">
      <div class="flex w-4/6 min-w-0 flex-col gap-4">
        <slot name="editableSection" />
      </div>
      <div class="flex h-fit w-full min-w-0 flex-1 flex-col gap-3">
        <div class="break-words">
          <slot name="detailsSection" />
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
