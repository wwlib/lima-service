import { Metadata } from "@types";

export function getMetadataWithAppName(metadataArray: Metadata[], appName: string): Metadata | undefined {
  let result: Metadata | undefined = undefined;
  if (metadataArray) {
    metadataArray.forEach((metadataData: Metadata) => {
      if (metadataData.appName == appName) {
        result = metadataData;
      }
    });
  }
  return result;
}

export function getAppNames(metadataArray: Metadata[]): string[] {
  const result: string[] = [];
  if (metadataArray) {
    metadataArray.forEach((metadataData: Metadata) => {
      if (metadataData.appName) {
        result.push(metadataData.appName);
      }
    });
    result.sort();
  }
  return result;
}
