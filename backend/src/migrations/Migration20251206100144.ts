import { Migration } from '@mikro-orm/migrations';

export class Migration20251206100144 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "startup_responses" drop column "submitted_at";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "startup_responses" add column "submitted_at" timestamptz not null;`);
  }

}
