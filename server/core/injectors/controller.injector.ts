import { IRouter, IRouterMatcher, Router } from 'express';
import Container, { Constructable } from 'typedi';
import { Logger } from '../classes/logger.class';
import {
  CONTROLLER_DEFAULT_PREFIX,
  META_CONTROLLER,
  META_CONTROLLER_MIDDLEWARES,
  META_CONTROLLER_PATH,
  META_CONTROLLER_PREFIX,
  META_CONTROLLER_VERSION,
  META_HANDLER,
} from '../constants';
import { AnyType } from '../types/any.type';
import { HandlerFunction } from '../types/handler-function.type';
import { HandlerMeta } from '../types/handler-meta.type';
import { getHandlerMeta, normalizePaths } from '../utils';
import { handlerWrapper } from '../wrappers/handler.wrapper';
import { middlewareInjector } from './middleware.injector';

const logger = new Logger('controller-injector');

export class ControllerInjector {
  private router = Router({
    mergeParams: true,
  });

  protected nestedPath = '';

  private get handlers(): HandlerFunction[] {
    const prototype = Object.getPrototypeOf(this.instance);
    return Object.getOwnPropertyNames(prototype)
      .map((methodName) => prototype[methodName])
      .filter((method) => !!Reflect.getOwnMetadata(META_HANDLER, method));
  }

  private get middlewares(): Constructable<any>[] {
    return Reflect.getOwnMetadata(META_CONTROLLER_MIDDLEWARES, this.controllerType) || [];
  }

  private get prefix(): string {
    const controllerPrefix =
      Reflect.getOwnMetadata(META_CONTROLLER_PREFIX, this.controllerType) ?? CONTROLLER_DEFAULT_PREFIX;
    const controllerVerion = Reflect.getOwnMetadata(META_CONTROLLER_VERSION, this.controllerType) || '';

    return this.nestedPath ? '' : normalizePaths(controllerPrefix, controllerVerion);
  }

  private get path(): string {
    if (this.nestedPath) {
      return this.nestedPath;
    }

    const controllerPath = Reflect.getOwnMetadata(META_CONTROLLER_PATH, this.controllerType) || '';
    return normalizePaths(controllerPath);
  }

  protected get instance(): AnyType {
    return Container.get(this.controllerType);
  }

  constructor(private controllerType: Constructable<any>, private root?: ControllerInjector) {
    if (!Reflect.getOwnMetadata(META_CONTROLLER, controllerType)) {
      throw TypeError(`${controllerType.name} is not a Controller`);
    }
  }

  private async injectMiddlewares(): Promise<void> {
    for (const middleware of this.middlewares) {
      const middlewareHandler = await middlewareInjector(middleware);
      this.router.use(middlewareHandler);
    }
  }
  private async injectNestedController(handlerMeta: HandlerMeta): Promise<void> {
    const nestedController = handlerMeta.nested as Constructable<any>;

    logger.log(`injecting nested ${nestedController.name} at ${this.path}${handlerMeta.path}`);

    const nestedInjector = new ControllerInjector(nestedController, this);
    nestedInjector.nestedPath = handlerMeta.path;
    await nestedInjector.inject(this.router);
  }

  private async injectHandlers(): Promise<void> {
    for (const handler of this.handlers) {
      const meta = getHandlerMeta(handler);

      if (meta.nested) {
        await this.injectNestedController(meta);
      } else {
        const routerHandle = meta.method.toString().toLowerCase();

        logger.log(
          `injecting ${this.controllerType.name}#${handler.name} at [${meta.method}] ${normalizePaths(
            this.root?.path || '',
            this.path,
            meta.path
          )}`
        );

        ((this.router as any)[routerHandle] as IRouterMatcher<any>)(meta.path, handlerWrapper(handler, this.instance));
      }
    }
  }

  public async inject(router: IRouter): Promise<void> {
    if (!this.nestedPath) {
      logger.log(`injecting ${this.controllerType.name} {${this.prefix}}`);
    }

    await this.injectMiddlewares();
    await this.injectHandlers();

    router.use(`${this.prefix}${this.path}`, this.router);
  }
}
