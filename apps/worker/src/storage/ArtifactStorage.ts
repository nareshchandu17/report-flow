export interface ArtifactStorage {
  store(jobId: string, fileName: string, buffer: Buffer): Promise<{ path: string; size: number }>;
}
