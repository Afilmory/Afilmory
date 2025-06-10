import type { S3ClientConfig } from '@aws-sdk/client-s3'
import { S3Client } from '@aws-sdk/client-s3'
import { env } from '@env'

// 创建 S3 客户端
function createS3Client(): S3Client {
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required')
  }

  const s3ClientConfig: S3ClientConfig = {
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // from https://github.com/aws/aws-sdk-js-v3/issues/6810
    // some non AWS services like backblaze or cloudflare don't expect the new headers
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  }

  // 如果提供了自定义端点，则使用它
  if (env.S3_ENDPOINT) {
    s3ClientConfig.endpoint = env.S3_ENDPOINT
  }

  return new S3Client(s3ClientConfig)
}

export const s3Client = createS3Client()
