import dotenv from 'dotenv';

dotenv.config();

// fallback support for old proxy implementation
if (process.env.QUOTAGUARDSTATIC_URL || process.env.PROXY_URL) {
  process.env.HTTP_PROXY = process.env.QUOTAGUARDSTATIC_URL || process.env.PROXY_URL;
}
