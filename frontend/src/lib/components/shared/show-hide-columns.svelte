<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import { SlidersHorizontal } from 'lucide-svelte';

  import { buttonVariants } from '$lib/components/ui/button/index.js';

  let { views } = $props();

  let dropdownOpen = $state(false);
</script>

<DropdownMenu.Root bind:open={dropdownOpen}>
  <DropdownMenu.Trigger class={buttonVariants({ variant: 'outline' })}>
    <SlidersHorizontal class="h-4 w-4" />
    View</DropdownMenu.Trigger
  >
  <DropdownMenu.Content align="end">
    <DropdownMenu.Group>
      {#each views as view}
        <DropdownMenu.CheckboxItem bind:checked={view.show}
          >{view.name}</DropdownMenu.CheckboxItem
        >
      {/each}
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
