# CHANGELOG

### v4.0.0
- added support for multi-git services
- fixed issue with sfdx duplicates
- fixed issue with calculating crc32
- fixed issue with committing to repository from git to flosum
- added support for proxy to salesforce requests
- update SFDX-CLI to 7.166.1

### v3.47.1

- fixed issue: add Last_Updated_On__c field for Flosum__Branch

### v3.47.0

- fixed issue: "same apex class created twice"
- fixed issue: "add back support for config and sfdx-project.json"

### v3.46.0

- add certificates support for proxy

### v3.45.1

- fix: add support for gitlab subgroups

### v3.45.0

- update SFDX-cli to 7.136.2 (latest release)

### v3.44.0

- update commits from flosum to git (create queue on nodejs side instead of SalesForce)

### v3.43.0

- add custom error to handle "socket is closed" error from remote server

### v3.42.0

- migrate to NodeJS v16

### v3.41.4

- fixed issue RangeError: maxBuffer length exceeded

### v3.41.3

- fixed names parser for CustomLabel's children

### v3.41.2

- fixed issue with creating CustomLabels

### v3.41.1

- added configurable count of components that parsed per tick (MAX_COMPONENTS_PER_TICK)

### v3.41.0

- fixed issue with committing from GIT to FLOSUM when all files were loaded into RAM that cause application crash

### v3.40.0

- added support for proxy

### v3.39.6

- fixed issue with receiving logger id when commit from git to flosum

### v3.39.5

- fixed issue with writing components to mdapi when commit from git to flosum

### v3.39.3

- fixed issue with creating webhook after creating repository

### v3.39.2

- fixed issue with writing Bundled component when commiting from git to flosum
- fixed issue with converting metadata to SFDX project (linked with previous issue)
- fixed issue with removing child components in SFDX project when commiting from git to flosum
- fixed issue when branch is not exists in git and direction was from git to flosum - set branch status to 'Not Synchronized'
- fixed issue with commits from flosum to git due changed internal structure of the project
- fixed issue with converting repository to SFDX when it contains metadata and when repository in SFDX to metadata
- fixed issue when logs were created on commit to git while processing commit to flosum
- fixed issue with commits from Azure Dev On Premise to flosum

### v0.0.38 Release Candidate

- fixed issue with commiting from git to flosum when commits were not properly proceeded
- fixed issue with get last commit hash
- added binding for remote state after proceeding git commit to avoid synchronization on synchronized repository
- added support for git to flosum commits
- added support for git to flosum synchronization
- fixed issues with removing components from flosum to git
- fixed issue with retrieving all azure repositories
- added auto binding webhooks to all repositories on sync
- added auto binding webhooks to newly created repositories

### v0.0.37

- fixed issue with retrieving components from flosum when some components have not History or Attachment
- fixed issue with github get branch when it works not natively via git bash
- added retry on salesforce request errors (3)

### v0.0.36

- fixed issue with git bash errors when result was success

### v0.0.35

- fixed issue with rate limiting that crashed sync instead of pause for 1h

### v0.0.34

- updated logger class and add description for some sync errors

### v0.0.33

- fixed issue with error logic onn sync

### v0.0.32

- fixed issue with repository creation on sync process

### v0.0.31

- fixed issue with commit to repository if some component has invalid structure

### v0.0.30

- fixed issue with setting error if branch or repository is not capatible with naming requirements

### v0.0.29

- fixed issue with counting api requests for rate limiting

### v0.0.28

- added content type text/plain to attachments that created by agent to view it on salesforce side without downloading
- added ability to create a remote state attachment if it not exists on salesforce side
- added branches and repositories names prevalidation before creation and if do not match than change branch/repository state to Error
- added cooldown for requests for each git service based on it's own requests per hour limits
- added sleep timer after reaching out requests limit on git service

### v0.0.27

- added sync timeout for bitbucket for 1 hour to reduce api calls (timer starts after each 200 branches or repos)

### v0.0.26

- fixed issue related to parsing directories from component history archive

### v0.0.25

- added new line in xml files after converting them to string

### v0.0.24

- added branch/repository naming validation and repository name intersection to reject invalid repositories

### v0.0.23

- fixed xml convert to string method to remove standalone from xml header

### v0.0.22

- added reset repository/branch remote state on error that related to sync process

### v0.0.21

- fixed issue with removing some types of components from repository

### v0.0.20

- added limit to components retrieving through query service to const value

### v0.0.19

- fixed issue with retrieving big components that do not fit in salesforce rest limit

### v0.0.18

- fixed issue with removing child components: if all child components were removed than empty parent component stayed in repository
- fixed issue with logging errors to salesforce: not all errors were sended to salesforce
- fixed issue with git clone operation: when repository folder is proceeding by git process we cannot remove it
- fixed issue with stop sync after catching salesforce error

### v0.0.17

- fixed issue with invalid credentials for git clone
- added feature to stop sync if error is retlated to salesforce
- changed logic to retrieve synchronization attachments from salesforce
- added logic to load big components if they not fit at salesforce rest limit

### v0.0.16

- fixed Bitbucket Server default branch endpoint, due versions <7.5 are not support it
- changed sync job behaivour on catch error from stop synchronizaton to skip errored branch
- added error message on failed parsing some xml files that have invalid structure or invalid syntax
- added tunnel to passthrought errors from salesforce to agent logs

### v0.0.15

- changed the logging logic to reduce the consumption of the Salesforce API Request
- fixed error on commiting components when there are no components to commit and Shell throwns an error
- changes some typings and endpoint fields

### v0.0.14

- added logic to delete components
- added Get Profile logic

### v0.0.13

- updated logger implementation
- fixed issue with git config from Sai
- fixed issue with lost logs while running commit job
- improved commit performance on big commits
- improved commit performance on heroku

### v0.0.12

- fixed issue that cause synchronization crash due SFDX cli
- fixed issue with mdapi parser: duplicate writes of the components
- fixed issue with synchronization state between services
- added info controller to preview using version of the agent
- fixed git warnings throws an error

### v0.0.11

- changed commit logic due new sync functionality
- changed sync logic to reduce unnesessary sync requests

### v0.0.10

- migrated from jsforce to plain requests
- added support for gitlab groups
- updated outdated docs
- added support for multiprocessing commits
- fixed issue with branches creation (now branches are independent from master)
- added repos and branches sync from flosum to git

### v0.0.9

- added support for azure devops server
- fixed bitbucket clone url binding
- separate environment variables to configure github, gitlab individually

### v0.0.8

- added support for bitbucker on premise
- added support github enterprise
- fixed bug when repository contains mdapi but commit was made in sfdx because of what there were 2 versions of the project
- changed sfdx converter logic to ensure that all metadata was converted properly
- changed logic of git repository initialization - later repository was initialized with empty README.md, but now repository are empty
- when flag convertToSFDX is set then all data related to sfdx project (config, sfdx-project.json) were included in commit

### v0.0.7

- added new mdapi parser
- added handler for "convert to sfdx"
- enabled mdapi store format by default

### v0.0.6

- added azure integration
- update docs for azure integration

### v0.0.5

- added gitlab api service
- added gitlab repos service
- added gitlab branches service
- added gitlab hooks service
- udapted docs to gitlab services
- added tests for gitlab services
- added custom api urls for git services

### v0.0.4

- added new on-fly parser to combine all childs of the parent onto one container
- added new flosum retriever that produces mush more speed on recieving components from salesforce

### v0.0.3

- added request namespace to salesforce service
- added removing repository folder after job is done
- added request that send commit id to the salesforce after job is done

### v0.0.2

- created new mdapi parser to replace old meta mapper
- created bitbucket api service
- created bitbucket repos service
- created bitbucket branches service
- created bitbucket hooks service
- udapted docs to bitbucket services

### v0.0.1

- reworked on salesforce settings to ensure that authorization settings is valid
- added endpoint to set salesforce authorization settings
- fixed issue with repository clonning on heroku instance

### v0.0.0-initial

- removed support for Username:Password authentication due GitHUB deprecation
- rewrited whole services logic to make it more decomposed (different classes for api/repo/branches/hooks)
- added shell script to iteract with bash through application for generate/save ssh keys
- added env setters for auth options (for dev only
- rewrited auth service and route
- added git shell to iteract with git to clone/commit/push actions
- added flosum-commit web hook to recieve commits from flosum and push them into git provider