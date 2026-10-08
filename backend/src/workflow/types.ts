import type { PublicUser } from '../auth/user-repository.js';
export type WorkflowStatus = 'open' | 'in_progress' | 'resolved';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export interface ExceptionDto {
  id: string;
  orderId: string;
  marketplaceOrderId: string;
  ruleCode: string;
  priority: Priority;
  status: WorkflowStatus;
  reason: string;
  assigneeId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  processingDeadline: string | null;
}
export interface ActionDto {
  id: string;
  exceptionId: string;
  orderId: string;
  actorId: string;
  action: string;
  note: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: string;
}
export interface NotificationDto {
  id: string;
  recipientId: string;
  exceptionId: string;
  kind: string;
  priority: Priority;
  readAt: string | null;
  createdAt: string;
}
export interface EventDto {
  id: string;
  orderId: string;
  source: string;
  sourceEventId: string;
  eventType: string;
  occurredAt: string;
  payload: unknown;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface QueueFilters {
  priority?: string;
  status?: string;
  ruleCode?: string;
  assigneeId?: string;
  deadlineBefore?: string;
  page?: number;
  pageSize?: number;
}
export interface NotificationFilters {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}
export interface WorkflowStore {
  list(user: PublicUser, filters: QueueFilters): Promise<Page<ExceptionDto>>;
  detail(user: PublicUser, id: string): Promise<ExceptionDto>;
  claim(
    user: PublicUser,
    id: string,
    expectedVersion: number,
  ): Promise<ExceptionDto>;
  assign(
    user: PublicUser,
    id: string,
    assigneeId: string,
    expectedVersion: number,
  ): Promise<ExceptionDto>;
  transition(
    user: PublicUser,
    id: string,
    status: WorkflowStatus,
    note: string | null | undefined,
    expectedVersion: number,
  ): Promise<ExceptionDto>;
  actions(user: PublicUser, id: string): Promise<ActionDto[]>;
  notifications(
    user: PublicUser,
    filters: NotificationFilters,
  ): Promise<Page<NotificationDto>>;
  readNotification(user: PublicUser, id: string): Promise<NotificationDto>;
  canAccessOrder(user: PublicUser, orderId: string): Promise<boolean>;
  orderTimeline(
    user: PublicUser,
    orderId: string,
  ): Promise<{
    events: EventDto[];
    exceptions: ExceptionDto[];
    actions: ActionDto[];
  }>;
  operators(user: PublicUser): Promise<PublicUser[]>;
}
