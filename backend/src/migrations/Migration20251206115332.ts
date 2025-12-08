import { Migration } from '@mikro-orm/migrations';

export class Migration20251206115332 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "assessment_fields" drop column "order";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "assessment_fields" add column "order" int not null default 0;`);
  }

}
