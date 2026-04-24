import exifr from 'exifr';

export type Exif = {
  latitude?: number;
  longitude?: number;
  capturedAt?: Date;
  cameraMake?: string;
  cameraModel?: string;
};

export async function extractExif(buf: Buffer): Promise<Exif> {
  try {
    const data = await exifr.parse(buf, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'GPSLatitude', 'GPSLongitude']
    });
    if (!data) return {};
    return {
      latitude: typeof data.latitude === 'number' ? data.latitude : data.GPSLatitude,
      longitude: typeof data.longitude === 'number' ? data.longitude : data.GPSLongitude,
      capturedAt: data.DateTimeOriginal || data.CreateDate,
      cameraMake: data.Make,
      cameraModel: data.Model
    };
  } catch {
    return {};
  }
}
