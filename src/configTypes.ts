
export interface AweSomeHTTPSensorConfigInterface {
    name : string,
    statusUrl: string,
    httpMethod: string,
    contentType: string
}

export interface AweSomeHTTPConfigInterface {
    name: string,
    baseurl: string,
    displayName: string,
    cacheExpiration: number,
    sensors: AweSomeHTTPSensorConfig[],
    model : string,
    manufacturer : string
  }

export type AweSomeHTTPConfig = Readonly<AweSomeHTTPConfigInterface>;
export type AweSomeHTTPSensorConfig = Readonly<AweSomeHTTPSensorConfigInterface>;