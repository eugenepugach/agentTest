import { X2JS } from './__x2js.js';
import vkbeautify from 'vkbeautify';

const EQUALS_PROPERTY = 'fullName';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

type AnyType = any;

const createX2JS = () =>
  new X2JS({
    useDoubleQuotes: true,
    escapeMode: true,
    stripWhitespaces: false,
  });

export class XmlV2 {
  private static getRootNodeName(body: AnyType): string {
    return Object.keys(body)[0];
  }

  public static removeAt(parent: AnyType, type: string, name: string): void {
    try {
      const parentType = this.getRootNodeName(parent);

      const children: Record<string, any> | Record<string, any>[] = parent[parentType][type];

      if (Array.isArray(children)) {
        const childToRemove = children.find((child: any) => child[EQUALS_PROPERTY] === name);

        if (childToRemove) {
          children.splice(children.indexOf(childToRemove), 1);
        }
      } else {
        if (children[EQUALS_PROPERTY] === name) {
          delete parent[parentType][type];
        }
      }
    } catch (error) {
      console.log({
        error,
      });
    }
  }

  public static replaceOrAppend(parent: AnyType, child: AnyType): void {
    try {
      const parentType = this.getRootNodeName(parent);
      const childType = Object.keys(child[parentType]).find((key) => key !== '_xmlns');

      if (!childType) {
        throw new Error(`Invalid child type in ${parentType} parent and child: ${JSON.stringify(child)}`);
      }

      const childBody = child[parentType][childType];
      let parentChildren: Record<string, any> | Record<string, any>[] = parent[parentType][childType];

      if (parentChildren) {
        if (!Array.isArray(parentChildren)) {
          parentChildren = [parentChildren];
          parent[parentType][childType] = parentChildren;
        }

        const existedIndex: number = parentChildren.findIndex(
          (parentChild: any) =>
            parentChild[EQUALS_PROPERTY] === childBody[0]?.[EQUALS_PROPERTY] ||
            parentChild[EQUALS_PROPERTY] === childBody?.[EQUALS_PROPERTY]
        );

        if (existedIndex < 0) {
          parentChildren.push(childBody);
        } else {
          (parentChildren as Record<string, any>[])[existedIndex] = childBody;
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

  public static parse(body: string): Promise<Record<string, any>> {
    try {
      const parsedXML: Record<string, any> = createX2JS().xml_str2json(body);

      return Promise.resolve(parsedXML);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public static convertToString(body: AnyType, newLineAtEOF = true): string {
    let convertedXml = vkbeautify.xml(XML_HEADER + createX2JS().json2xml_str(body));

    // fix for xmlns offset on the first line
    convertedXml = convertedXml.replace(/\n\s+xmlns="[^"]+"/, (match) => {
      return match.replace(/\n\s+/, ' ');
    });

    return convertedXml + (newLineAtEOF ? '\n' : '');
  }

  public static isEmptyXml(body: AnyType): boolean {
    const rootNodeName = this.getRootNodeName(body);

    if (!rootNodeName) {
      return true;
    }

    const childrenNames = Object.keys(body[rootNodeName]);

    for (const childName of childrenNames) {
      if (childName === '_xmlns') continue;

      const child = body[rootNodeName][childName];

      if (!child) {
        continue;
      }

      if (Array.isArray(child) && !!child.length) {
        return false;
      }
    }

    return true;
  }

  public static getChildsByName(body: AnyType, nodeName: string): { nodeName: string; nodeData: AnyType }[] {
    const children = body[this.getRootNodeName(body)][nodeName];

    if (Array.isArray(children)) {
      return children.map((child) => ({ nodeName, nodeData: child }));
    }

    return [
      {
        nodeName,
        nodeData: children,
      },
    ];
  }

  public static hasChildNodes(body: AnyType, childNodeName: string): boolean {
    const children = body[this.getRootNodeName(body)][childNodeName];

    if (!children) {
      return false;
    }

    if (Array.isArray(children)) {
      return !!children.length;
    }

    return true;
  }

  public static addChildNode(body: AnyType, childNodeName: string, childNodeData: AnyType): AnyType {
    body[this.getRootNodeName(body)][childNodeName] = [childNodeData];

    return body;
  }

  public static createEmptyRootNodeFrom(body: AnyType): AnyType {
    const rootNodeName = this.getRootNodeName(body);

    return {
      [rootNodeName]: {
        _xmlns: body[rootNodeName]['_xmlns'],
      },
    };
  }
}
