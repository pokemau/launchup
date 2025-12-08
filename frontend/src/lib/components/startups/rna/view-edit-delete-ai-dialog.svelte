<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Textarea } from '$lib/components/ui/textareav2';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Card } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import { Check, Trash, Copy } from 'lucide-svelte';
  import { TextEditor } from '$lib/components/shared';
  import { tick } from 'svelte';
  import { Input } from '$lib/components/ui/input';
  import { PUBLIC_API_URL } from '$env/static/public';

  type ChatMessage = {
    id?: number;
    role: 'User' | 'Ai';
    content: string;
    createdAt?: Date;
    refinedRna?: string;
  };

  let {
    open = $bindable(),
    rna,
    update,
    deleteRna,
    readinessData,
    closeDialog,
    addToRna,
    role
  } = $props();

  let rnaCopy = $state({ ...rna });
  let isLoadingHistory = $state(false);

  function handleDialogStateChange(newOpen: boolean) {
    open = newOpen;
    if (!newOpen) {
      closeDialog();
    }
  }

  async function loadChatHistory() {
    isLoadingHistory = true;
    try {
      const response = await fetch(
        `${PUBLIC_API_URL}/chat-history/rna/${rna.id}`
      );
      if (!response.ok) throw new Error('Failed to load chat history');
      const history = await response.json();
      chatHistory = history;
      tick().then(() => {
        if (chatHistoryContainer) {
          chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
        }
      });
    } catch (error) {
      console.error('Error loading chat history:', error);
      chatHistory = [
        {
          role: 'Ai',
          content:
            'Failed to load previous chat history. But we can continue our conversation.'
        }
      ];
    } finally {
      isLoadingHistory = false;
    }
  }

  $effect(() => {
    if (open) {
      loadChatHistory();
    } else {
      rnaCopy = { ...rna };
      userInput = '';
    }
  });

  let deleteDialogOpen = $state(false);

  const deleteDialogOnOpenChange = () => {
    deleteDialogOpen = !deleteDialogOpen;
  };

  let chatHistory = $state<ChatMessage[]>([]);
  let userInput = $state('');
  let isLoading = $state(false);
  let chatHistoryContainer: HTMLDivElement;

  async function handleSendMessage() {
    if (!userInput.trim()) return;

    const currentInput = userInput;
    chatHistory = [...chatHistory, { role: 'User', content: currentInput }];
    userInput = '';
    isLoading = true;

    try {
      const response = await fetch(`${PUBLIC_API_URL}/rna/${rna.id}/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          chatHistory,
          latestPrompt: currentInput
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      await loadChatHistory();
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage: ChatMessage = {
        role: 'Ai',
        content: `Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      chatHistory = [...chatHistory, errorMessage];
    } finally {
      isLoading = false;
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleDialogStateChange}>
  <Dialog.Content class="h-[90vh] max-w-[1200px]">
    <div class="flex h-[80vh] gap-0">
      <!-- AI Chat Section (left) -->
      <div class="flex w-1/2 flex-col border-r border-border p-6">
        <h1 class="mb-4 text-2xl font-semibold">Refine RNA</h1>
        <div
          bind:this={chatHistoryContainer}
          class="flex-1 space-y-4 overflow-y-auto py-4"
        >
          {#if isLoadingHistory}
            <div class="flex h-full items-center justify-center">
              <div class="text-gray-400">Loading chat history...</div>
            </div>
          {:else}
            <div class="flex justify-start">
              <div class="rounded-lg bg-[#1e293b] p-4 text-white">
                I can help you refine this Readiness and Needs Assessment. How
                would you like to modify the description or other fields?
              </div>
            </div>
            {#each chatHistory as message}
              <div
                class="flex {message.role === 'User'
                  ? 'justify-end'
                  : 'justify-start'}"
              >
                <div
                  class="flex flex-col {message.role === 'User'
                    ? 'items-end'
                    : 'items-start'} max-w-[80%]"
                >
                  {#if message.role === 'User'}
                    <div class="rounded-lg bg-primary p-4 text-white">
                      {message.content}
                    </div>
                  {:else}
                    <div class="rounded-lg bg-[#1e293b] p-4 text-white">
                      Here's my suggestion for improving your RNA:
                      {#if message.refinedRna}
                        <div
                          class="prose prose-invert group relative my-2 rounded-lg bg-[#0a1729] p-4 pb-8"
                        >
                          {@html message.refinedRna}
                          <button
                            class="absolute bottom-2 right-2 flex items-center gap-1 text-sm text-gray-400 opacity-50 transition-opacity hover:text-white hover:opacity-100"
                            onclick={async (e) => {
                              const button = e.currentTarget as HTMLButtonElement;
                              const container = button.parentElement;
                              if (!container) return;
                              
                              // Get the HTML content (excluding the button)
                              const htmlContent = message.refinedRna || '';
                              
                              try {
                                // Copy both HTML and plain text to clipboard
                                await navigator.clipboard.write([
                                  new ClipboardItem({
                                    'text/html': new Blob([htmlContent], { type: 'text/html' }),
                                    'text/plain': new Blob([container.textContent?.replace('Copy', '').trim() || ''], { type: 'text/plain' })
                                  })
                                ]);
                              } catch (err) {
                                // Fallback to plain text if HTML copy fails
                                navigator.clipboard.writeText(htmlContent);
                              }
                            }}
                          >
                            <svg
                              class="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <path
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                              />
                            </svg>
                            Copy
                          </button>
                        </div>
                        {@html message.content}
                      {:else}
                        {@html message.content}
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
        <div class="mt-auto flex gap-2">
          <Input
            type="text"
            placeholder="Ask how you would like to refine the RNA..."
            required
            bind:value={userInput}
            onkeydown={(e) =>
              e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoadingHistory}
          />
          <Button
            disabled={isLoading || !userInput.trim() || isLoadingHistory}
            onclick={handleSendMessage}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>

      <!-- RNA Details -->
      <div class="flex w-1/2 flex-col p-6">
        <div class="flex justify-between">
          <h2 class="mb-4 text-2xl font-semibold">RNA Details</h2>
          <Button
            size="sm"
            variant="destructive"
            onclick={() => (deleteDialogOpen = true)}
            ><Trash class="h-4 w-4" /> Delete</Button
          >
        </div>
        <div class="flex flex-col gap-4 overflow-y-auto">
          <div class="mb-4">
            <Label>Readiness Type</Label>
            <div
              class="w-[180px] rounded border border-border bg-background px-3 py-2 text-sm"
            >
              {rnaCopy.readinessLevel?.readinessType || 'N/A'}
            </div>
          </div>

          <div class="mb-4">
            <Label>RNA Description</Label>
            <TextEditor
              bind:value={rnaCopy.rna}
              rows={8}
              placeholder="Enter RNA description..."
              classNames="w-full rounded bg-background border border-border text-white p-3"
            />
          </div>

          <Card class="mb-4">
            <div class="p-4">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <Label>Current Level</Label>
                  <div class="w-[180px] px-3 py-2 text-sm">
                    {rnaCopy.readinessLevel?.level || 'N/A'}
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <Label>AI Generated</Label>
                  <div class="w-[180px] px-3 py-2 text-sm">
                    {rnaCopy.isAiGenerated ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div class="mt-auto flex justify-end gap-2">
            <Button variant="outline" onclick={() => closeDialog()}
              >Cancel</Button
            >
            <Button
              onclick={() => {
                update(rnaCopy.id, {
                  rna: rnaCopy.rna,
                  startup_id: rnaCopy.startup,
                  isAiGenerated: false
                });
                open = false;
              }}>Update</Button
            >
          </div>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
  bind:open={deleteDialogOpen}
  onOpenChange={deleteDialogOnOpenChange}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this RNA.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-red-500 hover:bg-red-600"
        onclick={async () => {
          await deleteRna(rna.id, 0);
          deleteDialogOpen = false;
          closeDialog();
        }}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
