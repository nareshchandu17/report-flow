import { ArtifactStorage } from './ArtifactStorage';
import fs from 'fs/promises';
import path from 'path';

export class LocalArtifactStorage implements ArtifactStorage {
  private baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'storage', 'reports')) {
    this.baseDir = baseDir;
  }

  async store(jobId: string, fileName: string, buffer: Buffer): Promise<{ path: string; size: number }> {
    await fs.mkdir(this.baseDir, { recursive: true });
    
    const filePath = path.join(this.baseDir, `${jobId}_${fileName}`);
    await fs.writeFile(filePath, buffer);
    
    const stats = await fs.stat(filePath);
    
    return {
      path: filePath,
      size: stats.size
    };
  }
}
