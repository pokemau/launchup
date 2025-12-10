import { Migration } from '@mikro-orm/migrations';

export class Migration20251210115526 extends Migration {

  override async up(): Promise<void> {
    // 1. Add answer_type column to assessments table
    this.addSql(`alter table "assessments" add column "answer_type" smallint not null default 1;`);

    // 2. Remove status column from startup_assessments table
    this.addSql(`alter table "startup_assessments" drop column "status";`);

    // 3. Update startup_responses foreign key to point to assessments instead of assessment_fields
    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_assessment_field_id_foreign";`);
    
    this.addSql(`alter table "startup_responses" rename column "assessment_field_id" to "assessment_id";`);
    
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_assessment_id_foreign" foreign key ("assessment_id") references "assessments" ("id") on update cascade on delete cascade;`);

    // 4. Drop the assessment_fields table (cascade will handle dependent data)
    this.addSql(`drop table if exists "assessment_fields" cascade;`);
  }

  override async down(): Promise<void> {
    // 1. Recreate assessment_fields table
    this.addSql(`create table "assessment_fields" ("id" serial primary key, "assessment_id" int not null, "description" text not null, "answer_type" smallint not null, "order" int not null default 0);`);
    
    this.addSql(`alter table "assessment_fields" add constraint "assessment_fields_assessment_id_foreign" foreign key ("assessment_id") references "assessments" ("id") on update cascade on delete cascade;`);

    // 2. Update startup_responses to point back to assessment_fields
    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_assessment_id_foreign";`);
    
    this.addSql(`alter table "startup_responses" rename column "assessment_id" to "assessment_field_id";`);
    
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_assessment_field_id_foreign" foreign key ("assessment_field_id") references "assessment_fields" ("id") on update cascade on delete cascade;`);

    // 3. Add back status column to startup_assessments
    this.addSql(`alter table "startup_assessments" add column "status" smallint not null default 1;`);

    // 4. Remove answer_type from assessments
    this.addSql(`alter table "assessments" drop column "answer_type";`);
  }

}
