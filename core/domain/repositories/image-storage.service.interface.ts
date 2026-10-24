export interface UploadedImageResult {
  imageUrl: string;
  imagePublicId: string;
}

export interface IImageStorageService {
  uploadImage(file: File, folder: string, label?: string): Promise<UploadedImageResult>;
  deleteImage(publicId: string): Promise<void>;
  deleteImages(publicIds: string[]): Promise<void>;
}
