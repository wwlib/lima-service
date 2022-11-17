import * as fs from "fs";

export type Config = {
  QnAMakerAppId: string;
  QnAMakerEndpointKey: string;
  QnAMakerEndpoint: string;
  LUIS_subscriptionKey: string;
  LUIS_endpoint: string;
  ETCO_server_dbEndpoint: string;
  ETCO_server_port: string;
  ETCO_server_tls: string;
  ETCO_server_tlsCert: string;
  ETCO_server_tlsKey: string;
  ETCO_server_tlsCA: string;
  MintAppId: string;
  MintEndpoint: string;
  MintBasicAuthToken: string;
  NET_parser: string;
  LUIS_threshold: string;
};

export function getConfig(): Config {
  return process.env as Config;
}

export function validateConfig() {
  const requiredKeys = [
    "QnAMakerAppId",
    "QnAMakerEndpointKey",
    "QnAMakerEndpoint",
    "LUIS_subscriptionKey",
    "LUIS_endpoint",
    "ETCO_server_dbEndpoint",
    "NET_parser",
  ];
  const config: Config = getConfig();

  for (const key of requiredKeys) {
    const value: string = config[key as keyof Config]
    if (typeof value == "undefined") {
      console.error(`Failed to start. Required env variable is missing: ${key}`);
      process.exit(1);
    }
  }
}

export function getTlsOptions() {
  const config = getConfig();

  if (config.ETCO_server_tls == "true") {
    return {
      cert: fs.readFileSync(config.ETCO_server_tlsCert),
      key: fs.readFileSync(config.ETCO_server_tlsKey),
      ca: fs.readFileSync(config.ETCO_server_tlsCA),
    };
  }

  return null;
}
