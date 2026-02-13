import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getServerEnv } from "@/src/lib/env";

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }

  const env = getServerEnv();

  r2Client = new S3Client({
    region: env.R2_REGION,
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  return r2Client;
}

export async function putObjectToR2(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}): Promise<void> {
  const env = getServerEnv();
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
      Metadata: params.metadata,
    }),
  );
}

export async function getObjectFromR2(key: string) {
  const env = getServerEnv();
  const client = getR2Client();

  return client.send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
}
