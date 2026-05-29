import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

let cachedClient: S3Client | null = null;

function getR2Client() {
  const config = getR2Config();

  if (!config) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return {
    client: cachedClient,
    bucketName: config.bucketName,
  };
}

async function storeTenantClientDocument(input: {
  area: string;
  tenantId: string;
  clientId: string;
  fileName: string;
  contentType?: string | null;
  buffer: Buffer;
}) {
  const objectKey = `${input.area}/${input.tenantId}/${input.clientId}/${input.fileName}`;
  const r2 = getR2Client();

  if (r2) {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucketName,
        Key: objectKey,
        Body: input.buffer,
        ContentType: input.contentType || "application/octet-stream",
      }),
    );

    return {
      storageProvider: "r2" as const,
      storedPath: objectKey,
      bucketName: r2.bucketName,
    };
  }

  const relativeDir = path.join(input.area, input.tenantId, input.clientId);
  const absoluteDir = path.join(UPLOAD_ROOT, relativeDir);
  await mkdir(absoluteDir, { recursive: true });

  const absolutePath = path.join(absoluteDir, input.fileName);
  const relativePath = path.join("uploads", relativeDir, input.fileName);
  await writeFile(absolutePath, input.buffer);

  return {
    storageProvider: "local" as const,
    storedPath: relativePath,
    bucketName: null,
  };
}

export async function storeClientPortalDocument(input: {
  tenantId: string;
  clientId: string;
  fileName: string;
  contentType?: string | null;
  buffer: Buffer;
}) {
  return storeTenantClientDocument({
    area: "client-portal",
    ...input,
  });
}

export async function storeCreditReportImportDocument(input: {
  tenantId: string;
  clientId: string;
  fileName: string;
  contentType?: string | null;
  buffer: Buffer;
}) {
  return storeTenantClientDocument({
    area: "report-ingestion",
    ...input,
  });
}

export function getClientPortalStorageMode() {
  return getR2Config() ? "r2" : "local";
}
