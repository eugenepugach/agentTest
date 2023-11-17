import { DATA_FOLDER_NAME, PRODUCTION_DATA_PATH } from '@/constants/path';
import path from 'path';

const { NODE_ENV } = process.env;

export const dataPath = NODE_ENV === 'production' ? PRODUCTION_DATA_PATH : path.join(process.cwd(), DATA_FOLDER_NAME);
