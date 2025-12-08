import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    user: locals.user
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, cookies, locals }) => {
    const formData = await request.formData();
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;

    try {
      const response = await fetch(`${PUBLIC_API_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cookies.get('Access')}`
        },
        body: JSON.stringify({ firstName, lastName, email })
      });

      if (!response.ok) {
        const error = await response.json();
        return fail(response.status, {
          error: error.message || 'Failed to update profile'
        });
      }

      const { user: updatedUser, access_token } = await response.json();

      // Update the Access token cookie with the new JWT
      cookies.set('Access', access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      });

      // Update locals.user with new data
      if (locals.user) {
        locals.user.firstName = updatedUser.firstName;
        locals.user.lastName = updatedUser.lastName;
        locals.user.email = updatedUser.email;
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      };
    } catch (error) {
      console.error('Profile update error:', error);
      return fail(500, {
        error: 'An error occurred while updating your profile'
      });
    }
  },

  changePassword: async ({ request, cookies }) => {
    const formData = await request.formData();
    const oldPassword = formData.get('oldPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    try {
      const response = await fetch(`${PUBLIC_API_URL}/users/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cookies.get('Access')}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        return fail(response.status, {
          passwordError: error.message || 'Failed to change password'
        });
      }

      return {
        passwordSuccess: true,
        passwordMessage: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Password change error:', error);
      return fail(500, {
        passwordError: 'An error occurred while changing your password'
      });
    }
  }
};
