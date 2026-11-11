import { requestJson } from '../../shared/api/client';
import type { Account, RunAction, ShowToast } from '../dashboard/dashboard.types';

// useAccountActions saves the signed-in account's name and password. Every role's profile
// page uses it; onAccountChange replaces the account so the header shows the new name.
export function useAccountActions(run: RunAction, showToast: ShowToast, onAccountChange: (account: Account) => void) {
  async function saveName(name: string): Promise<boolean> {
    const result = await run(() => requestJson<Account>('/accounts/me', { method: 'PUT', body: { name } }));
    if (!result) return false;
    onAccountChange(result);
    showToast('Name saved.');
    return true;
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const result = await run(() =>
      requestJson<Account>('/accounts/me/password', { method: 'PUT', body: { currentPassword, newPassword } }),
    );
    if (!result) return false;
    showToast('Password changed.');
    return true;
  }

  return { saveName, changePassword };
}
