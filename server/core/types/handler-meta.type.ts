import { Constructable } from 'typedi';
import { HandlerMethod } from './handler-method.type';

export type HandlerMeta = {
  path: string;
  method: HandlerMethod;
  nested?: Constructable<any>;
};
