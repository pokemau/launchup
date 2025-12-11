import { Migration } from '@mikro-orm/migrations';

export class Migration20251211132908 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "assessments" add column "description" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "assessments" drop column "description";`);
  }

}
