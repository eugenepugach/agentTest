import { readdir } from 'fs/promises';
import { resolve } from 'path';

export function joinURL(...paths: string[]): string {
  let url = '';
  paths.forEach((path) => {
    let normalizedUrl = path.replace(/(?<!(http(s)?:))(\/){2,}/g, '/');
    const firstSlash = path.indexOf('/');
    if (url && firstSlash === 0) {
      normalizedUrl = normalizedUrl.substr(1);
    }
    const lastSlash = normalizedUrl.lastIndexOf('/');
    if (lastSlash === normalizedUrl.length - 1) {
      normalizedUrl = normalizedUrl.substr(0, normalizedUrl.length - 1);
    }

    if (url) {
      url += `/${normalizedUrl}`;
    } else {
      url = normalizedUrl;
    }
  });

  return url;
}

export function encodeBase64(data: string): string {
  const buffer = Buffer.from(data);
  return buffer.toString('base64');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getProtocol(url: string): string {
  return url.split(':')[0];
}

export function randomString(length = 10): string {
  return Math.floor(Math.random() * Math.pow(10, length + 1)).toString(16);
}

export function deepAssign<T extends Record<string, any>, U extends Record<string, any>>(target: T, source: U): T & U {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) Object.assign(source[key], deepAssign(target[key], source[key]));
  }

  Object.assign(target || {}, source);
  return target as T & U;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) {
    return [];
  }

  if (array.length <= size) {
    return [array];
  }
  return [array.slice(0, size), ...chunkArray(array.slice(size), size)];
}

export async function getFiles(dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : (res as any);
    })
  );
  return Array.prototype.concat(...files);
}

export function getLastArrayItem<T>(array: T[]): T {
  return array[array.length - 1];
}
