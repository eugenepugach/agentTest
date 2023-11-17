import { Token } from 'typedi';

export class Tokens {
  public static readonly provider = new Token('git__provider');
  public static readonly config = new Token('git__config');
  public static readonly credentials = new Token('git__credentials');
  public static readonly connectionId = new Token('git__connection_id');
  public static readonly gitApiService = new Token('git__api_service');
  public static readonly gitRepoService = new Token('git__repo_service');
  public static readonly salesforce = new Token('sf__credentials');
  public static readonly logger = new Token('sf__logger');
}
