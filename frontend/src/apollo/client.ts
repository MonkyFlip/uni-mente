import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

export const GRAPHQL_URL  = 'https://18.190.217.141/graphql';
export const API_BASE_URL = 'https://18.190.217.141';

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Only redirect to login on Unauthorized if we have NO valid token stored.
// This prevents transient errors from wiping an active session.
let redirecting = false;
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    const hasUnauthorized = graphQLErrors.some(e => e.message === 'Unauthorized');
    if (hasUnauthorized && !redirecting) {
      const token = localStorage.getItem('token');
      // Only wipe session if the token is truly absent
      if (!token) {
        redirecting = true;
        window.location.href = '/login';
      }
    }
  }
  if (networkError) console.error('[Apollo] Network error:', networkError);
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});