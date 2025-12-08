<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { cn } from '$lib/utils';
  import { cubicInOut } from 'svelte/easing';
  import { crossfade } from 'svelte/transition';
  import { access } from '$lib/access';
  import { page } from '$app/stores';

  const { data, children } = $props();
  const { role } = data;

  const [send, receive] = crossfade({
    duration: 250,
    easing: cubicInOut
  });
  const currentModule = $derived(
    $page.url.pathname.slice(1).split('/')[
      $page.url.pathname.slice(1).split('/').length - 1
    ]
  );

  const modules = $derived((() => {
    const userRole = data.user?.role as 'Startup' | 'Mentor' | 'Manager' | 'Manager as Mentor';
    const roleModules = access.roles[userRole]?.modules ?? [];
    
    // Find the startups module dynamically
    const startupsModule = roleModules.find(m => m.link === 'startups');
    if (!startupsModule) return [];
    
    // Find the overview submodule
    const overviewModule = startupsModule.subModule.find(s => s.link === 'overview');
    if (!overviewModule) return [];
    
    return overviewModule.subModule ?? [];
  })());
</script>

<Card.Root class="h-full">
  <Card.Header>
    <Card.Title class="text-xl">Startup Settings</Card.Title>
    <Card.Description>Manage your startup</Card.Description>
  </Card.Header>
  <Card.Content class="mt-1 grid w-full grid-cols-[250px_1fr] gap-10">
    <nav class="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
      {#each modules as item}
        {@const isActive = currentModule === item.link}
        <a
          href={`/startups/${data.startupId}/overview/${item.link}`}
          class="w-full"
        >
          <Button
            variant="ghost"
            class={cn(
              'w-full hover:underline',
              'relative w-full justify-start hover:bg-transparent'
            )}
            data-sveltekit-noscroll
          >
            {#if isActive}
              <div
                class="absolute inset-0 rounded-md bg-muted"
                in:send={{ key: 'active-sidebar-tab' }}
                out:receive={{ key: 'active-sidebar-tab' }}
              ></div>
            {/if}
            <div class="relative flex items-center justify-center gap-3">
              {item.name}
            </div>
          </Button>
        </a>
      {/each}
    </nav>
    {@render children()}
  </Card.Content>
</Card.Root>
