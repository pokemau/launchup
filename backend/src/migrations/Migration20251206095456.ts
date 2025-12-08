import { Migration } from '@mikro-orm/migrations';

export class Migration20251206095456 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "startup_assessments" drop column "assigned_at", drop column "completed_at";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "startup_assessments" add column "assigned_at" timestamptz not null, add column "completed_at" timestamptz null;`);
  }

}
