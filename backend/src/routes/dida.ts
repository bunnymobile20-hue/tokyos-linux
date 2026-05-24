import { Router } from 'express';
import {
  clearPersistedDidaToken,
  isDidaAccessTokenExpired,
  readPersistedDidaToken,
  writePersistedDidaToken,
} from '../utils/didaAuth';
import { logger } from '../utils/logger';

interface DidaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

const router = Router();

const DIDA_AUTH_BASE = 'https://ticktick.com/oauth';
const DIDA_API_BASE = 'https://api.ticktick.com/open/v1';
const DIDA_SCOPES = ['tasks:read', 'tasks:write'];

const CLIENT_ID = process.env.DIDA_CLIENT_ID?.trim() || '';
const CLIENT_SECRET = process.env.DIDA_CLIENT_SECRET?.trim() || '';

function buildRedirectUri(req: { protocol: string; originalUrl?: string; get(name: string): string | undefined }) {
  const configuredRedirectUri = process.env.DIDA_REDIRECT_URI?.trim();
  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return 'http://127.0.0.1:3001/api/system/dida/callback';
}

function assertDidaClientReady() {
  return CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;
}

function getProxyEndpoint(req: { originalUrl: string }): string {
  const marker = '/proxy/';
  const markerIndex = req.originalUrl.indexOf(marker);
  if (markerIndex < 0) {
    return '';
  }
  return req.originalUrl.slice(markerIndex + marker.length);
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<DidaTokenResponse> {
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', redirectUri);

  const response = await fetch(`${DIDA_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Dida token response is not JSON: ${text.slice(0, 180)}`);
  }

  if (!response.ok) {
    throw new Error(`Dida token exchange failed ${response.status}: ${JSON.stringify(payload)}`);
  }

  const tokenPayload = payload as Partial<DidaTokenResponse>;
  if (!tokenPayload.access_token || !tokenPayload.token_type || typeof tokenPayload.expires_in !== 'number') {
    throw new Error(`Dida token payload missing fields: ${JSON.stringify(payload)}`);
  }

  return tokenPayload as DidaTokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<DidaTokenResponse> {
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const response = await fetch(`${DIDA_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Dida refresh response is not JSON: ${text.slice(0, 180)}`);
  }

  if (!response.ok) {
    throw new Error(`Dida refresh failed ${response.status}: ${JSON.stringify(payload)}`);
  }

  const tokenPayload = payload as Partial<DidaTokenResponse>;
  if (!tokenPayload.access_token || !tokenPayload.token_type || typeof tokenPayload.expires_in !== 'number') {
    throw new Error(`Dida refresh payload missing fields: ${JSON.stringify(payload)}`);
  }

  return tokenPayload as DidaTokenResponse;
}

async function ensureValidAccessToken() {
  const token = await readPersistedDidaToken();
  if (!token || !token.access_token) {
    return null;
  }

  if (!isDidaAccessTokenExpired(token)) {
    return token;
  }

  if (!token.refresh_token) {
    return null;
  }

  const refreshed = await refreshAccessToken(token.refresh_token);
  const persisted = await writePersistedDidaToken(refreshed);
  logger.info('Dida access token refreshed', { module: 'DidaAuth' });
  return persisted;
}

router.get('/auth/url', (req, res) => {
  if (!assertDidaClientReady()) {
    res.status(500).json({ success: false, error: 'Dida client credentials are missing' });
    return;
  }

  const redirectUri = buildRedirectUri(req);
  const url = new URL(`${DIDA_AUTH_BASE}/authorize`);
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('scope', DIDA_SCOPES.join(' '));
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('state', 'clawos-dida');

  res.json({
    success: true,
    url: url.toString(),
    redirectUri,
    hint: 'Por favor adicione isto redirect_uri Configurado com precisão para a plataforma de desenvolvedor Dida（Endereço de retorno de chamada do aplicativo）',
  });
});

router.get('/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const error = typeof req.query.error === 'string' ? req.query.error : '';

  if (error) {
    logger.warn(`Dida authorize rejected: ${error}`, { module: 'DidaAuth' });
    res.status(400).send('<script>window.opener.postMessage({type:"dida-auth-error",error:"Autorização negada"}, "*"); window.close();</script>Autorização negada。');
    return;
  }

  if (!code) {
    res.status(400).send('<script>window.opener.postMessage({type:"dida-auth-error",error:"Código de autorização ausente"}, "*"); window.close();</script>Código de autorização ausente。');
    return;
  }

  if (state && state !== 'clawos-dida') {
    res.status(400).send('<script>window.opener.postMessage({type:"dida-auth-error",error:"Falha na verificação do parâmetro de status"}, "*"); window.close();</script>Falha na verificação do parâmetro de status。');
    return;
  }

  try {
    const redirectUri = buildRedirectUri(req);
    const tokenPayload = await exchangeCodeForToken(code, redirectUri);
    await writePersistedDidaToken(tokenPayload);

    logger.info('Dida OAuth callback success', { module: 'DidaAuth' });
    res.send('<script>window.opener.postMessage({type:"dida-auth-success"}, "*"); window.close();</script>Autorização bem-sucedida，Esta janela pode ser fechada。');
  } catch (errorObj) {
    const errorMessage = errorObj instanceof Error ? errorObj.message : 'Unknown error';
    logger.error(`Dida OAuth callback failed: ${errorMessage}`, { module: 'DidaAuth' });
    res.status(500).send(`<script>window.opener.postMessage({type:"dida-auth-error",error:${JSON.stringify(errorMessage)}}, "*"); window.close();</script>Falha na autorização：${errorMessage}`);
  }
});

router.get('/status', async (_req, res) => {
  try {
    const token = await ensureValidAccessToken();
    res.json({
      success: true,
      connected: Boolean(token?.access_token),
      expiresIn: token?.expires_in ?? null,
      updatedAt: token?.updatedAt ?? null,
    });
  } catch (errorObj) {
    const errorMessage = errorObj instanceof Error ? errorObj.message : 'Unknown error';
    logger.error(`Read Dida status failed: ${errorMessage}`, { module: 'DidaAuth' });
    res.status(500).json({ success: false, connected: false, error: errorMessage });
  }
});

router.post('/logout', async (_req, res) => {
  await clearPersistedDidaToken();
  res.json({ success: true });
});

router.all(/^\/proxy\/.+/, async (req, res) => {
  try {
    const token = await ensureValidAccessToken();
    if (!token || !token.access_token) {
      res.status(401).json({ success: false, error: 'Not authenticated with TickTick' });
      return;
    }

    const endpoint = getProxyEndpoint(req);
    if (!endpoint) {
      res.status(400).json({ success: false, error: 'Invalid Dida proxy endpoint' });
      return;
    }

    const upstreamUrl = `${DIDA_API_BASE}/${endpoint}`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
    });

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const text = await upstreamResponse.text();

    if (contentType.includes('application/json')) {
      const jsonPayload = text ? (JSON.parse(text) as unknown) : null;
      res.status(upstreamResponse.status).json(jsonPayload);
      return;
    }

    res.status(upstreamResponse.status).send(text);
  } catch (errorObj) {
    const errorMessage = errorObj instanceof Error ? errorObj.message : 'Unknown error';
    logger.error(`Dida proxy failed: ${errorMessage}`, { module: 'DidaAuth' });
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
