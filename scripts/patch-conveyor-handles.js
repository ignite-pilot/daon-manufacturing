/**
 * Plan/2 SVG의 CONVEYOR LWPOLYLINE data-handle을
 * 대응하는 HATCH의 data-handle로 교체하여 MinIO에 업로드하는 스크립트.
 *
 * 사용: node scripts/patch-conveyor-handles.js
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  forcePathStyle: true,
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin123' },
});

const BUCKET = 'daon-mfg-local';
const KEY = 'daon-manufacturing/plans/2/drawing.svg';

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * SVG 텍스트에서 CONVEYOR 엘리먼트를 파싱해 bbox를 구한다.
 * path × 2 = HATCH, polygon × 1 = LWPOLYLINE (outline)
 */
function parseConveyorElements(svg) {
  const elRegex = /<(path|polygon|polyline)(\s[^>]*)data-plantsim-category="CONVEYOR"([^>]*)>/g;
  const items = [];
  let m;
  while ((m = elRegex.exec(svg)) !== null) {
    const tagName = m[1];
    const allAttrs = m[2] + m[3];
    const handle = (allAttrs.match(/data-handle="([^"]+)"/) || [])[1];
    if (!handle) continue;

    let xs = [], ys = [];
    const dMatch = allAttrs.match(/\bd="([^"]+)"/);
    const ptsMatch = allAttrs.match(/\bpoints="([^"]+)"/);

    if (dMatch) {
      const coords = dMatch[1].match(/-?[\d.]+(?:e[+-]?\d+)?/gi) || [];
      for (let i = 0; i + 1 < coords.length; i += 2) {
        xs.push(parseFloat(coords[i]));
        ys.push(parseFloat(coords[i + 1]));
      }
    } else if (ptsMatch) {
      const coords = ptsMatch[1].trim().split(/[\s,]+/);
      for (let i = 0; i + 1 < coords.length; i += 2) {
        xs.push(parseFloat(coords[i]));
        ys.push(parseFloat(coords[i + 1]));
      }
    }

    if (xs.length === 0) continue;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    // path → HATCH (fill), polygon → LWPOLYLINE (outline)
    const entityType = tagName === 'polygon' ? 'LWPOLYLINE' : 'HATCH';
    items.push({ handle, entityType, tagName, minX, maxX, minY, maxY });
  }
  return items;
}

function bboxOverlap(a, b, tol = 1) {
  return (
    a.minX <= b.maxX + tol && a.maxX >= b.minX - tol &&
    a.minY <= b.maxY + tol && a.maxY >= b.minY - tol
  );
}

async function main() {
  console.log('MinIO에서 SVG 다운로드 중...');
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
  let svg = await streamToString(res.Body);
  console.log(`SVG 크기: ${svg.length} bytes`);

  const items = parseConveyorElements(svg);
  console.log(`CONVEYOR 엘리먼트 수: ${items.length}`);

  // HATCH vs LWPOLYLINE 분리
  const hatches = items.filter(i => i.entityType === 'HATCH');
  const polys = items.filter(i => i.entityType === 'LWPOLYLINE' || i.entityType === 'POLYLINE');
  // 중복 제거 (HATCH는 2개 path 공유 - handle 기준 unique)
  const uniqueHatches = [];
  const seenH = new Set();
  for (const h of hatches) { if (!seenH.has(h.handle)) { seenH.add(h.handle); uniqueHatches.push(h); } }

  console.log(`HATCH 고유 핸들 수: ${uniqueHatches.length}`);
  console.log(`LWPOLYLINE 수: ${polys.length}`);

  if (uniqueHatches.length === 0 || polys.length === 0) {
    console.log('패치할 대상이 없습니다.');
    return;
  }

  // 각 LWPOLYLINE을 bbox 겹침으로 HATCH와 매칭
  let patchCount = 0;
  for (const poly of polys) {
    // 이미 HATCH handle과 같으면 skip
    if (seenH.has(poly.handle)) continue;

    // bbox가 겹치는 HATCH 찾기
    const matched = uniqueHatches.filter(h => bboxOverlap(h, poly));
    if (matched.length === 0) {
      console.warn(`  [경고] ${poly.handle} (LWPOLYLINE) 에 매칭 HATCH 없음`);
      continue;
    }
    if (matched.length > 1) {
      // 가장 bbox 겹침이 큰 것 선택
      matched.sort((a, b) => {
        const overlapArea = (h, p) => {
          const w = Math.min(h.maxX, p.maxX) - Math.max(h.minX, p.minX);
          const ht = Math.min(h.maxY, p.maxY) - Math.max(h.minY, p.minY);
          return w * ht;
        };
        return overlapArea(b, poly) - overlapArea(a, poly);
      });
    }
    const hatch = matched[0];
    console.log(`  ${poly.handle} (LWPOLYLINE) → ${hatch.handle} (HATCH)`);

    // polygon 태그에서 data-handle="poly.handle" → data-handle="hatch.handle"
    // polygon은 항상 LWPOLYLINE (outline)
    const beforeLen = svg.length;
    const polyRegex = new RegExp(
      `(<polygon[^>]*?)data-handle="${poly.handle}"([^>]*>)`, 'g'
    );
    svg = svg.replace(polyRegex, `$1data-handle="${hatch.handle}"$2`);
    // data-handle이 앞에 오는 경우도 처리
    const polyRegex2 = new RegExp(
      `(data-handle="${poly.handle}")([^>]*<polygon)`, 'g'
    );
    svg = svg.replace(polyRegex2, `data-handle="${hatch.handle}"$2`);
    patchCount++;
  }

  console.log(`\n총 ${patchCount}개 LWPOLYLINE handle 패치 완료`);

  // 검증: 패치 후 CONVEYOR handle 고유 수
  const itemsAfter = parseConveyorElements(svg);
  const uniqueHandlesAfter = new Set(itemsAfter.map(i => i.handle));
  console.log(`패치 후 CONVEYOR 고유 handle 수: ${uniqueHandlesAfter.size}`);
  console.log(`패치 후 CONVEYOR element 수: ${itemsAfter.length}`);

  // MinIO에 업로드
  console.log('\nMinIO에 SVG 업로드 중...');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: svg,
    ContentType: 'image/svg+xml',
  }));
  console.log('업로드 완료!');
}

main().catch(e => { console.error(e); process.exit(1); });
