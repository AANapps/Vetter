import { useEffect, useState } from 'react';
import { User as FirebaseUser, onIdTokenChanged } from 'firebase/auth';
import { auth, firebaseEnabled } from './firebase';
import { Account, Company, watchAccount, watchCompany } from './accounts';

export interface AccountState {
  // Still finding out who's signed in
  loading: boolean;
  user: FirebaseUser | null;
  account: Account | null;
  company: Company | null;
}

// Who's signed in, their Vetter account and their company, kept up to date as they change
export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({ loading: firebaseEnabled, user: null, account: null, company: null });

  useEffect(() => {
    if (!firebaseEnabled) return;
    let stopAccount = () => {};
    let stopCompany = () => {};
    let watchingUid: string | null = null;
    // The token changes on sign-in and sign-out, and also when an email is verified (the user object is updated in
    // place then, so the state is replaced to show it)
    const stopAuth = onIdTokenChanged(auth(), (user) => {
      if (user && user.uid === watchingUid) {
        setState((s) => ({ ...s, user }));
        return;
      }
      stopAccount();
      stopCompany();
      watchingUid = user?.uid ?? null;
      if (!user) {
        setState({ loading: false, user: null, account: null, company: null });
        return;
      }
      setState((s) => ({ ...s, loading: true, user }));
      let companyId: string | undefined;
      stopAccount = watchAccount(user.uid, (account) => {
        setState((s) => ({ ...s, loading: false, user, account }));
        if (account?.companyId !== companyId) {
          stopCompany();
          companyId = account?.companyId;
          stopCompany = companyId ? watchCompany(companyId, (company) => setState((s) => ({ ...s, company }))) : () => {};
          if (!companyId) setState((s) => ({ ...s, company: null }));
        }
      });
    });
    return () => {
      stopAuth();
      stopAccount();
      stopCompany();
    };
  }, []);

  return state;
}
