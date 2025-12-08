import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, params, locals }) => {
  return {
    startupId: params.id,
    access: cookies.get('Access'),
    role: locals.user?.role,
    user: locals.user
  };
};
