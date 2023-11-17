import { Xml } from '@/modules/git/parsers/utils/xml';
import { ComponentDetails } from '@/modules/functions/types/salesforce-request.type';

const PERMISSIONS_MAP = new Map<string, string>([
  ['classAccesses', 'apexClass'],
  ['pageAccesses', 'apexPage'],
  ['tabSettings', 'tab'],
  ['tabVisibilities', 'tab'],
  ['profileActionOverrides', 'content'],
  ['categoryGroupVisibilities', 'dataCategoryGroup'],
  ['objectPermissions', 'object'],
  ['customMetadataTypeAccesses', 'name'],
  ['customSettingAccesses', 'name'],
  ['applicationVisibilities', 'application'],
  ['externalDataSourceAccesses', 'externalDataSource'],
  ['customPermissions', 'name'],
  ['flowAccesses', 'flow'],
  ['layoutAssignments', 'layout'],
  ['recordTypeVisibilities', 'recordType'],
  ['fieldPermissions', 'field'],
]);

enum UNREMOVE_PERMISSION {
  hasActivationRequired = 'hasActivationRequired',
  label = 'label',
  custom = 'custom',
  description = 'description',
}

const prepareDeleteComponent: Record<string, <T extends Record<string, any>>(component: T) => T> = {
  Profile: <T extends Record<string, any>>(component: T) => {
    delete component.Profile?.userPermissions;
    delete component.Profile?.loginIpRanges;
    return component;
  },
  PermissionSet: <T extends Record<string, any>>(component: T) => {
    delete component.PermissionSet?.userPermissions;
    delete component.PermissionSet?.loginIpRanges;
    return component;
  },
};

export async function extractComponentPermissions(
  componentXml: string,
  componentsDetails: ComponentDetails[],
  componentType: string
): Promise<Record<string, any>> {
  const component = await getReadyComponent(componentXml, componentType);
  const componentElement = component[componentType];

  if (!componentElement) {
    return component;
  }

  for (const permissionName in componentElement) {
    if (UNREMOVE_PERMISSION[permissionName as UNREMOVE_PERMISSION]) {
      continue;
    }

    const permissionsField = componentElement[permissionName];
    const validPermission = getValidPermission(permissionsField, permissionName, componentsDetails);

    if (validPermission.length) {
      componentElement[permissionName] = validPermission;
    } else {
      delete componentElement[permissionName];
    }
  }

  component[componentType]['$'] = { xmlns: 'http://soap.sforce.com/2006/04/metadata' };

  return component;
}

function getValidPermission(
  permissionsField: any,
  permissionName: string,
  componentsDetails: ComponentDetails[]
): Record<string, any>[] {
  let validPermission = [];
  if (permissionName === 'layoutAssignments') {
    validPermission = getValidLayout(permissionsField, permissionName, componentsDetails);
  } else {
    const permissions = Array.isArray(permissionsField) ? permissionsField : [permissionsField];

    for (const permission of permissions) {
      if (isValidPermission(permission, permissionName, componentsDetails)) {
        validPermission.push(permission);
      }
    }
  }
  return validPermission;
}

function isValidPermission(
  permissionsField: Record<string, any>,
  permissionName: string,
  componentsDetails: ComponentDetails[]
): boolean {
  const propertyName = PERMISSIONS_MAP.get(permissionName) as string;
  return (
    permissionsField[propertyName] &&
    componentsDetails.some((item) => item.Component__r.Component_Name__c.includes(permissionsField[propertyName]))
  );
}

function getValidLayout(
  permissionsField: any,
  permissionName: string,
  componentsDetails: ComponentDetails[]
): Record<string, any>[] {
  const validPermission = [];
  const permissions = Array.isArray(permissionsField) ? permissionsField : [permissionsField];

  for (const permission in permissions) {
    if (isValidPermission(permissions[permission], permissionName, componentsDetails)) {
      if (!permissions[permission].recordType) {
        validPermission.push(permissions[permission]);
      }
      if (isValidPermission(permissions[permission], 'recordTypeVisibilities', componentsDetails)) {
        validPermission.push(permissions[permission]);
      }
    }
  }

  return validPermission;
}

async function getReadyComponent(componentXml: string, componentType: string): Promise<Record<string, any>> {
  const component = await Xml.parse(componentXml);
  return prepareDeleteComponent[componentType](component);
}
