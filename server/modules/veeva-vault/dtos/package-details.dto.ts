import { PackageComponentDto } from '@/modules/veeva-vault/dtos/package-component.dto';

export class PackageDetailsDto {
  public isSuccess = false;
  public isVerified = false;
  public isDeployed = false;
  public detailUrl: string;
  public log: string;
  public packageId: string;
  public packageComponentList: PackageComponentDto[];
}
