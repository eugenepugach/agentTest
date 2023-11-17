import { Controller, param, Post, Get, Version } from '@/core';
import { MaskingManifest } from '@data-masking-job/interfaces/job.interfaces';
import { MaskingService } from '@/modules/data-masking/services/masking.service';
import { JobState, LogMessage } from '@data-masking-job/interfaces/logger.interfaces';
import { BadRequestError } from '@/core/errors/bad-request.error';

@Controller('data-masking')
@Version('v1')
export class DataMaskingController {
  @Post('job')
  public async createJob(@param.body() body: MaskingManifest): Promise<{ jobId: string }> {
    return MaskingService.createMaskingJob(body);
  }

  @Get('job')
  public async getJobs(
    @param.query('limit') limit: string,
    @param.query('offset') offset?: string
  ): Promise<JobState[]> {
    if (!limit) {
      throw new BadRequestError(`Param 'limit' is missed`);
    }

    return MaskingService.getJobs(+limit, +(offset || 0));
  }

  @Get('job/:jobId')
  public async getJobState(
    @param.path('jobId') jobId: string,
    @param.query('includeDetails') includeDetails?: string
  ): Promise<JobState> {
    return MaskingService.getJobState(jobId, includeDetails === 'true');
  }

  @Get('job/:jobId/log')
  public async getLog(@param.path('jobId') jobId: string): Promise<LogMessage[]> {
    return MaskingService.getJobDetails(jobId);
  }
}
