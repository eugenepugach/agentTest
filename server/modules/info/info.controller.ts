import path from 'path';
import { Controller, Get } from '@/core';

@Controller('info')
export class InfoController {
  @Get()
  public async index(): Promise<{ version: string }> {
    const packageJson = await import(path.join(process.cwd(), 'package.json'));

    return {
      version: packageJson.version,
    };
  }
}
