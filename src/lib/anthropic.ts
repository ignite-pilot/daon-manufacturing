/**
 * Anthropic API 키 관리.
 * - local profile (PROFILE=local): ANTHROPIC_API_KEY 환경변수 직접 사용
 * - default profile: AWS Secrets Manager "prod/ignite-pilot/claude/ANTHROPIC_API_KEY"
 */
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const SECRET_ID = 'prod/ignite-pilot/claude/ANTHROPIC_API_KEY';

let cached: string | null = null;

export async function getAnthropicApiKey(): Promise<string> {
  if (cached) return cached;

  if (process.env.PROFILE === 'local' || process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    if (!key) throw new Error('ANTHROPIC_API_KEY 환경변수가 비어 있습니다.');
    cached = key;
    return cached;
  }

  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID })
  );

  if (!response.SecretString) {
    throw new Error(
      `AWS Secrets Manager "${SECRET_ID}": SecretString이 비어 있습니다.`
    );
  }

  const str = response.SecretString.trim();
  let key: string;

  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str) as Record<string, unknown>;
      key = String(
        parsed.ANTHROPIC_API_KEY ?? parsed.api_key ?? parsed.apiKey ?? parsed.key ?? ''
      );
    } catch {
      throw new Error(`AWS Secrets Manager "${SECRET_ID}": JSON 파싱 실패`);
    }
  } else {
    key = str;
  }

  if (!key) {
    throw new Error(`AWS Secrets Manager "${SECRET_ID}": API 키가 비어 있습니다.`);
  }

  cached = key;
  return cached;
}
