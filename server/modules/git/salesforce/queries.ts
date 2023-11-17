export const GET_REPOSITORY_QUERY = `
  SELECT 
    Id, 
    Name,
    %namespace%Synchronization_Status__c,
    %namespace%Synchronization_Direction__c
  FROM 
    %flosum_namespace%Repository__c 
  WHERE 
    Id = '%id%'`;

export const GET_REPOSITORY_BY_NAME_QUERY = `
  SELECT 
    Id, 
    Name,
    %namespace%Synchronization_Status__c,
    %namespace%Synchronization_Direction__c
  FROM 
    %flosum_namespace%Repository__c 
  WHERE 
    Name = '%name%'`;

export const GET_BRANCH_BY_NAME_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Branch_Name__c, 
    %flosum_namespace%Repository__r.Name,
    %namespace%Synchronization_Status__c,
    %namespace%Synchronization_Direction__c
  FROM
    %flosum_namespace%Branch__c 
  WHERE
    %flosum_namespace%Branch_Name__c = '%name%'`;

export const GET_BRANCH_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Branch_Name__c, 
    %flosum_namespace%Repository__r.Name,
    %namespace%Synchronization_Status__c,
    %namespace%Synchronization_Direction__c
  FROM
    %flosum_namespace%Branch__c 
  WHERE
    Id = '%id%'`;

export const GET_REPOSITORIES_NAMES_QUERY = `
   SELECT 
     Id, 
     %namespace%Repository__c,
     %namespace%Repository__r.Name
   FROM 
     %namespace%Repository_Connection__c 
   WHERE 
     %namespace%Connection__c = '%connection_id%'`;

export const GET_WAITING_REPOSITORIES_QUERY = `
   SELECT 
     Id, 
     %namespace%Repository__c,
     %namespace%Repository__r.Name, 
     %namespace%Repository__r.%namespace%Synchronization_Status__c, 
     %namespace%Repository__r.%namespace%Synchronization_Direction__c 
   FROM 
     %namespace%Repository_Connection__c 
   WHERE 
     %namespace%Connection__c = '%connection_id%'
   AND
     %namespace%Repository__r.%namespace%Synchronization_Status__c IN ('Waiting')`;

export const GET_WAITING_BRANCHES_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Branch_Name__c, 
    %flosum_namespace%Repository__r.Name,
    %namespace%Synchronization_Status__c,
    %namespace%Synchronization_Direction__c
  FROM 
    %flosum_namespace%Branch__c 
  WHERE
    %flosum_namespace%Repository__c IN (%repositories_ids%)
  AND
    %namespace%Synchronization_Status__c IN ('Waiting')`;

export const GET_COMPONENTS_QUERY = `
  SELECT 
    Id, 
    Name, 
    %flosum_namespace%Repository__c, 
    (SELECT 
      Id, 
      Name, 
      %flosum_namespace%isLastVersion__c 
    FROM 
      %flosum_namespace%Components__r
    WHERE 
      %flosum_namespace%isLastVersion__c = true
    )
  FROM 
    %flosum_namespace%Component__c`;

export const GET_ATTACHMENT_BY_PARENT_ID_AND_NAME_QUERY = `
  SELECT 
    Id, 
    Body, 
    ParentId 
  FROM 
    Attachment 
  WHERE 
    ParentId = '%parentId%' AND 
    Name = '%name%'`;

export const GET_ATTACHMENT_BY_PARENT_IDS_QUERY = `
  SELECT 
    Id, 
    Name, 
    ParentId 
  FROM 
    Attachment 
  WHERE 
    ParentId IN (%parent_ids%)`;

export const GET_COMPONENT_HISTORIES_BY_IDS = `
  SELECT 
    Id, 
    %flosum_namespace%Component__r.%flosum_namespace%Component_Name__c 
  FROM 
    %flosum_namespace%Component_History__c 
  WHERE 
    Id IN (%ids%)`;

export const GET_BRANCH_COMPONENTS_BY_FILENAMES_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Component_Name__c, 
    %flosum_namespace%CRC32__c, 
    %flosum_namespace%Component_Type__c, 
    %flosum_namespace%File_Name__c, 
    %flosum_namespace%Version__c 
  FROM 
    %flosum_namespace%Component__c 
  WHERE 
    %flosum_namespace%File_Name__c IN (%fileNames%) AND 
    %flosum_namespace%Branch__c = '%branchId%'`;

export const GET_REPOSITORY_COMPONENTS_BY_FILENAMES_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Component_Name__c, 
    %flosum_namespace%CRC32__c, 
    %flosum_namespace%Component_Type__c, 
    %flosum_namespace%File_Name__c, 
    %flosum_namespace%Version__c 
  FROM 
    %flosum_namespace%Component__c 
  WHERE 
    %flosum_namespace%File_Name__c IN (%fileNames%) AND 
    %flosum_namespace%Repository__c = '%repositoryId%'`;

export const GET_COMPONENT_RECORD_TYPES_QUERY = `
  SELECT 
    Id, 
    Name 
  FROM 
    RecordType 
  WHERE 
    sObjectType = '%flosum_namespace%Component__c' AND 
    (Name = 'Repository' OR Name = 'Branch') 
  LIMIT 2`;

export const GET_COMMIT_MANIFESTS_BY_COMPONENT_IDS = `
  SELECT 
    Id 
  FROM 
    %flosum_namespace%Commit_Manifest__c 
  WHERE 
    %flosum_namespace%Component_History__c IN (
      SELECT 
        Id 
      FROM 
        FLosum__Component_History__c 
      WHERE 
        %flosum_namespace%Component__c IN (%componentIds%)
    )
`;

export const GET_BRANCH_COMPONENTS_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Component_Name__c, 
    %flosum_namespace%CRC32__c, 
    %flosum_namespace%Component_Type__c, 
    %flosum_namespace%File_Name__c, 
    %flosum_namespace%Version__c 
  FROM 
    %flosum_namespace%Component__c 
  WHERE  
    %flosum_namespace%Branch__c = '%branchId%'`;

export const GET_REPOSITORY_COMPONENTS_QUERY = `
  SELECT 
    Id, 
    %flosum_namespace%Component_Name__c, 
    %flosum_namespace%CRC32__c, 
    %flosum_namespace%Component_Type__c, 
    %flosum_namespace%File_Name__c, 
    %flosum_namespace%Version__c 
  FROM 
    %flosum_namespace%Component__c 
  WHERE  
    %flosum_namespace%Repository__c = '%repositoryId%'`;
