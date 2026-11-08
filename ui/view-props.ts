export interface AppViewProps<Data = Record<string, unknown>> {
  data?: Data;
  error?: string;
  isPreview: boolean;
  isConnecting: boolean;
  isRunning: boolean;
  call?(input?: Record<string, unknown>): Promise<void>;
  emit?(event: string, payload: Record<string, unknown>): Promise<void>;
}
