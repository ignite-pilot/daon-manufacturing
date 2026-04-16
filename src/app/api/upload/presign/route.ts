import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION || 'ap-northeast-2';
// local profile: STORAGE_ENDPOINT=http://localhost:9000 (MinIO)
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const BUCKET = process.env.STORAGE_BUCKET || 'ignite-pilot-s3-1';
const PREFIX = 'daon-manufacturing';
const EXPIRE_SEC = 3600;

function getS3Client(): S3Client {
  if (STORAGE_ENDPOINT) {
    return new S3Client({
      region: REGION,
      endpoint: STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
      },
    });
  }
  return new S3Client({ region: REGION });
}

/**
 * 저장된 photo_url에서 S3/MinIO 객체 키 추출 (보안: daon-manufacturing/ 로 시작하는 키만 허용)
 * - default profile (AWS S3): https://{bucket}.s3.{region}.amazonaws.com/{key}
 * - local profile (MinIO):    http://localhost:9000/{bucket}/{key}
 */
function getKeyFromStoredUrl(storedUrl: string): string | null {
  try {
    const u = new URL(storedUrl);
    const pathname = u.pathname || '';
    let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    // local profile (MinIO path-style): pathname = /{bucket}/{key} → 버킷명 제거
    if (STORAGE_ENDPOINT) {
      const bucketPrefix = BUCKET + '/';
      if (key.startsWith(bucketPrefix)) {
        key = key.slice(bucketPrefix.length);
      }
    }

    if (!key || !key.startsWith(PREFIX + '/')) return null;
    return key;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get('url');
    if (!urlParam) {
      return NextResponse.json({ error: 'url 쿼리가 필요합니다.' }, { status: 400 });
    }
    const storedUrl = decodeURIComponent(urlParam);
    const key = getKeyFromStoredUrl(storedUrl);
    if (!key) {
      return NextResponse.json({ error: '유효하지 않은 URL입니다.' }, { status: 400 });
    }
    const client = getS3Client();
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: EXPIRE_SEC });
    return NextResponse.redirect(signedUrl);
  } catch (e) {
    console.error('[upload/presign]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Presign 실패' },
      { status: 500 }
    );
  }
}
