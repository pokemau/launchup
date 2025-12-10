import { Migration } from '@mikro-orm/migrations';

export class Migration20251210150742 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "startup_assessments" add column "is_applicable" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "startup_assessments" drop column "is_applicable";`);
  }

}
