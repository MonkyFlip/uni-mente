import {
  ApolloClient, InMemoryCache,
  createHttpLink, from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

const httpLink = createHttpLink({ uri: API_URL });

const authLink = setContext(async (_, { headers }) => {
  try {
    const raw   = await AsyncStorage.getItem('auth_user');
    const token = raw ? JSON.parse(raw).token : null;
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  } catch {
    return { headers };
  }
});

// Solo desloguea en errores 401 reales del servidor (no errores de credenciales inválidas)
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // Solo logout si es un token expirado/inválido, no si son credenciales incorrectas
      if (
        err.extensions?.code === 'UNAUTHENTICATED' ||
        (err.message.includes('Unauthorized') && !err.message.includes('nválid'))
      ) {
        AsyncStorage.removeItem('auth_user').catch(() => {});
      }
    }
  }
  // networkError se loguea en consola pero no se re-lanza
  if (networkError) {
    console.log('[Network error]', networkError.message);
  }
});

export const client = new ApolloClient({
  link:  from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    mutate:     { errorPolicy: 'all' },
  },
});