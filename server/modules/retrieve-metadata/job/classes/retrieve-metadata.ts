import { AxiosInstanceUtils } from '@flosum/salesforce';
import ManifestManager from '@retrieve-metadata-job/classes/manifest-manger';
import Logger from '@retrieve-metadata-job/classes/logger';
import path from 'path';
import { ChunkItem } from '@retrieve-metadata-job/interfaces/job.interfaces';
import { writeFile } from 'fs/promises';
import { makeDir } from '@/modules/shared/utils/fs.utils';
import sizeof from 'object-sizeof';
import RetrieveFactory from '@retrieve-metadata-job/classes/retrieve-factory';
import { AuthManager } from '@/modules/shared/managers/auth.manager';
import { RETRIEVE_RESULT_FOLDER_NAME, RETRIEVE_RESULTS_IDS_FILENAME } from '@/modules/retrieve-metadata/constants';
import shortid from 'shortid';
import JSZip from 'jszip';
import StateManager from '@/modules/shared/managers/state-manger';

export default class RetrieveMetadata {
  private readonly metadataFolder: string;
  private readonly retrieveResultsPath: string;

  constructor(
    private readonly jobStorePath: string,
    private readonly logger: Logger,
    private readonly stateManager: StateManager
  ) {
    this.metadataFolder = path.join(this.jobStorePath, RETRIEVE_RESULT_FOLDER_NAME);
    this.retrieveResultsPath = path.join(this.jobStorePath, RETRIEVE_RESULTS_IDS_FILENAME);
  }

  private async writeChunk(chunk: ChunkItem[]): Promise<string> {
    const chunkId = shortid();
    await writeFile(path.join(this.metadataFolder, `${chunkId}.json`), JSON.stringify(chunk));
    return chunkId;
  }

  public async execute(): Promise<void> {
    const { credentials, declarativeFilter, metadataTypes, maxChunkSize, maxChunkItems, apiVersion } =
      await new ManifestManager(this.jobStorePath).init();

    const instance = await AxiosInstanceUtils.create(new AuthManager(credentials), [], {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const retrieveResult = await RetrieveFactory.create(
      instance,
      this.logger,
      declarativeFilter,
      metadataTypes,
      apiVersion
    ).execute();

    await makeDir(this.metadataFolder);

    let chunk: ChunkItem[] = [];
    const chunkIds: string[] = [];
    let chunkSize = 0;

    for (const type in retrieveResult.items) {
      for (const { listMetadataItem, files } of retrieveResult.items[type].components) {
        const zip = new JSZip();

        for (const filePath in files) {
          await zip.file(filePath, files[filePath]);
        }

        const zipFile = await zip.generateAsync({
          type: 'base64',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 9,
          },
        });

        const item: ChunkItem = {
          ...listMetadataItem,
          zip: zipFile,
        };

        const itemSize = sizeof(item);

        if (itemSize > maxChunkSize) {
          await this.stateManager.addWarning(
            `Item '${listMetadataItem.fileName}' size '${itemSize}' exceed limit '${maxChunkSize}'`
          );
          continue;
        }

        if (chunkSize + itemSize > maxChunkSize || chunk.length >= maxChunkItems) {
          const chunkId = await this.writeChunk(chunk);
          chunkIds.push(chunkId);

          chunkSize = 0;
          chunk = [];
        }

        chunk.push(item);
        chunkSize += itemSize;
      }
    }

    if (chunk.length) {
      const chunkId = await this.writeChunk(chunk);
      chunkIds.push(chunkId);
    }

    await writeFile(this.retrieveResultsPath, JSON.stringify(chunkIds));
  }
}
