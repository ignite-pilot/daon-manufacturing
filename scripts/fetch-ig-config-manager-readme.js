/**
 * AWS Secrets Manager "prod/ignite-pilot/github" 에서 GitHub 토큰을 읽어
 * ignite-pilot/ig-config-manager 저장소의 README.md 내용을 가져옵니다.
 * CommonWebDevGuide.md 참고.
 *
 * 사용: node scripts/fetch-ig-config-manager-readme.js
 * 필요: AWS 자격 증명 설정됨, @aws-sdk/client-secrets-manager
 */
const { GetSecretValueCommand, SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

const SECRET_ID = 'prod/ignite-pilot/github';
const REPO = 'ignite-pilot/ig-config-manager';
const README_PATH = 'README.md';

async function getGitHubToken() {
  const client = new SecretsManagerClient({});
  const response = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
  if (!response.SecretString) throw new Error('SecretString이 비어 있습니다.');
  const str = response.SecretString.trim();
  let raw;
  if (str.startsWith('{')) {
    raw = JSON.parse(str);
  } else {
    return str;
  }
  const token = raw['GITHUB-PAT'] ?? raw.GITHUB_PAT ?? raw.token ?? raw.GITHUB_TOKEN ?? raw.PAT;
  if (!token) {
    console.error('시크릿 키 목록:', Object.keys(raw));
    throw new Error('시크릿에 GITHUB_PAT / token 등 키가 없습니다.');
  }
  return String(token).trim();
}

async function fetchReadme(token) {
  const url = `https://api.github.com/repos/${REPO}/contents/${README_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.text();
}

async function main() {
  const token = await getGitHubToken();
  console.log('GitHub 토큰 조회됨 (길이:', token.length, ')');
  const readme = await fetchReadme(token);
  console.log('--- README.md (처음 4000자) ---\n');
  console.log(readme.slice(0, 4000));
  if (readme.length > 4000) console.log('\n... (이하 생략, 총', readme.length, '자)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
