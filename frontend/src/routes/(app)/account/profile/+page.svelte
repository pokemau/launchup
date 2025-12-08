<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label/index.js';
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { invalidateAll } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let profileSubmitting = $state(false);
  let passwordSubmitting = $state(false);

  // Show toasts based on form results
  $effect(() => {
    if (form?.success) {
      toast.success(form.message);
    } else if (form?.error) {
      toast.error(form.error);
    }

    if (form?.passwordSuccess) {
      toast.success(form.passwordMessage);
    } else if (form?.passwordError) {
      toast.error(form.passwordError);
    }
  });
</script>

<svelte:head>
  <title>Account - Profile</title>
</svelte:head>

<div class='flex flex-col'>
  <!-- Profile Information Card -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Profile</Card.Title>
      <Card.Description>Manage your personal information.</Card.Description>
    </Card.Header>
    <form
      method="POST"
      action="?/updateProfile"
      use:enhance={() => {
        profileSubmitting = true;
        return async ({ update, result }) => {
          await update();
          profileSubmitting = false;
          // Refetch user data if successful
          if (result.type === 'success') {
            await invalidateAll();
          }
        };
      }}
    >
      <Card.Content>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="firstName">First Name</Label>
            <Input
              name="firstName"
              id="firstName"
              type="text"
              required
              value={data.user.firstName}
            />
          </div>
          <div class="grid gap-2">
            <Label for="lastName">Last Name</Label>
            <Input
              name="lastName"
              id="lastName"
              type="text"
              required
              value={data.user.lastName}
            />
          </div>
          <div class="col-span-2 grid gap-2">
            <Label for="email">Email</Label>
            <Input
              name="email"
              id="email"
              type="email"
              value={data.user.email}
              required
            />
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="border-t px-6 py-4">
        <Button type="submit" size="sm" disabled={profileSubmitting}>
          {profileSubmitting ? 'Updating...' : 'Update Profile'}
        </Button>
      </Card.Footer>
    </form>
  </Card.Root>

  <!-- Password Change Card -->
  <Card.Root class="mt-6">
    <Card.Header>
      <Card.Title>Change Password</Card.Title>
      <Card.Description
        >Update your password to keep your account secure.</Card.Description
      >
    </Card.Header>
    <form
      method="POST"
      action="?/changePassword"
      use:enhance={() => {
        passwordSubmitting = true;
        return async ({ update, result }) => {
          await update();
          passwordSubmitting = false;
          // Reset form if successful
          if (result.type === 'success') {
            const formElement = document.querySelector(
              'form[action="?/changePassword"]'
            ) as HTMLFormElement;
            if (formElement) {
              formElement.reset();
            }
          }
        };
      }}
    >
      <Card.Content>
        <div class="grid gap-4">
          <div class="grid gap-2">
            <Label for="oldPassword">Current Password</Label>
            <Input
              name="oldPassword"
              id="oldPassword"
              type="password"
              required
              autocomplete="current-password"
            />
          </div>
          <div class="grid gap-2">
            <Label for="newPassword">New Password</Label>
            <Input
              name="newPassword"
              id="newPassword"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
            />
            <p class="text-sm text-muted-foreground">
              Password must be at least 6 characters.
            </p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="border-t px-6 py-4">
        <Button type="submit" size="sm" disabled={passwordSubmitting}>
          {passwordSubmitting ? 'Changing...' : 'Change Password'}
        </Button>
      </Card.Footer>
    </form>
  </Card.Root>
</div>
