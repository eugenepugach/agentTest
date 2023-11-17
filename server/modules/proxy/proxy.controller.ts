import { ERR_NO_DESTINATION } from '@/constants/errors';
import { Controller, Version, Prefix, param, All } from '@/core';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { joinURL } from '@/modules/shared/utils';
import { NextFunction, Request, Response } from 'express';
import expressProxy, { ProxyOptions } from 'express-http-proxy';
import https from 'https';

@Controller()
@Version('v1')
@Prefix('proxy')
export class ProxyController {
  private readonly pfxCertificate: Buffer;
  private readonly pfxPassphrase: string;

  // constructor(private appSettings: AppSettingsService) {
  //   if (appSettings.store.enableProxyAuthority) {
  //     try {
  //       this.pfxCertificate = readFileSync(AUTHORITY_FILE_PATH);
  //       this.pfxPassphrase = appSettings.store.proxyAuthorityPassphrase;
  //
  //       if (!this.pfxPassphrase) {
  //         throw Error('No authority passphrase!');
  //       }
  //     } catch (error) {
  //       throw new Error(
  //         `Error occurred while loading PROXY_AUTHORITY. Make sure that file is in root folder and PROXY_AUTHORITY_PASSPHRASE env is filled in!`
  //       );
  //     }
  //   }
  // }

  @All('*')
  handler(@param.request() req: Request, @param.response() res: Response, @param.next() next: NextFunction): void {
    const { originalUrl, baseUrl } = req;
    const destination = req.get('X-Destination');

    if (!destination) {
      throw new BadRequestError(ERR_NO_DESTINATION);
    }

    const proxyOptions: ProxyOptions = {
      proxyReqPathResolver: () =>
        joinURL(destination, originalUrl.substring(originalUrl.indexOf(baseUrl) + baseUrl.length)),
      proxyReqOptDecorator: (request) => {
        if (this.pfxCertificate) {
          request.agent = new https.Agent({
            pfx: this.pfxCertificate,
            passphrase: this.pfxPassphrase,
          });
        }

        return request;
      },
    };

    req.context.requestEnded = true;
    expressProxy(destination, proxyOptions)(req, res, next);
  }
}
