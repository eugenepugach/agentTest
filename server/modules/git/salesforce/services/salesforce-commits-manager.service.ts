import { Logger } from '@/core';
import Container from 'typedi';
import { SALESFORCE_MAX_GRAPH_NODES_PER_REQUEST, SALESFORCE_MAX_REQUEST_SIZE_BYTES } from '@/constants';
import { chunkArray } from '../../../shared/utils';
import { ParsedCommit } from '@/modules/git/devops/types/parsed-commit.type';
import { SalesforceError } from '../errors/salesforce.error';
import { ComponentRecordType } from '../types/component-record-type';
import { ProceededComponentMeta } from '../types/proceeded-component-meta.type';
import { CompositeGraphsRequest, CompositeRequestBody } from '../types/salesforce-composite.type';
import { extractComponentIdsFromGraphsResponse } from '../utils/composite.utils';
import { SalesforceComponentsManager } from './salesforce-components-manager.service';
import { SalesforceCompositeService } from './salesforce-composite.service';
import { SalesforceLogger3 } from './salesforce-logger-v3.service';

export type SalesforceCommitsManagerOptions = {
  repositoryId: string;
  branchId: string;
  logger: SalesforceLogger3;
  recordTypes: ComponentRecordType[];
  commitId?: string;
};

export class SalesforceCommitsManager {
  private readonly COMPONENTS_PER_CHUNK = 3; // Component + History + Attachment in all cases
  private readonly logger = new Logger(SalesforceCommitsManager.name);
  private readonly sfLogger = this.options.logger;
  private readonly composite: SalesforceCompositeService = Container.get(SalesforceCompositeService);

  private proceededComponentsMeta: ProceededComponentMeta[] = [];

  constructor(private options: SalesforceCommitsManagerOptions) {}

  private async proceedChunksToUpload(chunksToUpload: CompositeRequestBody[][], toRepository = false): Promise<void> {
    const sendChunks = async (chunks: CompositeRequestBody[][]) => {
      await this.logger.log(
        `Sending ${chunks.reduce((count, chunk) => count + chunk.length, 0)} requests to composite api.`
      );
      const graphs = chunks.map(
        (chunk, index) =>
          ({
            graphId: `graph${index}`,
            compositeRequest: chunk,
          } as CompositeGraphsRequest[number])
      );

      const result = await this.composite.executeGraphs(graphs);

      if (toRepository) {
        const idRefsList = extractComponentIdsFromGraphsResponse(result);

        for (const { id, ref } of idRefsList) {
          const proceededComponentMeta = this.proceededComponentsMeta.find((meta) => meta.reference === ref);

          if (proceededComponentMeta) {
            proceededComponentMeta.componentId = id;
          }
        }
      }
    };
    const threshold = 2000000;

    let currentSize = 0;
    let currentChunk: CompositeRequestBody[][] = [];
    for (const chunk of chunksToUpload) {
      const size = chunk.reduce((count, request) => {
        const requestSize = JSON.stringify(request).length * 2;

        return count + requestSize;
      }, 0);

      if (size > SALESFORCE_MAX_REQUEST_SIZE_BYTES) {
        throw new SalesforceError(
          `Cannot upload components due to size - MAX_SIZE = ${SALESFORCE_MAX_REQUEST_SIZE_BYTES} COMPONENTS_SIZE = ${size}`
        );
      }

      if (currentSize + size > SALESFORCE_MAX_REQUEST_SIZE_BYTES - threshold) {
        await sendChunks(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }

      currentSize += size;
      currentChunk.push(chunk);
    }

    if (currentChunk.length) {
      await sendChunks(currentChunk);
    }
  }

  private async proceedRequests(requests: CompositeRequestBody[], toRepository = false): Promise<void> {
    const componentsPerChunk = (this.COMPONENTS_PER_CHUNK + +toRepository) * 3;

    const chunks = chunkArray(requests, componentsPerChunk); // utilize 2 components to 1 graph

    try {
      while (chunks.length) {
        const chunksToUpload = chunks.splice(
          0,
          Math.floor(SALESFORCE_MAX_GRAPH_NODES_PER_REQUEST / componentsPerChunk)
        );

        await this.proceedChunksToUpload(chunksToUpload, toRepository);
      }
    } catch (error) {
      this.logger.error(error instanceof SalesforceError ? JSON.stringify(error.toJSON(), null, 2) : error);
      this.sfLogger.log(
        error instanceof SalesforceError ? JSON.stringify(error.toJSON(), null, 2) : (error as any).toString()
      );
      throw error;
    }
  }

  private async proceedCommitsToRepository(commits: ParsedCommit[]): Promise<void> {
    for (const commit of commits) {
      if (!commit.inserted.length && !commit.modified.length && !commit.removed.length) {
        continue;
      }

      const requests: CompositeRequestBody[] = [];
      const deleteRequests: {
        manifests: CompositeRequestBody[];
        componentsToUpdate: CompositeRequestBody[];
        componentsToDelete: CompositeRequestBody[];
      }[] = [];

      const componentsManager = new SalesforceComponentsManager(
        this.options.repositoryId,
        this.options.branchId,
        commit.author,
        this.options.recordTypes,
        this.proceededComponentsMeta
      );

      requests.push(...(await componentsManager.insert(commit.inserted, this.options.commitId)));
      requests.push(...(await componentsManager.update(commit.modified, this.options.commitId)));
      deleteRequests.push(await componentsManager.delete(commit.removed, true));

      this.proceededComponentsMeta = componentsManager.getProceededComponentsMeta();

      await this.proceedRequests(requests, true);

      for (const requestsToRemove of deleteRequests) {
        if (requestsToRemove.manifests.length) {
          await this.proceedRequests(requestsToRemove.manifests, true);
        }
        if (requestsToRemove.componentsToUpdate.length) {
          await this.proceedRequests(requestsToRemove.componentsToUpdate, true);
        }
        if (requestsToRemove.componentsToDelete.length) {
          await this.proceedRequests(requestsToRemove.componentsToDelete, true);
        }
      }

      this.logger.log('have to proceed %d composite requests (repository)', requests.length);
    }
  }

  private async proceedCommitsToBranch(commits: ParsedCommit[]): Promise<void> {
    const requests: CompositeRequestBody[] = [];
    const deleteRequests: {
      manifests: CompositeRequestBody[];
      componentsToUpdate: CompositeRequestBody[];
      componentsToDelete: CompositeRequestBody[];
    }[] = [];

    for (const commit of commits) {
      if (!commit.inserted.length && !commit.modified.length && !commit.removed.length) {
        continue;
      }

      const componentsManager = new SalesforceComponentsManager(
        this.options.repositoryId,
        this.options.branchId,
        commit.author,
        this.options.recordTypes,
        []
      );

      requests.push(...(await componentsManager.insert(commit.inserted)));
      requests.push(...(await componentsManager.update(commit.modified)));

      deleteRequests.push(await componentsManager.delete(commit.removed));
    }

    this.logger.log('have to proceed %d composite requests (branch)', requests.length);

    await this.proceedRequests(requests);

    const requestsToRemove = deleteRequests.reduce(
      (acc, next) => ({
        manifests: [...acc.manifests, ...next.manifests],
        componentsToDelete: [...acc.componentsToDelete, ...next.componentsToDelete],
        componentsToUpdate: [...acc.componentsToUpdate, ...next.componentsToUpdate],
      }),
      {
        manifests: [],
        componentsToDelete: [],
        componentsToUpdate: [],
      }
    );

    if (requestsToRemove.manifests.length) {
      await this.proceedRequests(requestsToRemove.manifests, true);
    }
    if (requestsToRemove.componentsToUpdate.length) {
      await this.proceedRequests(requestsToRemove.componentsToUpdate, true);
    }
    if (requestsToRemove.componentsToDelete.length) {
      await this.proceedRequests(requestsToRemove.componentsToDelete, true);
    }
  }

  public async proceedCommits(commits: ParsedCommit[]): Promise<void> {
    if (this.options.branchId) {
      await this.proceedCommitsToBranch(commits);
    } else {
      await this.proceedCommitsToRepository(commits);
    }
  }
}
