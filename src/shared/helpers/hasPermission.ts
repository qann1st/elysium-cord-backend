import { PERMISSIONS } from '../constants';

export const hasPermission = (
  membership: any,
  permission: keyof typeof PERMISSIONS,
) => {
  return membership.roles.some((role) => role.permissions.includes(permission));
};
