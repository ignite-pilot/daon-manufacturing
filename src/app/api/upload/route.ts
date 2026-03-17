import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const BUCKET = 'ignite-pilot-s3-1';
const PREFIX = 'daon-manufacturing';
const REGION = process.env.AWS_REGION || 'ap-northeast-2';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/octet-stream',
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'file';
}

function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
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
    const allowedPrefixes = ['parts', 'machines', 'factories'];
    if (!allowedPrefixes.includes(subPrefix)) {
      return NextResponse.json({ error: 'prefix는 parts, machines, factories 중 하나만 가능합니다.' }, { status: 400 });
    }
    const type = (file.type || '').toLowerCase();
    const isImage = ALLOWED_TYPES.has(type) || type.startsWith('image/');
    const isFactoryDoc = subPrefix === 'factories' && (type === 'application/pdf' || type === 'application/octet-stream');
    if (!isImage && !isFactoryDoc) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다. (jpg, png, gif, webp 등)' }, { status: 400 });
    }
    const key = `${PREFIX}/${subPrefix}/${randomUUID()}-${sanitizeFileName(file.name || 'file')}`;
    const body = await file.arrayBuffer();
    const client = new S3Client({ region: REGION });
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: new Uint8Array(body),
        ContentType: file.type || (type.startsWith('image/') ? type : 'application/octet-stream'),
      })
    );
    const url = getPublicUrl(key);
    return NextResponse.json({ url, key });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '업로드 실패' },
      { status: 500 }
    );
  }
}
