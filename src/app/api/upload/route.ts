import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION || 'ap-northeast-2';
// local profile: STORAGE_ENDPOINT=http://localhost:9000 (MinIO)
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const BUCKET = process.env.STORAGE_BUCKET || 'ignite-pilot-s3-1';
const PREFIX = 'daon-manufacturing';

// parts / machines / factories prefix 용 허용 MIME 타입
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/octet-stream',
]);

// plans prefix 용: 파일 확장자 → 허용 MIME 타입 목록
// DXF 는 브라우저/OS 마다 MIME 타입이 달라 extension 을 1차 기준으로 사용한다.
// stage 1 추가 예정: dwg, jpg, png
// stage 2 추가 예정: xlsx, pdf, pptx
const PLAN_FORMAT_MIME: Record<string, string[]> = {
  dxf: ['application/dxf', 'image/vnd.dxf', 'application/acad', 'application/octet-stream', 'text/plain', ''],
  // dwg:  ['application/acad', 'application/octet-stream', ''],
  // jpg:  ['image/jpeg'],
  // png:  ['image/png'],
  // xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  // pdf:  ['application/pdf'],
  // pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'file';
}

function getFileExtension(fileName: string): string {
  return (fileName.split('.').pop() ?? '').toLowerCase();
}

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

function getPublicUrl(key: string): string {
  if (STORAGE_ENDPOINT) {
    return `${STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * plans prefix 파일 유효성 검사.
 * 확장자를 1차 기준으로 판별하고, MIME 타입이 명시된 경우 허용 목록과 대조한다.
 */
function validatePlanFile(file: File): { ok: true; format: string } | { ok: false; error: string } {
  const ext = getFileExtension(file.name || '');
  const allowedMimes = PLAN_FORMAT_MIME[ext];
  if (!allowedMimes) {
    const supported = Object.keys(PLAN_FORMAT_MIME).join(', ');
    return { ok: false, error: `허용된 도면 파일 형식: ${supported}` };
  }
  const mime = (file.type || '').toLowerCase();
  if (mime && !allowedMimes.includes(mime)) {
    return { ok: false, error: `${ext.toUpperCase()} 파일의 MIME 타입이 올바르지 않습니다. (받은 값: ${mime})` };
  }
  return { ok: true, format: ext };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data 필요' }, { status: 400 });
    }
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file 필드에 파일을 첨부해 주세요.' }, { status: 400 });
    }

    const subPrefix = (formData.get('prefix') as string)?.trim() || 'parts';
    const allowedPrefixes = ['parts', 'machines', 'factories', 'plans'];
    if (!allowedPrefixes.includes(subPrefix)) {
      return NextResponse.json(
        { error: `prefix는 ${allowedPrefixes.join(', ')} 중 하나만 가능합니다.` },
        { status: 400 }
      );
    }

    let detectedFormat: string | undefined;

    if (subPrefix === 'plans') {
      const result = validatePlanFile(file);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      detectedFormat = result.format;
    } else {
      const type = (file.type || '').toLowerCase();
      const isImage = ALLOWED_IMAGE_TYPES.has(type) || type.startsWith('image/');
      const isFactoryDoc = subPrefix === 'factories' && (type === 'application/pdf' || type === 'application/octet-stream');
      if (!isImage && !isFactoryDoc) {
        return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다. (jpg, png, gif, webp 등)' }, { status: 400 });
      }
    }

    const key = `${PREFIX}/${subPrefix}/${randomUUID()}-${sanitizeFileName(file.name || 'file')}`;
    const body = await file.arrayBuffer();
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: new Uint8Array(body),
        ContentType: file.type || 'application/octet-stream',
      })
    );
    const url = getPublicUrl(key);
    return NextResponse.json({ url, key, ...(detectedFormat !== undefined ? { format: detectedFormat } : {}) });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '업로드 실패' },
      { status: 500 }
    );
  }
}
