import { AnyType } from '@/core/types/any.type';
import { Builder, ParserOptions, parseStringPromise } from 'xml2js';

const EQUALS_PROPERTY = 'fullName';

export class Xml {
  private static getRootNodeName(body: AnyType): string {
    return Object.keys(body)[0];
  }

  public static removeAt(parent: AnyType, type: string, name: string): void {
    try {
      const parentType = Object.keys(parent)[0];

      const parentTypeField: any[] = parent[parentType][type];

      if (parentTypeField) {
        const childToRemove = parentTypeField.find((child: any) => child[EQUALS_PROPERTY][0] === name);

        if (childToRemove) {
          parentTypeField.splice(parentTypeField.indexOf(childToRemove), 1);
        }
      }
    } catch (error) {
      console.log({
        error,
        parent,
        type,
        name,
      });
    }
  }

  public static replaceOrAppend(parent: AnyType, child: AnyType): void {
    try {
      const parentType = Object.keys(parent)[0];
      const childType = Object.keys(child[parentType]).pop() as string;

      const childBody = child[parentType][childType][0];

      const parentChilds = parent[parentType][childType];

      if (parentChilds) {
        const existedChild = parentChilds.find(
          (parentChild: any) => parentChild[EQUALS_PROPERTY][0] === childBody[EQUALS_PROPERTY][0]
        );

        if (!existedChild) {
          parentChilds.push(childBody);
        } else {
          parentChilds[parentChilds.indexOf(existedChild)] = childBody;
        }
      } else {
        parent[parentType][childType] = [childBody];
      }
    } catch (error) {
      console.log({
        error,
        parent,
        child,
      });
    }
  }

  public static parse(body: string, options?: ParserOptions): Promise<Record<string, any>> {
    return parseStringPromise(body, options || {});
  }

  public static convertToString(body: AnyType, newLineAtEOF = true): string {
    return (
      new Builder({
        xmldec: { standalone: null, encoding: 'UTF-8', version: '1.0' } as any,
        renderOpts: { pretty: true, indent: '    ', newline: '\n' },
      }).buildObject(body) + (newLineAtEOF ? '\n' : '')
    );
  }

  public static isEmptyXml(body: AnyType): boolean {
    const rootNodeName = Object.keys(body)[0];

    if (!rootNodeName) {
      return true;
    }

    const childNodeNames = Object.keys(body[rootNodeName]);

    for (const nodeName of childNodeNames) {
      if (nodeName === '$') continue;

      const node = body[rootNodeName][nodeName];

      if (Array.isArray(node) && !!node.length) return false;
    }

    return true;
  }

  public static getChildsByName(body: AnyType, nodeName: string): { nodeName: string; nodeData: AnyType }[] {
    return body[this.getRootNodeName(body)][nodeName].map((nodeData: AnyType) => ({ nodeName, nodeData }));
  }

  public static hasChildNodes(body: AnyType, childNodeName: string): boolean {
    return !!body[this.getRootNodeName(body)][childNodeName];
  }

  public static addChildNode(body: AnyType, childNodeName: string, childNodeData: AnyType): AnyType {
    body[this.getRootNodeName(body)][childNodeName] = [childNodeData];

    return body;
  }

  public static createEmptyRootNodeFrom(body: AnyType): AnyType {
    const rootNodeName = this.getRootNodeName(body);

    return {
      [rootNodeName]: {
        $: body[rootNodeName]['$'],
      },
    };
  }
}
