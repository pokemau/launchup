import { Migration } from '@mikro-orm/migrations';

export class Migration20251206073712 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_assessment_assessment_id_foreign";`);

    this.addSql(`alter table "assessments" drop constraint "assessments_pkey";`);

    this.addSql(`alter table "assessments" rename column "assessment_id" to "id";`);
    this.addSql(`alter table "assessments" add constraint "assessments_pkey" primary key ("id");`);

    this.addSql(`alter table "startup_responses" rename column "assessment_assessment_id" to "assessment_id";`);
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_assessment_id_foreign" foreign key ("assessment_id") references "assessments" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_assessment_id_foreign";`);

    this.addSql(`alter table "assessments" drop constraint "assessments_pkey";`);

    this.addSql(`alter table "assessments" rename column "id" to "assessment_id";`);
    this.addSql(`alter table "assessments" add constraint "assessments_pkey" primary key ("assessment_id");`);

    this.addSql(`alter table "startup_responses" rename column "assessment_id" to "assessment_assessment_id";`);
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_assessment_assessment_id_foreign" foreign key ("assessment_assessment_id") references "assessments" ("assessment_id") on update cascade on delete cascade;`);
  }

}
