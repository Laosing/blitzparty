type LogLevel = "debug" | "info" | "warn" | "error"

export class Logger {
  private namespace: string

  constructor(namespace: string) {
    this.namespace = namespace
  }

  private formatMessage(level: LogLevel, message: string) {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}] [${this.namespace}] ${message}`
  }

  debug(message: string, ...args: any[]) {
    console.debug(this.formatMessage("debug", message), ...args)
  }

  info(message: string, ...args: any[]) {
    console.log(this.formatMessage("info", message), ...args)
  }

  warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage("warn", message), ...args)
  }

  error(message: string, ...args: any[]) {
    console.error(this.formatMessage("error", message), ...args)
  }
}

export const createLogger = (namespace: string) => new Logger(namespace)
