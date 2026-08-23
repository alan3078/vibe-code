import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeAuditActorType1727136000000 implements MigrationInterface {
  name = 'NormalizeAuditActorType1727136000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE audit_logs ALTER COLUMN "actorType" TYPE varchar(20) USING "actorType"::text');
    await queryRunner.query("UPDATE audit_logs SET \"actorType\" = 'User' WHERE \"actorType\" IN ('Member', 'Administrator')");
    await queryRunner.query('DROP TYPE IF EXISTS audit_logs_actortype_enum');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TYPE audit_logs_actortype_enum AS ENUM ('Member','Administrator','System')");
    await queryRunner.query("UPDATE audit_logs SET \"actorType\" = COALESCE(\"actorRole\"::text, 'Member') WHERE \"actorType\" = 'User'");
    await queryRunner.query('ALTER TABLE audit_logs ALTER COLUMN "actorType" TYPE audit_logs_actortype_enum USING "actorType"::audit_logs_actortype_enum');
  }
}
