import { readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { RetrieveMetadataManifest } from '@retrieve-metadata-job/interfaces/job.interfaces';
import { AuthDetails } from '@/modules/shared/interfaces/auth.interfaces';
import { DeclarativeFilter } from '@/modules/retrieve-metadata/interfaces/retrieve-metadata.interfaces';
import { MANIFEST_FILENAME } from '@/constants/job';
import { MAX_METADATA_ITEMS, MAX_METADATA_CHUNK_SIZE } from '@/modules/retrieve-metadata/constants';

export default class ManifestManager {
  private manifest: RetrieveMetadataManifest;

  constructor(private readonly jobStorePath: string) {}

  public get credentials(): AuthDetails {
    return this.manifest.credentials;
  }

  public get declarativeFilter(): DeclarativeFilter | null {
    return this.manifest.declarativeFilter;
  }

  public get metadataTypes(): string[] | null {
    return this.manifest.metadataTypes;
  }

  public get maxChunkSize(): number {
    return this.manifest.maxChunkSize || MAX_METADATA_CHUNK_SIZE;
  }

  public get maxChunkItems(): number {
    return this.manifest.maxChunkItems || MAX_METADATA_ITEMS;
  }

  public get apiVersion(): string {
    return this.manifest.apiVersion;
  }

  private static getManifestPath(jobStorePath: string): string {
    return path.join(jobStorePath, MANIFEST_FILENAME);
  }

  public static create(jobStorePath: string, details: RetrieveMetadataManifest): Promise<void> {
    const manifestPath = ManifestManager.getManifestPath(jobStorePath);

    return writeFile(manifestPath, JSON.stringify({ details }));
  }

  public async init(): Promise<ManifestManager> {
    const manifestPath = ManifestManager.getManifestPath(this.jobStorePath);

    this.manifest = await readFile(manifestPath, { encoding: 'utf-8' })
      .then(JSON.parse)
      .then(({ details }) => details);

    await rm(manifestPath, { recursive: true, force: true });

    return this;
  }
}
