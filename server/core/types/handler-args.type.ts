import { Context } from '../classes/context.class';

export const enum HandlerArgType {
  Context,
  Body,
  Path,
  Query,
  Request,
  Response,
  Next,
  Custom,
}

export type HandlerArgValue = (ctx: Context, data: any) => any;

export type HandlerArg = {
  index: number;
  type: HandlerArgType;
  data: any;
  value?: HandlerArgValue;
};
