import { Controller, param, Post, Get, Version } from '@/core';
import RetrieveMetadataService from '@/modules/retrieve-metadata/services/retrieve-metadata.service';
import {
  CreateRetrieveJobResult,
  RetrieveMetadataBody,
  RetrieveMetadataJobLogsResult,
  RetrieveMetadataResult,
} from '@/modules/retrieve-metadata/interfaces/retrieve-metadata.interfaces';
import { JobState } from '@/modules/shared/interfaces/job.interfaces';
import { BadRequestError } from '@/core/errors/bad-request.error';

@Controller('retrieve-metadata')
@Version('v1')
export class RetrieveMetadataController {
  @Post('job')
  public async create(@param.body() body: RetrieveMetadataBody): Promise<CreateRetrieveJobResult> {
    if (!body.apiVersion) {
      throw new BadRequestError(`'apiVersion' is missed`);
    }

    return RetrieveMetadataService.createRetrieveJob(body);
  }

  @Get('job')
  public async getJobs(
    @param.query('limit') limit: string,
    @param.query('offset') offset?: string
  ): Promise<JobState[]> {
    if (!limit) {
      throw new BadRequestError(`Param 'limit' is missed`);
    }

    return RetrieveMetadataService.getJobs(+limit, +(offset || 0));
  }

  @Get('job/:jobId')
  public async status(@param.path('jobId') jobId: string): Promise<JobState> {
    return RetrieveMetadataService.getJobStatus(jobId);
  }

  @Get('job/:jobId/result')
  public async result(@param.path('jobId') jobId: string): Promise<string[]> {
    return RetrieveMetadataService.getResult(jobId);
  }

  @Get('job/:jobId/result/:chunkId')
  public async resultChunk(
    @param.path('jobId') jobId: string,
    @param.path('chunkId') chunkId: string
  ): Promise<RetrieveMetadataResult> {
    return RetrieveMetadataService.getResultChunk(jobId, chunkId);
  }

  @Get('job/:jobId/log')
  public async log(@param.path('jobId') jobId: string): Promise<RetrieveMetadataJobLogsResult> {
    return RetrieveMetadataService.getJobLogs(jobId);
  }
}
