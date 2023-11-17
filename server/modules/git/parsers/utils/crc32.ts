import CRC32 from 'crc-32';
import { ParsedComponent } from '@/modules/git/parsers/types/parsed-component.type';

const componentTypeProcessFunctionMap: Record<string, (component: ParsedComponent) => string> = {
  AuraDefinitionBundle: bundleTypesProcessor,
  LightningComponentBundle: bundleTypesProcessor,
  ExperienceBundle: bundleTypesProcessor,
  WaveTemplateBundle: bundleTypesProcessor,
};

const BINARY_COMPONENTS = ['StaticResource', 'ContentAsset'];

function bundleTypesProcessor(component: ParsedComponent): string {
  const crc32List: number[] = [];
  const setToRemove = new Set();
  Object.keys(component.files)
    .sort()
    .forEach((fileName) => {
      const auraName = getAuraName(fileName);
      if (auraName && auraName === component.filePath) {
        const fileData = component.files[fileName];
        const crc = getCrcWithData(fileData);
        if (crc) {
          crc32List.push(crc);
        }
      } else {
        setToRemove.add(fileName);
      }
    });

  let crcCode = 0;

  if (crc32List.length) {
    crcCode = crc32List[0];
  }

  if (crc32List.length < 26) {
    for (let i = 1; i < crc32List.length; i++) {
      crcCode = Math.round((crc32List[i] + crcCode) / 2);
    }
  } else {
    for (let i = 1; i < crc32List.length; i++) {
      crcCode = Math.round(crc32List[i] + crcCode);
    }
    crcCode = Math.round(crcCode / crc32List.length);
  }

  return `${crcCode}`;
}

function otherComponentsProcessor(component: ParsedComponent): string {
  const crc32List: number[] = [];
  const asBuffer = BINARY_COMPONENTS.includes(component.type);
  Object.keys(component.files)
    .sort()
    .forEach((fileName) => {
      const fileData = component.files[fileName];
      const crc = getCrcWithData(fileData, asBuffer);
      if (crc) {
        crc32List.push(crc);
      }
    });

  return crc32List.join(' ');
}

function getPosition(string: string, subString: string, index: number) {
  //function for getting INDEX of Substring in String.
  return string.split(subString, index).join(subString).length;
}

function getAuraName(name: string): string | null {
  if (!name) return null;
  if (
    !name.startsWith('aura/') &&
    !name.startsWith('lwc/') &&
    !name.startsWith('experiences/') &&
    !name.startsWith('waveTemplates/')
  )
    return null;

  if (name.lastIndexOf('/') > 5 && name.lastIndexOf('/') !== name.length - 1) {
    let fullName = name.slice(0, getPosition(name, '/', 2));
    if (name.startsWith('experiences/') || name.startsWith('waveTemplates/')) {
      if (fullName.lastIndexOf('/') !== -1) {
        fullName = fullName.slice(0, fullName.lastIndexOf('/'));
      }
      return fullName;
    }
    return fullName;
  }

  return null;
}

function getCrcWithData(zipData: Buffer, asBuffer = false): number {
  if (asBuffer) {
    return CRC32.buf(zipData, 32);
  }

  return CRC32.str(zipData.toString(), 32);
}

export function calculateCRC32(component: ParsedComponent): string {
  if (componentTypeProcessFunctionMap[component.type]) {
    return componentTypeProcessFunctionMap[component.type](component);
  } else {
    return otherComponentsProcessor(component);
  }
}
