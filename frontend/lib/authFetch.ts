export type AuthFetchOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
  redirectTo?: string;
};

export async function authFetch(input: RequestInfo | URL, options: AuthFetchOptions = {}) {
  const {
    redirectOnUnauthorized = true,
    redirectTo = '/login',
    headers,
    ...rest
  } = options;

  const mergedHeaders = new Headers(headers ?? undefined);

  const response = await fetch(input, {
    ...rest,
    headers: mergedHeaders,
    credentials: 'include',
  });

  if (response.status === 401 && redirectOnUnauthorized && typeof window !== 'undefined') {
    window.location.replace(redirectTo);
  }

  return response;
}