export type ProgressEvent = {
  label: string;
  status: string;
  time: string;
};

export type Message = {
  id: string;
  role: "user" | "ai";
  content?: string;
  sql?: string;
  insight?: string;
  status?: "PendingApproval" | "Completed" | "Failed" | "Blocked" | "Running" | "Accepted" | "Rejected";
  instanceId?: string;
  progressEvents?: ProgressEvent[];
  results?: Record<string, unknown>[];
  approvalSql?: string;
  riskLevel?: string;
  reasons?: string[];
  suggestedChart?: SuggestedChart;
};

export type ChartType =
  | "line"
  | "bar"
  | "horizontal_bar"
  | "stacked_bar"
  | "pie"
  | "donut"
  | "area"
  | "scatter"
  | "heatmap"
  | "combo"
  | "table"
  | "none";

export type SuggestedChart = {
  type: ChartType;
  title: string;
  description?: string;
  x_axis_label?: string;
  y_axis_label?: string;
  x_field?: string;
  y_field?: string;
  group_by?: string;
  filtered_rows_count?: number;
};

export type LogEntry = {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";
  message: string;
};

export type Connection = {
  id: string;
  name: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  type?: string;
  authType?: string;
};

export type ChatSession = {
  id: string;
  connectionId: string;
  title: string;
  messages: Message[];
};

export type DashboardTab = {
  type: "welcome" | "chat" | "ide" | "page";
  id: string;
  title: string;
  icon?: string;
  connectionId?: string;
  sql?: string;
};

export type ServerConnectionRecord = {
  id: string;
  connectionName: string;
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  encryptedPassword?: string;
  dbType?: string;
  authType?: string;
};

export type ServerSessionRecord = {
  id: string;
  connectionId?: string;
  title?: string;
};

export type ServerConversationTurnRecord = {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  question: string;
  sqlGenerated?: string | null;
  agentResponse?: string | null;
  summary?: string | null;
  intentType?: string | null;
  metric?: string | null;
  createdAt: string;
};

export type HistorySession = {
  id: string;
  title: string;
  lastActivity?: string;
};

export type ViewState = "welcome" | "integrations" | "connect_postgres" | "manage_connections" | string;

export type Organization = {
  id: string;
  name: string;
  industry?: string;
};