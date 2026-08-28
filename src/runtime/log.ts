const PREFIX = "[openfront-extended-ui]";

export function logInfo(message: string, ...details: unknown[]): void {
  console.info(PREFIX, message, ...details);
}

export function logError(message: string, ...details: unknown[]): void {
  console.error(PREFIX, message, ...details);
}
