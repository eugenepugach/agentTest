import { Controller, param, Post, Version } from '@/core';
import { TrackingMetadataService } from '@/modules/tracking-metadata/services/tracking-metadata.service';
import {
  TrackingMetadataBody,
  TrackingMetadataJobResult,
} from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';

@Controller('tracking-metadata')
@Version('v1')
export class TrackingMetadataController {
  @Post('job')
  public async create(@param.body() body: TrackingMetadataBody): Promise<TrackingMetadataJobResult> {
    return TrackingMetadataService.createJob(body);
  }
}
