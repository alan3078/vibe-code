import { MigrationInterface, QueryRunner } from 'typeorm';

/** Baseline schema for fresh PostgreSQL deployments; development keeps synchronize for POC iteration. */
export class InitialPlatformSchema1726963200000 implements MigrationInterface {
  name = 'InitialPlatformSchema1726963200000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await q.query("CREATE TYPE users_role_enum AS ENUM ('Member', 'Administrator')");
    await q.query("CREATE TYPE projects_status_enum AS ENUM ('Creating','Starting','Running','Stopping','Stopped','Deleting','Deleted','Failed')");
    await q.query("CREATE TYPE configuration_items_valuetype_enum AS ENUM ('number','boolean','string')");
    await q.query("CREATE TYPE audit_logs_actorrole_enum AS ENUM ('Member','Administrator')");
    await q.query("CREATE TYPE audit_logs_outcome_enum AS ENUM ('Success','Failure')");
    await q.query('CREATE TABLE users (id uuid PRIMARY KEY, name varchar(120) NOT NULL, email varchar(200) NOT NULL UNIQUE, "createdAt" timestamp NOT NULL DEFAULT now(), "coderUsername" varchar(120), role users_role_enum NOT NULL DEFAULT \'Member\')');
    await q.query('CREATE TABLE templates (id varchar(100) PRIMARY KEY, name varchar(160) NOT NULL, version varchar(30) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamp NOT NULL DEFAULT now())');
    await q.query('CREATE TABLE configuration_groups (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), key varchar(100) NOT NULL UNIQUE, name varchar(160) NOT NULL, description text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now())');
    await q.query("CREATE TABLE configuration_items (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), key varchar(160) NOT NULL UNIQUE, \"displayName\" varchar(160) NOT NULL, description text, \"valueType\" configuration_items_valuetype_enum NOT NULL, value text NOT NULL, minimum integer, maximum integer, \"isSensitive\" boolean NOT NULL DEFAULT false, \"isMutable\" boolean NOT NULL DEFAULT true, \"createdAt\" timestamp NOT NULL DEFAULT now(), \"updatedAt\" timestamp NOT NULL DEFAULT now(), \"groupId\" uuid NOT NULL REFERENCES configuration_groups(id) ON DELETE CASCADE, CONSTRAINT configuration_key_format CHECK (key ~ '^[a-z][a-z0-9_.-]*$'))");
    await q.query('CREATE UNIQUE INDEX configuration_items_group_key ON configuration_items ("groupId", key)');
    await q.query("CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar(100) NOT NULL, description text, status projects_status_enum NOT NULL DEFAULT 'Creating', \"workspaceId\" varchar(120) NOT NULL, \"workspaceUrl\" varchar(250), \"frontendPreviewUrl\" varchar(250) NOT NULL, \"apiPreviewUrl\" varchar(250) NOT NULL, \"sourceRepository\" varchar(120), \"currentCommit\" varchar(120), \"lastKnownError\" varchar(500), \"idempotencyKey\" varchar(120), \"createdAt\" timestamp NOT NULL DEFAULT now(), \"updatedAt\" timestamp NOT NULL DEFAULT now(), \"lastOpenedAt\" timestamp, \"lastActivityAt\" timestamp, \"provisioningStartedAt\" timestamp, \"provisionedAt\" timestamp, \"stoppedAt\" timestamp, \"statusChangedAt\" timestamp, \"deletedAt\" timestamp, \"ownerId\" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, \"templateId\" varchar(100) NOT NULL REFERENCES templates(id))");
    await q.query('CREATE UNIQUE INDEX projects_owner_name_live ON projects ("ownerId", name) WHERE "deletedAt" IS NULL');
    await q.query('CREATE UNIQUE INDEX projects_owner_idempotency ON projects ("ownerId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL');
    await q.query('CREATE INDEX projects_owner_status ON projects ("ownerId", status)');
    await q.query("CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), \"actorType\" varchar(20) NOT NULL, \"actorRole\" audit_logs_actorrole_enum, action varchar(120) NOT NULL, \"resourceType\" varchar(80) NOT NULL, \"resourceId\" varchar(120), outcome audit_logs_outcome_enum NOT NULL, \"requestId\" varchar(120), metadata jsonb NOT NULL DEFAULT '{}', \"createdAt\" timestamp NOT NULL DEFAULT now(), \"actorUserId\" uuid REFERENCES users(id) ON DELETE SET NULL, \"projectId\" uuid REFERENCES projects(id) ON DELETE SET NULL)");
    await q.query('CREATE INDEX audit_logs_resource ON audit_logs ("resourceType", "resourceId")');
    await q.query('CREATE INDEX audit_logs_request ON audit_logs ("requestId")');
    await q.query('CREATE INDEX audit_logs_created ON audit_logs ("createdAt")');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS audit_logs, projects, configuration_items, configuration_groups, templates, users CASCADE');
    await q.query('DROP TYPE IF EXISTS audit_logs_actortype_enum, audit_logs_outcome_enum, audit_logs_actorrole_enum, configuration_items_valuetype_enum, projects_status_enum, users_role_enum CASCADE');
  }
}
