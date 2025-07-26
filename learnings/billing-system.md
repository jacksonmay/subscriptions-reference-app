# Billing System Architecture - Shopify Subscription App

## Overview

This Shopify subscription app implements a sophisticated multi-layered billing system that handles automated subscription billing at scale. The system is designed to process subscription charges across multiple shops with different timezones, handle billing failures gracefully, and provide robust retry mechanisms.

## System Architecture

### Core Components

1. **Job-Based Architecture**: All billing operations are handled through a job queue system
2. **Timezone-Aware Scheduling**: Each shop has its own billing schedule with timezone and preferred billing hour
3. **Bulk Processing**: Optimized to handle multiple billing cycles efficiently
4. **Error Handling & Dunning**: Comprehensive failure handling with retry mechanisms
5. **GraphQL Integration**: Uses Shopify's Admin API for billing operations

## Billing Job Hierarchy

The billing system operates through a hierarchical job structure:

### 1. RecurringBillingChargeJob (Top Level)
**File**: `app/jobs/billing/RecurringBillingChargeJob.ts`

- **Purpose**: Entry point for the entire billing process
- **Trigger**: Runs on a scheduled basis (typically hourly)
- **Function**: 
  - Gets current UTC time
  - Schedules the next level job with current timestamp
  - Acts as the master trigger for billing operations

```typescript
const targetDate = DateTime.utc().startOf('hour').toISO() as string;
const job = new ScheduleShopsToChargeBillingCyclesJob({targetDate});
await jobs.enqueue(job);
```

### 2. ScheduleShopsToChargeBillingCyclesJob (Scheduling Layer)
**File**: `app/jobs/billing/ScheduleShopsToChargeBillingCyclesJob.ts`

- **Purpose**: Determines which shops need billing at the current time
- **Process**:
  1. Retrieves all active billing schedules from database
  2. Processes them in batches (1000 records at a time)
  3. Uses `BillingScheduleCalculatorService` to determine if each shop is ready for billing
  4. Enqueues `ChargeBillingCyclesJob` for eligible shops

**Key Logic**:
```typescript
const results = batch
  .map(billingSchedule => new BillingScheduleCalculatorService(billingSchedule, targetDateUtc))
  .filter(calc => calc.isBillable());
```

### 3. ChargeBillingCyclesJob (Shop-Level Billing)
**File**: `app/jobs/billing/ChargeBillingCyclesJob.ts`

- **Purpose**: Handles bulk billing for a specific shop
- **Queue**: `billing`
- **Process**:
  1. Calls Shopify's `subscriptionBillingCycleBulkCharge` mutation
  2. Targets billing cycles that are:
     - In `ACTIVE` contract status
     - Have `UNBILLED` billing cycle status  
     - Have `NO_ATTEMPT` billing attempt status
  3. Creates a Shopify background job for processing

**GraphQL Mutation Used**:
```graphql
subscriptionBillingCycleBulkCharge(
  billingAttemptExpectedDateRange: {
    startDate: $startDate
    endDate: $endDate
  }
  filters: {
    contractStatus: $contractStatus,
    billingCycleStatus: $billingCycleStatus,
    billingAttemptStatus: $billingAttemptStatus
  }
)
```

### 4. RebillSubscriptionJob (Individual Retry)
**File**: `app/jobs/billing/RebillSubscriptionJob.ts`

- **Purpose**: Handles individual subscription rebilling (typically for failed attempts)
- **Queue**: `rebilling`
- **Process**:
  1. Checks if subscription was already billed successfully
  2. Calls `subscriptionBillingCycleCharge` mutation for specific contract
  3. Handles various error scenarios gracefully

## Billing Schedule Management

### BillingSchedule Model
**File**: `prisma/schema.prisma`

```sql
model BillingSchedule {
  id        Int      @id @default(autoincrement())
  shop      String   @unique
  hour      Int      @default(10)        // Preferred billing hour (0-23)
  timezone  String   @default("America/Toronto")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### BillingScheduleCalculatorService
**File**: `app/services/BillingScheduleCalculatorService.ts`

This service determines when a shop should be billed:

**Key Features**:
- **Timezone Conversion**: Converts UTC time to shop's local timezone
- **Billing Window**: Looks back 2 days to catch missed billing cycles
- **Precision**: Uses hour-level precision for billing timing

**Core Logic**:
```typescript
isBillable(): boolean {
  return this.timeUtc.equals(this.compareToDate);
}
```

**Billing Window Calculation**:
- **Start**: Current billing time minus 2 days
- **End**: End of current billing day in shop's timezone
- **Purpose**: Accounts for timezone changes, DST, shop reinstalls

## Error Handling & Dunning Process

### Dunning System Overview
When billing fails, the app implements a sophisticated dunning (debt collection) process:

**File**: `app/services/DunningService.ts`

### DunningTracker Model
**File**: `prisma/schema.prisma`

```sql
model DunningTracker {
  id                Int       @id @default(autoincrement())
  shop              String
  contractId        String
  billingCycleIndex Int
  failureReason     String
  completedAt       DateTime?
  completedReason   String?

  @@unique([shop, contractId, billingCycleIndex, failureReason])
}
```

### Dunning Process Flow

1. **Initial Failure Detection**: System detects billing failure
2. **Retry Attempts**: Multiple retry attempts with configurable intervals
3. **Escalation Levels**:
   - **Retry**: Normal retry attempts
   - **Penultimate**: Second-to-last attempt with warnings
   - **Final**: Last attempt before termination

### Error Categories Handled

**Persistent Errors** (No Retry):
- `CONTRACT_PAUSED`
- `BILLING_CYCLE_SKIPPED` 
- `CONTRACT_TERMINATED`
- `BILLING_CYCLE_CHARGE_BEFORE_EXPECTED_DATE`

**Retryable Errors**: All other billing failures

## Key GraphQL Mutations

### 1. Bulk Billing
**File**: `app/graphql/ChargeBillingCyclesMutation.ts`

```graphql
mutation ChargeBillingCycles(
  $startDate: DateTime!
  $endDate: DateTime!
  $contractStatus: [SubscriptionContractSubscriptionStatus!]
  $billingCycleStatus: [SubscriptionBillingCycleBillingCycleStatus!]
  $billingAttemptStatus: SubscriptionBillingCycleBillingAttemptStatus
) {
  subscriptionBillingCycleBulkCharge(...)
}
```

### 2. Individual Billing
**File**: `app/graphql/SubscriptionBillingCycleChargeMutation.ts`

```graphql
mutation SubscriptionBillingCycleChargeMutation(
  $subscriptionContractId: ID!
  $originTime: DateTime!
) {
  subscriptionBillingCycleCharge(
    subscriptionContractId: $subscriptionContractId
    billingCycleSelector: { date: $originTime }
  )
}
```

## Job Scheduling & Execution

### Job Runner System
**File**: `app/lib/jobs/JobRunner.ts`

The system supports multiple scheduler backends:
- **INLINE**: Synchronous execution (development)
- **TEST**: Mock scheduler (testing)
- **CLOUD_TASKS**: Google Cloud Tasks (production)

### Job Registration
**File**: `app/jobs/index.ts`

All billing jobs are registered with the job runner:
```typescript
.register(
  ChargeBillingCyclesJob,
  RecurringBillingChargeJob,
  ScheduleShopsToChargeBillingCyclesJob,
  RebillSubscriptionJob,
  // ... other jobs
)
```

## Data Flow Summary

1. **Trigger**: `RecurringBillingChargeJob` runs hourly
2. **Shop Selection**: `ScheduleShopsToChargeBillingCyclesJob` identifies shops ready for billing
3. **Bulk Processing**: `ChargeBillingCyclesJob` processes multiple billing cycles per shop
4. **Individual Retries**: `RebillSubscriptionJob` handles failed individual subscriptions
5. **Error Handling**: Dunning system manages persistent failures
6. **Tracking**: All operations logged and tracked in database

## Key Design Principles

1. **Scalability**: Batch processing and queue-based architecture
2. **Reliability**: Comprehensive error handling and retry mechanisms
3. **Timezone Awareness**: Respects each shop's local billing preferences
4. **Fault Tolerance**: Graceful degradation and recovery mechanisms
5. **Observability**: Extensive logging and tracking throughout the system

## Configuration

The billing system behavior is controlled through:
- Shop-specific billing schedules (timezone, hour)
- Global configuration (retry attempts, intervals)
- Job scheduler selection (inline, cloud tasks, etc.)

This architecture ensures reliable, scalable subscription billing across multiple shops with different requirements and timezones. 