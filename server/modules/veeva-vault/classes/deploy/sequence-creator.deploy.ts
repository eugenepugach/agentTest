import { parse as csvParse } from 'csv-parse/sync';
import { VeevaDependencyRecordDto } from '@/modules/veeva-vault/dtos/veeva-dependency-record.dto';

export type SequenceCreatorDeployOptions = {
  dependencyFileByName: Map<string, string>;
};

const BLOCKED = 'block__sys';

export class SequenceCreatorDeploy {
  private readonly dependencyFileByName: SequenceCreatorDeployOptions['dependencyFileByName'];

  private readonly dependencyRecordsByName = new Map<string, VeevaDependencyRecordDto[]>();
  private readonly sequenceComponents: string[] = [];

  constructor({ dependencyFileByName }: SequenceCreatorDeployOptions) {
    this.dependencyFileByName = dependencyFileByName;
  }

  private fillDependencyRecordsByName(): void {
    for (const fullName of this.dependencyFileByName.keys()) {
      const fileBody = this.dependencyFileByName.get(fullName);

      if (!fileBody) {
        continue;
      }

      const records: Record<string, any>[] = csvParse(fileBody, {
        columns: true,
        skip_empty_lines: true,
      });

      this.dependencyRecordsByName.set(
        fullName,
        records.map((item) => new VeevaDependencyRecordDto(item))
      );
    }
  }

  private isHasBlockedDependencies(dependencies: VeevaDependencyRecordDto[]): boolean {
    for (const { targetComponentType, targetComponentName, blockingType } of dependencies) {
      const fullName = `${targetComponentType}.${targetComponentName}`;

      if (this.dependencyRecordsByName.has(fullName) && blockingType === BLOCKED) {
        return true;
      }
    }

    return false;
  }

  private findNonDependencyComponents(): string[] {
    const nonDependencyComponents: string[] = [];

    for (const fileName of this.dependencyRecordsByName.keys()) {
      const dependencies = this.dependencyRecordsByName.get(fileName) || [];

      if (!this.isHasBlockedDependencies(dependencies)) {
        nonDependencyComponents.push(fileName);
        this.dependencyRecordsByName.delete(fileName);
      }
    }

    return nonDependencyComponents;
  }

  public execute(): string[] {
    this.fillDependencyRecordsByName();

    let newComponentsForSequence = [];

    do {
      newComponentsForSequence = this.findNonDependencyComponents();
      this.sequenceComponents.push(...newComponentsForSequence);
    } while (newComponentsForSequence.length);

    if (this.dependencyRecordsByName.size) {
      this.sequenceComponents.push(...this.dependencyRecordsByName.keys());
    }

    return this.sequenceComponents;
  }
}
